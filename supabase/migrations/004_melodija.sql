-- Melodija koju pošiljatelj odabere (22. 11. 2026.): svira kad primatelj otvori kuvertu.
-- Ključevi su iz src/lib/melodije.ts i ne smiju se mijenjati; null znači čestitku bez glazbe.
-- Smije se pokrenuti više puta.
alter table public.cestitke add column if not exists melodija text;
alter table public.cestitke drop constraint if exists cestitke_melodija_check;
alter table public.cestitke
  add constraint cestitke_melodija_check check (melodija is null or melodija in (
    'jingle-bells', 'tiha-noc', 'we-wish', 'away-manger',
    'o-tannenbaum', 'up-housetop', 'joy-jazz', 'hark-jazz', 'orasar'
  ));

-- Primatelj dobiva i melodiju. Mijenja se popis stupaca koje funkcija vraća, pa je treba ponovno stvoriti.
drop function if exists public.javna_cestitka(text);
create function public.javna_cestitka(p_token text)
returns table (tema text, za text, od text, naslov text, poruka text, slika text, melodija text)
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
    select c.tema, c.za, c.od, c.naslov, c.poruka, c.slika, c.melodija
      from public.cestitke c
     where c.token = p_token and c.placeno
       and (c.brisanje_nakon is null or c.brisanje_nakon >= (now() at time zone 'Europe/Zagreb')::date);
end;
$$;
revoke all on function public.javna_cestitka(text) from public;
grant execute on function public.javna_cestitka(text) to anon, authenticated;
