-- 010: dp-nadzor, ekran Čestitka: pregled jednog dana (klik na stupac grafa, kao kod Kuverte) i graf koji prati
-- razdoblje (7, 30 ili 90 dana). Pokreće se ručno u Supabase SQL Editoru projekta bozicna-cestitka, nakon 009.
-- Smije se pokrenuti više puta. Stara inačica s dva parametra se briše, da poziv ne bude dvoznačan.

drop function if exists public.nadzor_cestitka(text, integer);

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
        'otvorene', (select count(*) from public.cestitke c where c.prvo_otvaranje is not null and (c.prvo_otvaranje at time zone 'Europe/Zagreb')::date between v_od and v_do)
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
            select izvor, broj p, 0 k, 0 e from posjete where dan between v_od and v_do
            union all
            select izvor, 0, 1, iznos_centi from kupnje where dan between v_od and v_do
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
               'kupnje', (select count(*) from kupnje k where k.dan = g.dan::date)) order by g.dan), '[]'::jsonb)
        from generate_series(v_danas - (v_graf - 1), v_danas, interval '1 day') g(dan)
      )
    )
  );
end $$;
revoke all on function public.nadzor_cestitka(text, integer, date) from public, authenticated;
grant execute on function public.nadzor_cestitka(text, integer, date) to anon;

notify pgrst, 'reload schema';
