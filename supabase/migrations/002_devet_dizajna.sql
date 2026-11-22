-- Devet dizajna čestitke (22. 11. 2026.): uz klasicna, zimska i moderna dolaze imela, andeo, djed, sob, drvce i vijenac.
-- Ključevi moraju odgovarati popisu u src/lib/teme.ts. Postojeće čestitke se ne mijenjaju.
-- Smije se pokrenuti više puta.
alter table public.cestitke drop constraint if exists cestitke_tema_check;
alter table public.cestitke
  add constraint cestitke_tema_check
  check (tema in ('klasicna', 'zimska', 'moderna', 'imela', 'andeo', 'djed', 'sob', 'drvce', 'vijenac'));
