-- Poruka najviše 320 znakova (22. 11. 2026.): dulji tekst na čestitki ispadne presitan za čitanje na mobitelu.
-- Pojedini dizajni traže još kraću poruku (najvisePoruka u src/lib/teme.ts), to provjerava uređivač.
-- "not valid": pravilo vrijedi za nove i izmijenjene čestitke, a postojeće dulje poruke ostaju kakve jesu.
-- Smije se pokrenuti više puta.
alter table public.cestitke drop constraint if exists cestitke_poruka_check;
alter table public.cestitke
  add constraint cestitke_poruka_check check (char_length(poruka) <= 320) not valid;
