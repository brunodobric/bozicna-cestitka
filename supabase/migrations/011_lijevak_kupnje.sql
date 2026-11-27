-- 011: lijevak kupnje za dp-nadzor (ekran Čestitka): posjeta, otvoren uređivač, spremljena čestitka,
-- otvoreno plaćanje i kupnja, po danu i po izvoru. Pokreće se ručno u Supabase SQL Editoru projekta
-- bozicna-cestitka, nakon 009 i 010. Smije se pokrenuti više puta.
--
-- - Uređivač: middleware za svako otvaranje /napravi (nova čestitka, bez ?id) poveća dnevni brojač po izvoru
--   (statistika.koraci, RPC zabiljezi_korak). Bez kolačića; ponovno učitavanje stranice broji se ponovno.
-- - Spremljena čestitka: red u cestitke (created_at, izvor), kao i dosad.
-- - Plaćanje: stranica /napravi/placanje/[id] pri prvom otvaranju upiše cestitke.placanje_otvoreno
--   (RPC oznaci_placanje, samo vlasnik), pa se svaka čestitka broji jednom.

create table if not exists statistika.koraci (
  dan date not null default (now() at time zone 'Europe/Zagreb')::date,
  korak text not null check (korak in ('uredivac')),
  izvor text not null,
  broj integer not null default 0,
  primary key (dan, korak, izvor)
);
alter table statistika.koraci enable row level security;
revoke all on statistika.koraci from public, anon, authenticated;

create or replace function public.zabiljezi_korak(p_korak text, p_izvor text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_korak text := lower(trim(coalesce(p_korak, '')));
  v_izvor text := coalesce(nullif(left(lower(trim(coalesce(p_izvor, ''))), 40), ''), 'nepoznato');
begin
  if v_korak not in ('uredivac') then
    return;
  end if;
  insert into statistika.koraci (korak, izvor, broj) values (v_korak, v_izvor, 1)
  on conflict (dan, korak, izvor) do update set broj = statistika.koraci.broj + 1;
end;
$$;
revoke all on function public.zabiljezi_korak(text, text) from public;
grant execute on function public.zabiljezi_korak(text, text) to anon, authenticated;

alter table public.cestitke add column if not exists placanje_otvoreno timestamptz;

create or replace function public.oznaci_placanje(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform set_config('cestitka.sustav', 'on', true);
  update public.cestitke set placanje_otvoreno = now()
   where id = p_id and owner_id = auth.uid() and placanje_otvoreno is null and not placeno;
  perform set_config('cestitka.sustav', 'off', true);
end;
$$;
revoke all on function public.oznaci_placanje(uuid) from public, anon;
grant execute on function public.oznaci_placanje(uuid) to authenticated;

-- p_dana: razdoblje u danima (7, 30, 90), null ili 0 = sve. Kupnja je plaćena uplata (bez testnih i bez
-- čestitki otključanih iz paketa, one su u "iz_paketa"); paket od 5 ili 10 je jedna kupnja s 5 ili 10 komada.
create or replace function public.nadzor_cestitka(p_kljuc text, p_dana integer default 30, p_dan date default null)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare
  v_danas date := (now() at time zone 'Europe/Zagreb')::date;
  v_od date := case when p_dan is not null then p_dan
                    when coalesce(p_dana, 0) > 0 then (now() at time zone 'Europe/Zagreb')::date - (p_dana - 1) else '-infinity'::date end;
  v_do date := coalesce(p_dan, 'infinity'::date);
  -- Graf po danu prati razdoblje (7, 30 ili 90 dana; "sve" crta zadnjih 90), i kad je odabran jedan dan.
  v_graf integer := case when coalesce(p_dana, 0) between 1 and 90 then p_dana else 90 end;
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
    ),
    uredivac as (
      select dan, izvor, broj from statistika.koraci where korak = 'uredivac'
    ),
    spremljene as (
      select (c.created_at at time zone 'Europe/Zagreb')::date dan,
             coalesce(nullif(split_part(c.izvor, '|', 1), ''), 'nepoznato') izvor
      from public.cestitke c
    ),
    placanja as (
      select (c.placanje_otvoreno at time zone 'Europe/Zagreb')::date dan,
             coalesce(nullif(split_part(c.izvor, '|', 1), ''), 'nepoznato') izvor
      from public.cestitke c where c.placanje_otvoreno is not null
    )
    select jsonb_build_object(
      'od', case when v_od = '-infinity'::date then null else v_od end,
      'dan', p_dan,
      'razdoblje', jsonb_build_object(
        'posjete', (select coalesce(sum(broj), 0) from posjete where dan between v_od and v_do),
        'kupnje', (select count(*) from kupnje where dan between v_od and v_do),
        'komada', (select coalesce(sum(komada), 0) from kupnje where dan between v_od and v_do),
        'prihod', (select round(coalesce(sum(iznos_centi), 0) / 100.0, 2) from kupnje where dan between v_od and v_do),
        'iz_paketa', (select count(*) from public.uplate u where u.stripe_session_id like 'paket:%' and (u.created_at at time zone 'Europe/Zagreb')::date between v_od and v_do),
        'napravljene', (select count(*) from public.cestitke c where (c.created_at at time zone 'Europe/Zagreb')::date between v_od and v_do),
        'otvorene', (select count(*) from public.cestitke c where c.prvo_otvaranje is not null and (c.prvo_otvaranje at time zone 'Europe/Zagreb')::date between v_od and v_do),
        'uredivac', (select coalesce(sum(broj), 0) from uredivac where dan between v_od and v_do),
        'spremljene', (select count(*) from spremljene where dan between v_od and v_do),
        'placanje', (select count(*) from placanja where dan between v_od and v_do)
      ),
      'ukupno', jsonb_build_object(
        'posjete', (select coalesce(sum(broj), 0) from posjete),
        'kupnje', (select count(*) from kupnje),
        'komada', (select coalesce(sum(komada), 0) from kupnje),
        'prihod', (select round(coalesce(sum(iznos_centi), 0) / 100.0, 2) from kupnje),
        'danas_posjete', (select coalesce(sum(broj), 0) from posjete where dan = v_danas),
        'danas_kupnje', (select count(*) from kupnje where dan = v_danas)
      ),
      -- Po izvoru: lijevak (posjete, uređivač, spremljene, plaćanje, kupnje) i prihod u razdoblju.
      'po_izvoru', (
        select coalesce(jsonb_agg(jsonb_build_object('izvor', izvor, 'posjete', posjete, 'uredivac', uredivac,
               'spremljene', spremljene, 'placanje', placanje, 'kupnje', kupnje, 'prihod', prihod)
               order by prihod desc, posjete desc), '[]'::jsonb)
        from (
          select izvor, sum(p)::int posjete, sum(u)::int uredivac, sum(s)::int spremljene, sum(pl)::int placanje,
                 sum(k)::int kupnje, round(sum(e) / 100.0, 2) prihod
          from (
            select izvor, broj p, 0 u, 0 s, 0 pl, 0 k, 0 e from posjete where dan between v_od and v_do
            union all
            select izvor, 0, broj, 0, 0, 0, 0 from uredivac where dan between v_od and v_do
            union all
            select izvor, 0, 0, 1, 0, 0, 0 from spremljene where dan between v_od and v_do
            union all
            select izvor, 0, 0, 0, 1, 0, 0 from placanja where dan between v_od and v_do
            union all
            select izvor, 0, 0, 0, 0, 1, iznos_centi from kupnje where dan between v_od and v_do
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
            select izvor, medij, kampanja, oglas, broj p, 0 k, 0 e from posjete where dan between v_od and v_do
            union all
            select izvor, medij, kampanja, oglas, 0, 1, iznos_centi from kupnje where dan between v_od and v_do
          ) x
          where medij <> '' or kampanja <> '' or oglas <> ''
          group by izvor, medij, kampanja, oglas
          order by 7 desc, 5 desc
          limit 100
        ) s
      ),
      -- Po danu za graf (cijelo razdoblje i kad je odabran jedan dan).
      'po_danu', (
        select coalesce(jsonb_agg(jsonb_build_object('dan', g.dan::date,
               'posjete', (select coalesce(sum(broj), 0) from posjete p where p.dan = g.dan::date),
               'uredivac', (select coalesce(sum(broj), 0) from uredivac u where u.dan = g.dan::date),
               'spremljene', (select count(*) from spremljene s where s.dan = g.dan::date),
               'placanje', (select count(*) from placanja pl where pl.dan = g.dan::date),
               'kupnje', (select count(*) from kupnje k where k.dan = g.dan::date)) order by g.dan), '[]'::jsonb)
        from generate_series(v_danas - (v_graf - 1), v_danas, interval '1 day') g(dan)
      )
    )
  );
end $$;
revoke all on function public.nadzor_cestitka(text, integer, date) from public, authenticated;
grant execute on function public.nadzor_cestitka(text, integer, date) to anon;

notify pgrst, 'reload schema';
