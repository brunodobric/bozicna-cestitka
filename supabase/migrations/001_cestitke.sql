-- Shema za Božićne čestitke (iz predloška u paketu iz Kuverte, s dopunama: guard čuva i brisanje_nakon,
-- tokeni se pri dodavanju uvijek generiraju u bazi, a istekla čestitka se primatelju više ne prikazuje).
-- Slijedi pravila iz Kuverte: RLS na svim tablicama, gost (primatelj) sve dobiva kroz SECURITY DEFINER funkcije,
-- uplatu upisuje samo funkcija s tajnom (kao potvrdi_uplatu u Kuverti, migracija 021), nikad service_role ključ.
-- Kupac se prijavljuje anonimno (Supabase → Authentication → Sign In / Providers → Allow anonymous sign-ins),
-- pa auth.uid() radi i bez registracije. Uključi i CAPTCHA (Turnstile) da se anonimni računi ne mogu masovno otvarati.

create extension if not exists pgcrypto with schema extensions;

-- Tajne koje zna samo baza i Worker (isto kao u Kuverti).
create table if not exists public.private_settings (
  key text primary key,
  value text not null
);
alter table public.private_settings enable row level security;
revoke all on public.private_settings from anon, authenticated;
--   insert into public.private_settings (key, value) values ('placanje_secret', '<dugi-nasumični-niz>')
--   on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------- čestitke
create table if not exists public.cestitke (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- javni link za primatelja: /c/<token> (nasumičan, bez imena, da se ne može pogoditi)
  token text not null unique default translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', '-_'),
  -- tajni link za uređivanje s drugog uređaja (šalje se kupcu mailom nakon uplate)
  uredi_token text not null unique default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_'),
  tema text not null default 'klasicna' check (tema in ('klasicna', 'zimska', 'moderna')),
  za text not null default '' check (char_length(za) <= 60),          -- "za Anu" (na kartici u kuverti)
  od text not null default '' check (char_length(od) <= 60),          -- potpis
  naslov text not null default 'Sretan Božić' check (char_length(naslov) <= 60),
  poruka text not null default '' check (char_length(poruka) <= 600),
  slika text check (slika is null or slika ~ '^[0-9a-f-]{36}/[0-9a-f]{32}\.(jpg|png|webp)$'),
  email_kupca text not null default '',
  placeno boolean not null default false,       -- primatelj vidi čestitku tek kad je true (kao "allowed" u Kuverti)
  prvo_otvaranje timestamptz,                   -- kupac može vidjeti je li primatelj otvorio
  brisanje_nakon date                           -- npr. 15. 1. sljedeće godine; čisti se cronom
);
create index if not exists cestitke_owner on public.cestitke (owner_id);

alter table public.cestitke enable row level security;
revoke all on public.cestitke from anon, authenticated;
grant select, insert, update, delete on public.cestitke to authenticated;

drop policy if exists "vlasnik cita" on public.cestitke;
create policy "vlasnik cita" on public.cestitke for select to authenticated using (owner_id = auth.uid());
drop policy if exists "vlasnik dodaje" on public.cestitke;
create policy "vlasnik dodaje" on public.cestitke for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "vlasnik mijenja" on public.cestitke;
create policy "vlasnik mijenja" on public.cestitke for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "vlasnik brise neplacenu" on public.cestitke;
create policy "vlasnik brise neplacenu" on public.cestitke for delete to authenticated using (owner_id = auth.uid() and not placeno);

-- Kupac ne smije sam uključiti "placeno" ni mijenjati tokene (isti obrazac kao *_guard u Kuverti).
create or replace function public.cestitka_guard()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  -- Funkcije baze (uplata, prvo otvaranje) uključe ovu oznaku za svoj update, pa guard ne vrati njihove promjene
  -- iako je kupac prijavljen (npr. stranica nakon plaćanja zove potvrdu s kupčevom sesijom).
  if current_setting('cestitka.sustav', true) is not distinct from 'on' then
    new.updated_at := now();
    return new;
  end if;
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.placeno := false;
      new.prvo_otvaranje := null;
      new.brisanje_nakon := null;
      -- tokene uvijek radi baza, kupac ih ne može sam izabrati
      new.token := translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', '-_');
      new.uredi_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_');
    else
      new.placeno := old.placeno;
      new.token := old.token;
      new.uredi_token := old.uredi_token;
      -- vlasnik se mijenja samo kroz preuzmi_cestitku (link za uređivanje iz maila)
      if current_setting('cestitka.preuzimanje', true) is distinct from 'on' then
        new.owner_id := old.owner_id;
      end if;
      new.prvo_otvaranje := old.prvo_otvaranje;
      new.brisanje_nakon := old.brisanje_nakon;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists cestitka_guard on public.cestitke;
create trigger cestitka_guard before insert or update on public.cestitke
  for each row execute function public.cestitka_guard();

-- ---------------------------------------------------------------- uplate
create table if not exists public.uplate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid references auth.users(id) on delete set null,
  cestitka_id uuid references public.cestitke(id) on delete set null,
  stripe_session_id text not null unique,
  iznos_centi integer not null check (iznos_centi >= 0),
  valuta text not null default 'eur',
  email text not null default '',
  testni boolean not null default false
);
alter table public.uplate enable row level security;
revoke all on public.uplate from anon, authenticated;
grant select on public.uplate to authenticated;
drop policy if exists "vlasnik cita uplate" on public.uplate;
create policy "vlasnik cita uplate" on public.uplate for select to authenticated using (owner_id = auth.uid());

-- Worker je poziva nakon Stripea (webhook i povratak s naplate). Smije se pozvati više puta.
create or replace function public.potvrdi_uplatu_cestitke(
  p_secret text, p_session_id text, p_cestitka uuid, p_iznos_centi integer, p_valuta text, p_email text, p_testni boolean
) returns void language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_owner uuid;
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  select owner_id into v_owner from public.cestitke where id = p_cestitka;
  if not found then raise exception 'nepoznata_cestitka'; end if;

  insert into public.uplate (owner_id, cestitka_id, stripe_session_id, iznos_centi, valuta, email, testni)
  values (v_owner, p_cestitka, p_session_id, p_iznos_centi, lower(coalesce(p_valuta, 'eur')), coalesce(p_email, ''), coalesce(p_testni, false))
  on conflict (stripe_session_id) do nothing;

  perform set_config('cestitka.sustav', 'on', true);
  -- TODO (odluka o trajanju, odjeljak 9 plana): ovdje postaviti i brisanje_nakon.
  update public.cestitke
     set placeno = true,
         email_kupca = case when email_kupca = '' then coalesce(p_email, '') else email_kupca end
   where id = p_cestitka and not placeno;
  perform set_config('cestitka.sustav', 'off', true);
end;
$$;
revoke all on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean) from public;
grant execute on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- javni prikaz (primatelj)
-- Vraća samo plaćenu čestitku po točnom tokenu i bilježi prvo otvaranje. Popis čestitki nije dostupan.
create or replace function public.javna_cestitka(p_token text)
returns table (tema text, za text, od text, naslov text, poruka text, slika text)
language plpgsql volatile security definer set search_path = public as $$
begin
  -- Kupac koji otvara vlastiti link ne broji se kao primatelj.
  perform set_config('cestitka.sustav', 'on', true);
  update public.cestitke set prvo_otvaranje = now()
   where token = p_token and placeno and prvo_otvaranje is null
     and (brisanje_nakon is null or brisanje_nakon >= (now() at time zone 'Europe/Zagreb')::date)
     and owner_id is distinct from auth.uid();
  perform set_config('cestitka.sustav', 'off', true);
  return query
    select c.tema, c.za, c.od, c.naslov, c.poruka, c.slika
      from public.cestitke c
     where c.token = p_token and c.placeno
       and (c.brisanje_nakon is null or c.brisanje_nakon >= (now() at time zone 'Europe/Zagreb')::date);
end;
$$;
revoke all on function public.javna_cestitka(text) from public;
grant execute on function public.javna_cestitka(text) to anon, authenticated;
-- Napomena: robote za pregled poveznica (WhatsApp, Facebook) ne treba brojati kao otvaranje;
-- Worker neka za njih ne zove ovu funkciju (isti ROBOT regex kao u Kuvertinom middlewareu).

-- ---------------------------------------------------------------- slike (Storage)
-- Javni bucket kao "invitation-images" u Kuverti: put je <id čestitke>/<32 hex>.<ext>, pa se ne može pogoditi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cestitke-slike', 'cestitke-slike', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "vlasnik ucitava sliku cestitke" on storage.objects;
create policy "vlasnik ucitava sliku cestitke" on storage.objects for insert to authenticated with check (
  bucket_id = 'cestitke-slike'
  and exists (select 1 from public.cestitke c where c.id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid())
);
drop policy if exists "vlasnik cita sliku cestitke" on storage.objects;
create policy "vlasnik cita sliku cestitke" on storage.objects for select to authenticated using (
  bucket_id = 'cestitke-slike'
  and exists (select 1 from public.cestitke c where c.id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid())
);
drop policy if exists "vlasnik brise sliku cestitke" on storage.objects;
create policy "vlasnik brise sliku cestitke" on storage.objects for delete to authenticated using (
  bucket_id = 'cestitke-slike'
  and exists (select 1 from public.cestitke c where c.id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid())
);

-- ---------------------------------------------------------------- uređivanje s drugog uređaja
-- Kupac otvori /uredi/<uredi_token> (link iz maila): Worker pozove ovu funkciju i, ako token valja,
-- prebaci čestitku na trenutni (anonimni ili pravi) račun. Stari uređaj tako gubi pristup.
create or replace function public.preuzmi_cestitku(p_uredi_token text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'prijava'; end if;
  perform set_config('cestitka.preuzimanje', 'on', true);
  update public.cestitke set owner_id = auth.uid() where uredi_token = p_uredi_token returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.preuzmi_cestitku(text) from public;
grant execute on function public.preuzmi_cestitku(text) to authenticated;

notify pgrst, 'reload schema';
