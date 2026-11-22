// Pravila uređivača čestitke (/napravi). Ista pravila provjerava i server (napravi/spremi.ts) i baza
// (check u migracijama 001 do 004), a ovdje su na jednom mjestu za obrazac i za server.
import { TEME, tema as temaInfo, type TemaKey } from './teme';
import { melodija as nadjiMelodiju, type MelodijaKey } from './melodije';

export const NAJVISE = { za: 60, od: 60, naslov: 60 } as const;
export const NASLOVI = ['Sretan Božić', 'Čestit Božić', 'Sretni blagdani', 'Sretan Božić i nova godina'];

export type Unos = {
  tema: TemaKey;
  za: string;
  naslov: string;
  poruka: string;
  od: string;
  melodija: MelodijaKey | null;
};

export const PRAZNO: Unos = { tema: 'klasicna', za: '', naslov: 'Sretan Božić', poruka: '', od: '', melodija: 'jingle-bells' };

// Jedan red bez suvišnih razmaka; poruka zadržava prelaske u novi red (najviše jedan prazan red zaredom).
const red = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const poruka = (v: unknown) =>
  String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Duljina kao u bazi (char_length broji znakove, ne bajtove; emoji je jedan znak).
export const duljina = (s: string) => [...s].length;

export function provjeri(f: FormData): { unos: Unos } | { greska: string } {
  const t = String(f.get('tema') ?? '');
  if (!TEME.some((x) => x.key === t)) return { greska: 'Odaberite dizajn čestitke.' };
  const info = temaInfo(t);
  const m = String(f.get('melodija') ?? '');
  const mel = m === 'bez' || m === '' ? null : nadjiMelodiju(m)?.key ?? undefined;
  if (mel === undefined) return { greska: 'Odaberite melodiju ili čestitku bez glazbe.' };
  const unos: Unos = {
    tema: info.key,
    za: red(f.get('za')),
    naslov: red(f.get('naslov')) || 'Sretan Božić',
    poruka: poruka(f.get('poruka')),
    od: red(f.get('od')),
    melodija: mel,
  };
  if (duljina(unos.za) > NAJVISE.za) return { greska: `Tekst na kuverti može imati najviše ${NAJVISE.za} znakova.` };
  if (duljina(unos.naslov) > NAJVISE.naslov) return { greska: `Naslov može imati najviše ${NAJVISE.naslov} znakova.` };
  if (duljina(unos.od) > NAJVISE.od) return { greska: `Potpis može imati najviše ${NAJVISE.od} znakova.` };
  if (!unos.poruka) return { greska: 'Napišite poruku.' };
  if (duljina(unos.poruka) > info.najvisePoruka)
    return { greska: `Za dizajn „${info.naziv}” poruka može imati najviše ${info.najvisePoruka} znakova.` };
  return { unos };
}
