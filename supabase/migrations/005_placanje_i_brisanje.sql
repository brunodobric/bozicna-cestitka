-- Plaćanje (Stripe, jedna čestitka ili paket od 5 ili 10) i brisanje nakon 30 dana.
-- Pokreće se ručno u Supabase SQL Editoru, nakon 001 do 004. Smije se pokrenuti više puta.

-- ---------------------------------------------------------------- tajna za Worker
-- Ako tajna još ne postoji, baza je sama stvori. Zadnji upit ispod je ispisuje: tu vrijednost treba
-- upisati u Cloudflare kao PLACANJE_SECRET.
insert into public.private_settings (key, value)
values ('placanje_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- ---------------------------------------------------------------- paketi
-- Ponude: 1 čestitka, paket od 5 i paket od 10 (src/lib/cijena.ts). Kod paketa se odmah otključa čestitka
-- s koje je kupac platio, a ostale ostaju kao "preostalo" na njegovom (anonimnom) računu.
alter table public.uplate add column if not exists komada integer not null default 1 check (komada in (1, 5, 10));

create table if not exists public.paketi (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  preostalo integer not null default 0 check (preostalo >= 0),
  updated_at timestamptz not null default now()
);
alter table public.paketi enable row level security;
revoke all on public.paketi from anon, authenticated;
grant select on public.paketi to authenticated;
drop policy if exists "vlasnik cita paket" on public.paketi;
create policy "vlasnik cita paket" on public.paketi for select to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------- potvrda uplate
-- Kao u 001, uz rok i pakete: čestitka vrijedi 30 dana od uplate (zadnji dan je dan uplate + 30),
-- a uplata paketa doda komada - 1 preostalih čestitki. Ponovljeni poziv za istu sesiju ništa ne dodaje.
drop function if exists public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean);
create or replace function public.potvrdi_uplatu_cestitke(
  p_secret text, p_session_id text, p_cestitka uuid, p_iznos_centi integer, p_valuta text, p_email text, p_testni boolean,
  p_komada integer default 1
) returns void language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_owner uuid; v_nova uuid;
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  if p_komada is null or p_komada not in (1, 5, 10) then raise exception 'krivi_paket'; end if;
  select owner_id into v_owner from public.cestitke where id = p_cestitka;
  if not found then raise exception 'nepoznata_cestitka'; end if;

  insert into public.uplate (owner_id, cestitka_id, stripe_session_id, iznos_centi, valuta, email, testni, komada)
  values (v_owner, p_cestitka, p_session_id, p_iznos_centi, lower(coalesce(p_valuta, 'eur')), coalesce(p_email, ''), coalesce(p_testni, false), p_komada)
  on conflict (stripe_session_id) do nothing
  returning id into v_nova;

  if v_nova is not null and p_komada > 1 and v_owner is not null then
    insert into public.paketi (owner_id, preostalo) values (v_owner, p_komada - 1)
    on conflict (owner_id) do update set preostalo = paketi.preostalo + excluded.preostalo, updated_at = now();
  end if;

  perform set_config('cestitka.sustav', 'on', true);
  update public.cestitke
     set placeno = true,
         brisanje_nakon = (now() at time zone 'Europe/Zagreb')::date + 30,
         email_kupca = case when email_kupca = '' then coalesce(p_email, '') else email_kupca end
   where id = p_cestitka and not placeno;
  perform set_config('cestitka.sustav', 'off', true);
end;
$$;
revoke all on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean, integer) from public;
grant execute on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean, integer) to anon, authenticated;

-- Kupac otključa svoju čestitku jednom od preostalih iz paketa. Vraća true ako je otključana.
create or replace function public.iskoristi_paket(p_cestitka uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'prijava'; end if;
  if not exists (select 1 from public.cestitke where id = p_cestitka and owner_id = v_uid and not placeno) then
    return false;
  end if;
  update public.paketi set preostalo = preostalo - 1, updated_at = now()
   where owner_id = v_uid and preostalo > 0;
  if not found then return false; end if;

  insert into public.uplate (owner_id, cestitka_id, stripe_session_id, iznos_centi, valuta, komada)
  values (v_uid, p_cestitka, 'paket:' || p_cestitka::text, 0, 'eur', 1)
  on conflict (stripe_session_id) do nothing;

  perform set_config('cestitka.sustav', 'on', true);
  update public.cestitke
     set placeno = true, brisanje_nakon = (now() at time zone 'Europe/Zagreb')::date + 30
   where id = p_cestitka;
  perform set_config('cestitka.sustav', 'off', true);
  return true;
end;
$$;
revoke all on function public.iskoristi_paket(uuid) from public;
grant execute on function public.iskoristi_paket(uuid) to authenticated;

-- ---------------------------------------------------------------- tajni link za uređivanje
-- Kao u 001, uz paket: s čestitkom na novi uređaj prelaze i preostale čestitke iz paketa starog računa.
-- Poziva ga /uredi/<uredi_token> nakon što kupac potvrdi gumbom (roboti za pregled poveznica ne preuzimaju).
create or replace function public.preuzmi_cestitku(p_uredi_token text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_stari uuid; v_n integer;
begin
  if auth.uid() is null then raise exception 'prijava'; end if;
  select id, owner_id into v_id, v_stari from public.cestitke where uredi_token = p_uredi_token;
  if v_id is null then return null; end if;
  if v_stari is distinct from auth.uid() then
    perform set_config('cestitka.preuzimanje', 'on', true);
    update public.cestitke set owner_id = auth.uid() where id = v_id;
    perform set_config('cestitka.preuzimanje', 'off', true);
    delete from public.paketi where owner_id = v_stari returning preostalo into v_n;
    if coalesce(v_n, 0) > 0 then
      insert into public.paketi (owner_id, preostalo) values (auth.uid(), v_n)
      on conflict (owner_id) do update set preostalo = paketi.preostalo + excluded.preostalo, updated_at = now();
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.preuzmi_cestitku(text) from public;
grant execute on function public.preuzmi_cestitku(text) to authenticated;

-- ---------------------------------------------------------------- brisanje
-- Je li fotografija ostala bez čestitke (čestitka obrisana). Takvu smije obrisati bilo tko:
-- nitko je više ne koristi, a put se ne može pogoditi. Security definer jer anon ne vidi tablicu cestitke.
create or replace function public.slika_bez_cestitke(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return not exists (select 1 from public.cestitke c where c.id::text = (storage.foldername(p_name))[1]);
end;
$$;
revoke all on function public.slika_bez_cestitke(text) from public;
grant execute on function public.slika_bez_cestitke(text) to anon, authenticated;

-- Storage za brisanje traži dopuštenje za čitanje i za brisanje.
drop policy if exists "cita sliku bez cestitke" on storage.objects;
create policy "cita sliku bez cestitke" on storage.objects for select to anon, authenticated using (
  bucket_id = 'cestitke-slike' and public.slika_bez_cestitke(name)
);
drop policy if exists "brise sliku bez cestitke" on storage.objects;
create policy "brise sliku bez cestitke" on storage.objects for delete to anon, authenticated using (
  bucket_id = 'cestitke-slike' and public.slika_bez_cestitke(name)
);

-- Worker je zove jednom dnevno (cron). Briše:
--   * plaćene čestitke kojima je prošao rok (brisanje_nakon),
--   * neplaćene čestitke koje nitko nije dirao 30 dana.
-- Vraća putove fotografija koje su time ostale bez čestitke; Worker ih briše iz Storagea.
create or replace function public.ocisti_istekle(p_secret text)
returns table (putanja text) language plpgsql volatile security definer set search_path = public, storage as $$
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  delete from public.cestitke
   where (placeno and brisanje_nakon < (now() at time zone 'Europe/Zagreb')::date)
      or (not placeno and updated_at < now() - interval '30 days');
  return query
    select o.name::text from storage.objects o
     where o.bucket_id = 'cestitke-slike' and public.slika_bez_cestitke(o.name)
     limit 1000;
end;
$$;
revoke all on function public.ocisti_istekle(text) from public;
grant execute on function public.ocisti_istekle(text) to anon;

notify pgrst, 'reload schema';

-- Tajna za Cloudflare (PLACANJE_SECRET):
select value as placanje_secret from public.private_settings where key = 'placanje_secret';
