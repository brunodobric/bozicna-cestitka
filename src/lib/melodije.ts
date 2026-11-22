// Melodije koje pošiljatelj može odabrati; svira kad primatelj otvori kuvertu.
// Ključ stoji u bazi (check u migraciji 004) i ne smije se mijenjati.
// Sve su snimke javno dobro (provjereno na Wikimedia Commonsu 22. 11. 2026.): skladbe su starije od
// 100 godina, a snimke i aranžmane radili su glazbeni sastavi američke vojske (djela savezne vlade SAD-a
// nemaju autorska prava). Iznimka je Orašar: snimka iz 1945. slobodna je u EU, ali ne i u SAD-u.
// Datoteke su isječci od oko 50 sekundi s utišavanjem na kraju (public/glazba/<ključ>.mp3).

export type MelodijaKey =
  | 'jingle-bells'
  | 'tiha-noc'
  | 'we-wish'
  | 'away-manger'
  | 'o-tannenbaum'
  | 'up-housetop'
  | 'joy-jazz'
  | 'hark-jazz'
  | 'orasar';

export type Melodija = {
  key: MelodijaKey;
  naziv: string; // kako piše u uređivaču
  opis: string; // ugođaj, jednom rečenicom
  izvodi: string;
  izvor: string; // stranica snimke na Wikimedia Commonsu
};

const commons = (datoteka: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(datoteka.replace(/ /g, '_'))}`;
const MID = 'Starlifter and Roots in Blue, United States Air Force Band of Mid-America';
const NOTE = 'Airmen of Note, United States Air Force Band';

export const MELODIJE: Melodija[] = [
  {
    key: 'jingle-bells',
    naziv: 'Jingle Bells',
    opis: 'Vesela i poznata, za svakoga.',
    izvodi: MID,
    izvor: commons('Jingle Bells (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3'),
  },
  {
    key: 'tiha-noc',
    naziv: 'Tiha noć',
    opis: 'Mirna, za obitelj i starije.',
    izvodi: MID,
    izvor: commons('Silent Night (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3'),
  },
  {
    key: 'we-wish',
    naziv: 'We Wish You a Merry Christmas',
    opis: 'Razigrana, za prijatelje i djecu.',
    izvodi: MID,
    izvor: commons('We Wish You a Merry Christmas (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3'),
  },
  {
    key: 'away-manger',
    naziv: 'Away in a Manger',
    opis: 'Nježna uspavanka.',
    izvodi: MID,
    izvor: commons('Away in a Manger (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3'),
  },
  {
    key: 'o-tannenbaum',
    naziv: 'O Tannenbaum',
    opis: 'Big band, s puno puhača.',
    izvodi: NOTE,
    izvor: commons('O Christmas Tree - Airmen of Note - United States Air Force Band.mp3'),
  },
  {
    key: 'up-housetop',
    naziv: 'Up on the Housetop',
    opis: 'Big band, živahna.',
    izvodi: NOTE,
    izvor: commons('USAFB Up On The Housetop.ogg'),
  },
  {
    key: 'joy-jazz',
    naziv: 'Joy to the World (jazz)',
    opis: 'Svečana pjesma u swingu.',
    izvodi: NOTE,
    izvor: commons('December Makes Me Feel This Way - Airmen of Note - United States Air Force Band.mp3'),
  },
  {
    key: 'hark-jazz',
    naziv: 'Hark! The Herald Angels Sing (jazz)',
    opis: 'Big band, za poslovne čestitke.',
    izvodi: NOTE,
    izvor: commons('Hark, the Herald Angels Sing - Airmen of Note - United States Air Force Band.mp3'),
  },
  {
    key: 'orasar',
    naziv: 'Ruski ples iz Orašara',
    opis: 'Čajkovski, brzo i razigrano, stara snimka.',
    izvodi: 'National Symphony Orchestra of London, dirigent Stanford Robinson (Decca, 1945.)',
    izvor: commons(
      'PDP-CH - National Symphony Orchestra of London - Stanford Robinson, conductor - The Nutcracker Suite, Op. 71 - Dance of the Sugar Plum Fairy - Russian Dance - Tchaikovsky - Decca-k1142-ar9057.flac',
    ),
  },
];

export function melodija(key: string | null | undefined): Melodija | null {
  return MELODIJE.find((m) => m.key === key) ?? null;
}

export const datotekaMelodije = (key: MelodijaKey) => `/glazba/${key}.mp3`;
