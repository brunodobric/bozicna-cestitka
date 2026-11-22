-- Zaključavanje plaćene čestitke (Bruno, 22. 11. 2026.), da se ista čestitka ne prepravlja za nove primatelje:
--   * nakon plaćanja ime primatelja (tekst na kuverti, stupac za) više se ne mijenja,
--   * kad primatelj prvi put otvori čestitku (prvo_otvaranje), ne mijenja se ništa od sadržaja.
-- Do prvog otvaranja kupac i dalje smije ispraviti poruku, naslov, potpis, dizajn, melodiju i fotografiju.
-- Pokreće se ručno u Supabase SQL Editoru, nakon 005. Smije se pokrenuti više puta.

create or replace function public.cestitka_zakljucavanje()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Funkcije baze (uplata, prvo otvaranje, preuzimanje) i upiti bez prijave ne mijenjaju sadržaj.
  if current_setting('cestitka.sustav', true) is not distinct from 'on' or auth.uid() is null then
    return new;
  end if;
  if old.prvo_otvaranje is not null and (
       new.tema is distinct from old.tema or new.za is distinct from old.za or new.od is distinct from old.od
    or new.naslov is distinct from old.naslov or new.poruka is distinct from old.poruka
    or new.slika is distinct from old.slika or new.melodija is distinct from old.melodija) then
    raise exception 'cestitka_otvorena' using errcode = 'P0001', hint = 'Primatelj je već otvorio čestitku.';
  end if;
  if old.placeno and new.za is distinct from old.za then
    raise exception 'ime_zakljucano' using errcode = 'P0001', hint = 'Ime na kuverti ne mijenja se nakon plaćanja.';
  end if;
  return new;
end;
$$;
-- Ime okidača je abecedno iza cestitka_guard, pa radi nakon njega.
drop trigger if exists cestitka_zakljucavanje on public.cestitke;
create trigger cestitka_zakljucavanje before update on public.cestitke
  for each row execute function public.cestitka_zakljucavanje();

-- Fotografija otvorene čestitke: vlasnik je više ne može ni zamijeniti ni obrisati.
drop policy if exists "vlasnik ucitava sliku cestitke" on storage.objects;
create policy "vlasnik ucitava sliku cestitke" on storage.objects for insert to authenticated with check (
  bucket_id = 'cestitke-slike'
  and exists (select 1 from public.cestitke c
               where c.id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid() and c.prvo_otvaranje is null)
);
drop policy if exists "vlasnik brise sliku cestitke" on storage.objects;
create policy "vlasnik brise sliku cestitke" on storage.objects for delete to authenticated using (
  bucket_id = 'cestitke-slike'
  and exists (select 1 from public.cestitke c
               where c.id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid() and c.prvo_otvaranje is null)
);

notify pgrst, 'reload schema';
