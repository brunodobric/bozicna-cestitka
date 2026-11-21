// Božićne teme čestitke. Ključ (klasicna/zimska/moderna) stoji u bazi (check u 001_cestitke.sql)
// i ne smije se mijenjati; naziv i opis su samo za prikaz.
// Boje su CSS varijable na .inv (kuverta) i .karta (čestitka). Canvas za "Spremi kao sliku" čita iste
// varijable iz CSS-a, pa je slika uvijek jednaka onome što primatelj vidi.
import type { FontFamily } from './fontovi';

export type TemaKey = 'klasicna' | 'zimska' | 'moderna';

export type Tema = {
  key: TemaKey;
  naziv: string;
  opis: string;
  fonts: FontFamily[];
  preload: FontFamily;
  pecat: string; // znak na voštanom pečatu
  bg: string; // boja pozadine (theme-color, prvo iscrtavanje)
};

export const TEME: Tema[] = [
  {
    key: 'klasicna',
    naziv: 'Klasična',
    opis: 'Crvena kuverta sa zlatnim pečatom na tamnozelenoj pozadini.',
    fonts: ['garamond', 'garamond-italic', 'jakarta'],
    preload: 'garamond-italic',
    pecat: '★',
    bg: '#143627',
  },
  {
    key: 'zimska',
    naziv: 'Zimska noć',
    opis: 'Bijela kuverta sa srebrnim pečatom pod snijegom na noćnom plavom nebu.',
    fonts: ['garamond', 'garamond-italic', 'jakarta'],
    preload: 'garamond-italic',
    pecat: '❄',
    bg: '#14213d',
  },
  {
    key: 'moderna',
    naziv: 'Moderna',
    opis: 'Svijetla i čista: bijela pozadina, crveni detalji, ravna slova.',
    fonts: ['montserrat', 'jakarta'],
    preload: 'montserrat',
    pecat: '✦',
    bg: '#f6f3ee',
  },
];

export function tema(key: string | null | undefined): Tema {
  return TEME.find((t) => t.key === key) ?? TEME[0];
}
