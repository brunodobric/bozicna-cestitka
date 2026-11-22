-- Rok čestitke 3 mjeseca umjesto 30 dana (Bruno, 22. 11. 2026.). Pokreće se ručno u Supabase SQL Editoru,
-- nakon 001 do 007. Smije se pokrenuti više puta.
--
-- Plaćena čestitka vrijedi do istog datuma tri mjeseca nakon plaćanja (npr. 22. 11. → 22. 2.), a neplaćena se briše
-- kad je tri mjeseca nitko ne mijenja.

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
         brisanje_nakon = ((now() at time zone 'Europe/Zagreb')::date + interval '3 months')::date,
         email_kupca = case when email_kupca = '' then coalesce(p_email, '') else email_kupca end
   where id = p_cestitka and not placeno;
  perform set_config('cestitka.sustav', 'off', true);
end;
$$;
revoke all on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean, integer) from public;
grant execute on function public.potvrdi_uplatu_cestitke(text, text, uuid, integer, text, text, boolean, integer) to anon, authenticated;

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
     set placeno = true, brisanje_nakon = ((now() at time zone 'Europe/Zagreb')::date + interval '3 months')::date
   where id = p_cestitka;
  perform set_config('cestitka.sustav', 'off', true);
  return true;
end;
$$;
revoke all on function public.iskoristi_paket(uuid) from public;
grant execute on function public.iskoristi_paket(uuid) to authenticated;

create or replace function public.ocisti_istekle(p_secret text)
returns table (putanja text) language plpgsql volatile security definer set search_path = public, storage as $$
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  delete from public.cestitke
   where (placeno and brisanje_nakon < (now() at time zone 'Europe/Zagreb')::date)
      or (not placeno and updated_at < now() - interval '3 months');
  return query
    select o.name::text from storage.objects o
     where o.bucket_id = 'cestitke-slike' and public.slika_bez_cestitke(o.name)
     limit 1000;
end;
$$;
revoke all on function public.ocisti_istekle(text) from public;
grant execute on function public.ocisti_istekle(text) to anon;

-- Već plaćene čestitke dobiju isti rok kao nove: tri mjeseca od dana prve uplate (iz tablice uplate).
do $$
begin
  perform set_config('cestitka.sustav', 'on', true);
  update public.cestitke c
     set brisanje_nakon = ((u.prva at time zone 'Europe/Zagreb')::date + interval '3 months')::date
    from (select cestitka_id, min(created_at) as prva from public.uplate where cestitka_id is not null group by cestitka_id) u
   where u.cestitka_id = c.id and c.placeno;
  perform set_config('cestitka.sustav', 'off', true);
end $$;

notify pgrst, 'reload schema';
