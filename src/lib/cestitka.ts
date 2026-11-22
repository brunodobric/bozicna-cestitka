// Čestitka kakvu vidi primatelj (RPC javna_cestitka u bazi) i primjeri za demo stranice.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TemaKey } from './teme';
import type { MelodijaKey } from './melodije';

export type JavnaCestitka = {
  tema: string;
  za: string;
  od: string;
  naslov: string;
  poruka: string;
  slika: string | null; // putanja u bucketu cestitke-slike
  melodija?: string | null; // ključ iz lib/melodije.ts; null = bez glazbe (prije migracije 004 polja nema)
};

export const BUCKET = 'cestitke-slike';

// Token iz baze: base64url od 12 nasumičnih bajtova (16 znakova). Sve drugo odbijamo bez upita u bazu.
export function ispravanToken(t: string | undefined): t is string {
  return typeof t === 'string' && /^[A-Za-z0-9_-]{16}$/.test(t);
}

export function javniUrlSlike(supabaseUrl: string, putanja: string | null): string | null {
  if (!putanja || !/^[0-9a-f-]{36}\/[0-9a-f]{32}\.(jpg|png|webp)$/.test(putanja)) return null;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${putanja}`;
}

export async function dohvatiJavnu(supabase: SupabaseClient, token: string): Promise<JavnaCestitka | null> {
  const { data, error } = await supabase.rpc('javna_cestitka', { p_token: token });
  if (error) {
    console.error('javna_cestitka', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? (row as JavnaCestitka) : null;
}

// Primjeri za /primjer/<tema> (rade bez baze; služe za pregled dizajna i za objave).
const primjer = (tema: TemaKey, za: string, od: string, naslov: string, poruka: string, melodija: MelodijaKey): JavnaCestitka => ({
  tema,
  za,
  od,
  naslov,
  poruka,
  slika: null,
  melodija,
});

export const PRIMJERI: Record<TemaKey, JavnaCestitka> = {
  klasicna: primjer('klasicna', 'Za Anu', 'Marko', 'Sretan Božić', 'Draga Ana,\nželim ti mirne blagdane, puno topline i dobrih ljudi oko sebe.\nVidimo se za Novu godinu.', 'jingle-bells'),
  zimska: primjer('zimska', 'Za baku i djeda', 'Vaši Luka i Petra', 'Sretan Božić', 'Dragi baka i djede,\nhvala vam na svakoj nedjelji za vašim stolom.\nOvaj Božić mislimo na vas i jedva čekamo kolače.', 'tiha-noc'),
  moderna: primjer('moderna', 'Za tim', 'Ivana', 'Sretni blagdani', 'Hvala vam na ovoj godini i na strpljenju u prosincu.\nOdmorite se, a vidimo se u siječnju.', 'hark-jazz'),
  imela: primjer('imela', 'Za Maju', 'Tvoj Filip', 'Sretan Božić', 'Draga Majo,\nneka ti blagdani prođu uz ljude koje voliš.\nPrvi poljubac pod imelom čuvam za tebe.', 'away-manger'),
  andeo: primjer('andeo', 'Za kumu Mariju', 'Obitelj Horvat', 'Čestit Božić', 'Draga kumo,\nneka vam Božić donese mir i zdravlje, a nova godina puno lijepih dana.', 'joy-jazz'),
  djed: primjer('djed', 'Za Luku', 'Teta Sanja', 'Sretan Božić', 'Dragi Luka,\nDjed Božićnjak mi je rekao da si bio jako dobar ove godine.\nPogledaj pod bor.', 'up-housetop'),
  sob: primjer('sob', 'Za Petru', 'Tvoja ekipa', 'Sretan Božić', 'Draga Petra,\nželimo ti puno smijeha i kolača.\nVidimo se na dočeku.', 'we-wish'),
  drvce: primjer('drvce', 'Za mamu i tatu', 'Vaša Ivana', 'Sretan Božić', 'Dragi mama i tata,\nhvala vam na svakom Božiću kod kuće.\nDolazim na Badnjak.', 'o-tannenbaum'),
  vijenac: primjer('vijenac', 'Za susjede', 'Kovačevi', 'Sretan Božić', 'Dragi susjedi,\nželimo vam miran Božić i sretnu novu godinu.\nSvratite na kolače.', 'orasar'),
};
