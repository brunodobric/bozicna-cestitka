-- 009: posjete po izvoru (Instagram, Facebook, oglasi...) i brojevi za nadzornu ploču Digitalnog partnera (dp-nadzor).
-- Pokreće se ručno u Supabase SQL Editoru projekta bozicna-cestitka, nakon 001 do 008. Smije se pokrenuti više puta.
--
-- 1) Posjete: Worker za svaki ulazak na stranicu (src/lib/izvor.ts) poveća dnevni brojač po izvoru, mediju,
--    kampanji i oglasu (utm_source, utm_medium, utm_campaign, utm_content). Bez kolačića i bez osobnih podataka.
-- 2) Izvor kupnje: uređivač pošalje izvor s kojim je kupac došao, spremi.ts ga upiše u cestitke.izvor,
--    a okidač ga pri uplati prepiše u uplate.izvor (uplata ostaje i kad se čestitka nakon roka obriše).
-- 3) nadzor_cestitka: zbirni brojevi za dp-nadzor (repozitorij digitalni-partner-web, mapa nadzor).
--    Traži tajni ključ dashboarda; u bazi je samo njegov SHA-256 sažetak (tablica nadzor.kljuc, vidi kraj datoteke).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- posjete
create schema if not exists statistika;
revoke all on schema statistika from public, anon, authenticated;

create table if not exists statistika.posjete (
  dan date not null default (now() at time zone 'Europe/Zagreb')::date,
  izvor text not null,
  medij text not null default '',
  kampanja text not null default '',
  oglas text not null default '',
  broj integer not null default 0,
  primary key (dan, izvor, medij, kampanja, oglas)
);
alter table statistika.posjete enable row level security;
revoke all on statistika.posjete from public, anon, authenticated;

-- Worker (anonimni ključ) poziva ovu funkciju. Duljine su ograničene i vrijednosti svedene na mala slova,
-- da netko tko je zove ručno ne može napuniti tablicu dugim nizovima.
create or replace function public.zabiljezi_posjet(p_izvor text, p_medij text, p_kampanja text, p_oglas text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_izvor text := left(lower(trim(coalesce(p_izvor, ''))), 40);
  v_medij text := left(lower(trim(coalesce(p_medij, ''))), 40);
  v_kampanja text := left(lower(trim(coalesce(p_kampanja, ''))), 60);
  v_oglas text := left(lower(trim(coalesce(p_oglas, ''))), 80);
begin
  if v_izvor = '' then
    return;
  end if;
  insert into statistika.posjete (izvor, medij, kampanja, oglas, broj)
  values (v_izvor, v_medij, v_kampanja, v_oglas, 1)
  on conflict (dan, izvor, medij, kampanja, oglas) do update set broj = statistika.posjete.broj + 1;
end;
$$;
revoke all on function public.zabiljezi_posjet(text, text, text, text) from public;
grant execute on function public.zabiljezi_posjet(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- izvor kupnje
-- Zapis "izvor|medij|kampanja|oglas" (src/lib/izvor.ts, izvorUOznaku).
alter table public.cestitke add column if not exists izvor text not null default '';
alter table public.cestitke drop constraint if exists cestitke_izvor_duljina;
alter table public.cestitke add constraint cestitke_izvor_duljina check (char_length(izvor) <= 230);
alter table public.uplate add column if not exists izvor text not null default '';

create or replace function public.uplata_izvor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.izvor, '') = '' and new.cestitka_id is not null then
    new.izvor := coalesce((select c.izvor from public.cestitke c where c.id = new.cestitka_id), '');
  end if;
  new.izvor := coalesce(new.izvor, '');
  return new;
end;
$$;
revoke all on function public.uplata_izvor() from public, anon, authenticated;
drop trigger if exists uplata_izvor on public.uplate;
create trigger uplata_izvor before insert on public.uplate
  for each row execute function public.uplata_izvor();

-- ---------------------------------------------------------------- nadzor
create schema if not exists nadzor;
revoke all on schema nadzor from public, anon, authenticated;

create table if not exists nadzor.kljuc (
  id smallint primary key default 1 check (id = 1),
  sazetak text not null
);
alter table nadzor.kljuc enable row level security; -- bez pravila: čitaju je samo funkcije nadzor_*

-- p_dana: razdoblje u danima (7, 30, 90), null ili 0 = sve. Kupnja je plaćena uplata (bez testnih i bez
-- čestitki otključanih iz paketa, one su u "iz_paketa"); paket od 5 ili 10 je jedna kupnja s 5 ili 10 komada.
create or replace function public.nadzor_cestitka(p_kljuc text, p_dana integer default 30)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare
  v_danas date := (now() at time zone 'Europe/Zagreb')::date;
  v_od date := case when coalesce(p_dana, 0) > 0 then (now() at time zone 'Europe/Zagreb')::date - (p_dana - 1) else '-infinity'::date end;
begin
  if p_kljuc is null or not exists (
    select 1 from nadzor.kljuc where sazetak = encode(extensions.digest(p_kljuc, 'sha256'), 'hex')
  ) then
    raise exception 'neispravan ključ' using errcode = '42501';
  end if;

  return (
    with kupnje as (
      select (u.created_at at time zone 'Europe/Zagreb')::date dan, u.iznos_centi, u.komada,
             coalesce(nullif(split_part(u.izvor, '|', 1), ''), 'nepoznato') izvor,
             split_part(u.izvor, '|', 2) medij, split_part(u.izvor, '|', 3) kampanja, split_part(u.izvor, '|', 4) oglas
      from public.uplate u
      where not u.testni and u.iznos_centi > 0
    ),
    posjete as (
      select * from statistika.posjete
    )
    select jsonb_build_object(
      'od', case when v_od = '-infinity'::date then null else v_od end,
      'razdoblje', jsonb_build_object(
        'posjete', (select coalesce(sum(broj), 0) from posjete where dan >= v_od),
        'kupnje', (select count(*) from kupnje where dan >= v_od),
        'komada', (select coalesce(sum(komada), 0) from kupnje where dan >= v_od),
        'prihod', (select round(coalesce(sum(iznos_centi), 0) / 100.0, 2) from kupnje where dan >= v_od),
        'iz_paketa', (select count(*) from public.uplate u where u.stripe_session_id like 'paket:%' and (u.created_at at time zone 'Europe/Zagreb')::date >= v_od),
        'napravljene', (select count(*) from public.cestitke c where (c.created_at at time zone 'Europe/Zagreb')::date >= v_od),
        'otvorene', (select count(*) from public.cestitke c where c.prvo_otvaranje is not null and (c.prvo_otvaranje at time zone 'Europe/Zagreb')::date >= v_od)
      ),
      'ukupno', jsonb_build_object(
        'posjete', (select coalesce(sum(broj), 0) from posjete),
        'kupnje', (select count(*) from kupnje),
        'komada', (select coalesce(sum(komada), 0) from kupnje),
        'prihod', (select round(coalesce(sum(iznos_centi), 0) / 100.0, 2) from kupnje),
        'danas_posjete', (select coalesce(sum(broj), 0) from posjete where dan = v_danas),
        'danas_kupnje', (select count(*) from kupnje where dan = v_danas)
      ),
      -- Po izvoru: posjete, kupnje i prihod u razdoblju.
      'po_izvoru', (
        select coalesce(jsonb_agg(jsonb_build_object('izvor', izvor, 'posjete', posjete, 'kupnje', kupnje, 'prihod', prihod)
               order by prihod desc, posjete desc), '[]'::jsonb)
        from (
          select izvor, sum(p)::int posjete, sum(k)::int kupnje, round(sum(e) / 100.0, 2) prihod
          from (
            select izvor, broj p, 0 k, 0 e from posjete where dan >= v_od
            union all
            select izvor, 0, 1, iznos_centi from kupnje where dan >= v_od
          ) x group by izvor
        ) s
      ),
      -- Po oznaci poveznice (medij, kampanja, oglas), samo retci koji imaju neku oznaku.
      'po_oznaci', (
        select coalesce(jsonb_agg(jsonb_build_object('izvor', izvor, 'medij', medij, 'kampanja', kampanja, 'oglas', oglas,
               'posjete', posjete, 'kupnje', kupnje, 'prihod', prihod) order by prihod desc, posjete desc), '[]'::jsonb)
        from (
          select izvor, medij, kampanja, oglas, sum(p)::int posjete, sum(k)::int kupnje, round(sum(e) / 100.0, 2) prihod
          from (
            select izvor, medij, kampanja, oglas, broj p, 0 k, 0 e from posjete where dan >= v_od
            union all
            select izvor, medij, kampanja, oglas, 0, 1, iznos_centi from kupnje where dan >= v_od
          ) x
          where medij <> '' or kampanja <> '' or oglas <> ''
          group by izvor, medij, kampanja, oglas
          order by 7 desc, 5 desc
          limit 100
        ) s
      ),
      -- Zadnjih 30 dana, za graf.
      'po_danu', (
        select coalesce(jsonb_agg(jsonb_build_object('dan', g.dan::date,
               'posjete', (select coalesce(sum(broj), 0) from posjete p where p.dan = g.dan::date),
               'kupnje', (select count(*) from kupnje k where k.dan = g.dan::date)) order by g.dan), '[]'::jsonb)
        from generate_series(v_danas - 29, v_danas, interval '1 day') g(dan)
      )
    )
  );
end $$;
revoke all on function public.nadzor_cestitka(text, integer) from public, authenticated;
grant execute on function public.nadzor_cestitka(text, integer) to anon;

-- Ključ dashboarda: isti sažetak kao u bazi Kuverte (MyWeddingInvite, select sazetak from nadzor.kljuc).
-- Pokreće se jednom, s pravim sažetkom umjesto <SAZETAK>:
--   insert into nadzor.kljuc (id, sazetak) values (1, '<SAZETAK>') on conflict (id) do update set sazetak = excluded.sazetak;

notify pgrst, 'reload schema';
