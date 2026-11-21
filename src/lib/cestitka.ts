// Čestitka kakvu vidi primatelj (RPC javna_cestitka u bazi) i primjeri za demo stranice.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TemaKey } from './teme';

export type JavnaCestitka = {
  tema: string;
  za: string;
  od: string;
  naslov: string;
  poruka: string;
  slika: string | null; // putanja u bucketu cestitke-slike
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

// Primjeri za /primjer/<tema> (rade bez baze; služe za pregled tema i za objave).
export const PRIMJERI: Record<TemaKey, Omit<JavnaCestitka, 'slika'> & { slika: string | null }> = {
  klasicna: {
    tema: 'klasicna',
    za: 'Za Anu',
    od: 'Marko',
    naslov: 'Sretan Božić',
    poruka: 'Draga Ana,\nželim ti mirne blagdane, puno topline i dobrih ljudi oko sebe.\nVidimo se za Novu godinu.',
    slika: '/primjeri/klasicna.jpg',
  },
  zimska: {
    tema: 'zimska',
    za: 'Za baku i djeda',
    od: 'Vaši Luka i Petra',
    naslov: 'Sretan Božić',
    poruka: 'Dragi baka i djede,\nhvala vam na svakoj nedjelji za vašim stolom.\nOvaj Božić mislimo na vas i jedva čekamo kolače.',
    slika: null,
  },
  moderna: {
    tema: 'moderna',
    za: 'Za tim',
    od: 'Ivana',
    naslov: 'Sretni blagdani',
    poruka: 'Hvala vam na ovoj godini i na strpljenju u prosincu.\nOdmorite se, a vidimo se u siječnju.',
    slika: null,
  },
};
