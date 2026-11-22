// Devet dizajna čestitke. Ključ stoji u bazi (check u migracijama 001 i 002) i ne smije se mijenjati;
// naziv i opis su samo za prikaz.
// Svaki dizajn ima: boje stranice i kuverte (CSS varijable), ukras ispod pečata i opis čestitke
// (ilustracija je u lib/ilustracije.ts, a ovdje su fontovi, boje i okvir u koji se slaže tekst).
// Čestitka se crta na canvas 1080 × 1350 (scripts/cestitka.ts): ista slika je u kuverti, na ekranu i u galeriji.
import type { FontFamily } from './fontovi';

export type TemaKey = 'klasicna' | 'zimska' | 'moderna' | 'imela' | 'andeo' | 'djed' | 'sob' | 'drvce' | 'vijenac';

export type Okvir = { x: number; y: number; w: number; h: number };

export type KartaOpis = {
  papir: string; // boja čestitke dok se slika ne nacrta
  naslovFont: string; // CSS font za canvas, bez veličine, npr. "400 'Great Vibes'"
  naslovPx: number; // najveća veličina naslova
  tekstFont: string;
  potpisFont: string;
  naslovBoja: string;
  tekstBoja: string;
  potpisBoja: string;
  okvir: Okvir; // prostor za tekst (i fotografiju)
  naslovOkvir?: Okvir; // kad naslov stoji odvojeno (vijenac)
  sjena?: string; // sjena teksta na tamnoj podlozi
};

export type Tema = {
  key: TemaKey;
  naziv: string;
  opis: string;
  fonts: FontFamily[];
  preload: FontFamily;
  pecat: string; // znak na voštanom pečatu
  bg: string; // boja pozadine (theme-color, prvo iscrtavanje)
  deco: 'bozikovina' | 'imela' | 'bor'; // grančica ispod pečata
  najvisePoruka: number; // najviše znakova poruke da slova ostanu čitljiva na mobitelu (uređivač mora poštovati)
  vars: Record<string, string>;
  karta: KartaOpis;
};

const GARAMOND = "400 'EB Garamond'";
const PISMA = {
  'great-vibes': "400 'Great Vibes'",
  pinyon: "400 'Pinyon Script'",
  parisienne: "400 'Parisienne'",
  berkshire: "400 'Berkshire Swash'",
  'playfair-italic': "italic 400 'Playfair Display'",
} as const;

type Boje = {
  bg: string;
  glow: string;
  svijetla?: boolean; // svijetla pozadina stranice (tamni tekst uputa i gumba)
  gumb: string;
  gumbTekst: string;
  back: string;
  front: string;
  flap: string;
  line: string;
  liner: string;
  stripe: string;
  seal: string;
  list: string;
  list2: string;
  bobica: string;
  papir: string;
};

function varijable(b: Boje): Record<string, string> {
  return {
    '--bg': b.bg,
    '--bg-glow': b.glow,
    '--surface': b.papir,
    '--text': '#2a211c',
    '--muted': '#7a6a58',
    '--accent': b.seal,
    '--accent-ink': b.svijetla ? '#3b3632' : '#faf6f0',
    '--border': 'rgba(0,0,0,.12)',
    '--focus': b.svijetla ? '#8b0000' : '#f3d77a',
    '--font-head': "'EB Garamond', 'Times New Roman', serif",
    '--font-body': "'Plus Jakarta Sans', system-ui, sans-serif",
    '--head-weight': '400',
    '--na-pozadini': b.svijetla ? '#3b3632' : '#faf6f0',
    '--na-pozadini-tiho': b.svijetla ? '#6b6560' : 'rgba(250,246,240,.72)',
    '--gumb-bg': b.gumb,
    '--gumb-tekst': b.gumbTekst,
    '--env-back': b.back,
    '--env-front': b.front,
    '--env-flap': b.flap,
    '--env-line': b.line,
    '--env-liner': b.liner,
    '--env-liner-stripe': b.stripe,
    '--env-seal': b.seal,
    '--env-seal-ink': '#fff',
    '--gr-list': b.list,
    '--gr-list2': b.list2,
    '--gr-bobica': b.bobica,
  };
}

const ZLATO = 'rgba(212, 175, 55, 0.65)';

export const TEME: Tema[] = [
  {
    key: 'klasicna',
    naziv: 'Klasična',
    opis: 'Girlanda od bora s crvenom mašnom i kuglicama, božikovina u kutovima. Crvena kuverta sa zlatnim pečatom.',
    fonts: ['great-vibes', 'garamond', 'jakarta'],
    preload: 'great-vibes',
    pecat: '★',
    bg: '#143627',
    najvisePoruka: 320,
    deco: 'bozikovina',
    vars: varijable({
      bg: '#143627', glow: '#1b4332', gumb: '#d4af37', gumbTekst: '#143627',
      back: '#8b0000', front: '#a61c1c', flap: '#b42424', line: ZLATO, liner: '#1b4332', stripe: '#d4af37', seal: '#d4af37',
      list: '#1b4332', list2: '#3a8560', bobica: '#d4af37', papir: '#faf6f0',
    }),
    karta: {
      papir: '#faf6f0', naslovFont: PISMA['great-vibes'], naslovPx: 150, tekstFont: GARAMOND, potpisFont: PISMA['great-vibes'],
      naslovBoja: '#a61c1c', tekstBoja: '#2a211c', potpisBoja: '#8a6420',
      okvir: { x: 160, y: 420, w: 760, h: 700 },
    },
  },
  {
    key: 'zimska',
    naziv: 'Zimska noć',
    opis: 'Noćno nebo s mjesecom, snježni brežuljci, kućica, drvca i snjegović. Bijela kuverta sa srebrnim pečatom.',
    fonts: ['parisienne', 'garamond', 'jakarta'],
    preload: 'parisienne',
    pecat: '❄',
    bg: '#14213d',
    najvisePoruka: 260,
    deco: 'bozikovina',
    vars: varijable({
      bg: '#14213d', glow: '#23365e', gumb: '#e6eefa', gumbTekst: '#14213d',
      back: '#c9d3e1', front: '#f3f6fa', flap: '#fbfcfe', line: 'rgba(120, 145, 185, 0.5)', liner: '#2b4677', stripe: '#d7e2f2', seal: '#a9b8cc',
      list: '#3f5677', list2: '#6f8fb8', bobica: '#23406f', papir: '#1a2f58',
    }),
    karta: {
      papir: '#1a2f58', naslovFont: PISMA.parisienne, naslovPx: 132, tekstFont: GARAMOND, potpisFont: PISMA.parisienne,
      naslovBoja: '#fbf6e6', tekstBoja: '#eef3fb', potpisBoja: '#f3d77a', sjena: 'rgba(5, 12, 30, 0.6)',
      okvir: { x: 130, y: 250, w: 820, h: 540 },
    },
  },
  {
    key: 'moderna',
    naziv: 'Moderna',
    opis: 'Bijela čestitka s kuglicama koje vise s vrha i zlatnim iskrama. Bijela kuverta s crvenom podstavom.',
    fonts: ['playfair-italic', 'garamond', 'jakarta'],
    preload: 'playfair-italic',
    pecat: '✦',
    bg: '#f6f3ee',
    najvisePoruka: 320,
    deco: 'bozikovina',
    vars: varijable({
      bg: '#f6f3ee', glow: '#ffffff', svijetla: true, gumb: '#b3262e', gumbTekst: '#ffffff',
      back: '#8f1d24', front: '#ffffff', flap: '#ffffff', line: 'rgba(179, 38, 46, 0.35)', liner: '#b3262e', stripe: '#c9434a', seal: '#b3262e',
      list: '#1f5a3f', list2: '#3c8a63', bobica: '#b3262e', papir: '#ffffff',
    }),
    karta: {
      papir: '#ffffff', naslovFont: PISMA['playfair-italic'], naslovPx: 104, tekstFont: GARAMOND, potpisFont: PISMA['playfair-italic'],
      naslovBoja: '#b3262e', tekstBoja: '#2b2724', potpisBoja: '#8a6420',
      okvir: { x: 150, y: 610, w: 780, h: 560 },
    },
  },
  {
    key: 'imela',
    naziv: 'Imela',
    opis: 'Svežanj imele s bijelim bobicama i crvenom mašnom visi s vrha čestitke. Svijetlozelena kuverta s crvenim pečatom.',
    fonts: ['pinyon', 'garamond', 'jakarta'],
    preload: 'pinyon',
    pecat: '✦',
    bg: '#1b4332',
    najvisePoruka: 240,
    deco: 'imela',
    vars: varijable({
      bg: '#1b4332', glow: '#2a5a45', gumb: '#d4af37', gumbTekst: '#143627',
      back: '#aebb97', front: '#e3e8d6', flap: '#edf1e2', line: 'rgba(31, 90, 63, 0.45)', liner: '#1f5a3f', stripe: '#d4af37', seal: '#a61c1c',
      list: '#6f9160', list2: '#9db88a', bobica: '#f7f4ea', papir: '#f4f1e6',
    }),
    karta: {
      papir: '#f4f1e6', naslovFont: PISMA.pinyon, naslovPx: 138, tekstFont: GARAMOND, potpisFont: PISMA.pinyon,
      naslovBoja: '#1f5a3f', tekstBoja: '#2a2a22', potpisBoja: '#a61c1c',
      okvir: { x: 160, y: 670, w: 760, h: 500 },
    },
  },
  {
    key: 'andeo',
    naziv: 'Anđeo',
    opis: 'Anđeo sa zlatnom zvijezdom s lijeve strane, poruka s desne. Krem kuverta sa zlatnim pečatom.',
    fonts: ['great-vibes', 'garamond', 'jakarta'],
    preload: 'great-vibes',
    pecat: '★',
    bg: '#26324a',
    najvisePoruka: 200,
    deco: 'bor',
    vars: varijable({
      bg: '#26324a', glow: '#3a4a6b', gumb: '#d4af37', gumbTekst: '#1c2536',
      back: '#cdbf9f', front: '#f3ecd9', flap: '#f9f3e3', line: ZLATO, liner: '#26324a', stripe: '#d4af37', seal: '#d4af37',
      list: '#1b4332', list2: '#3a8560', bobica: '#a61c1c', papir: '#f3f1ea',
    }),
    karta: {
      papir: '#f3f1ea', naslovFont: PISMA['great-vibes'], naslovPx: 124, tekstFont: GARAMOND, potpisFont: PISMA['great-vibes'],
      naslovBoja: '#96741a', tekstBoja: '#33302a', potpisBoja: '#96741a',
      okvir: { x: 530, y: 280, w: 470, h: 820 },
    },
  },
  {
    key: 'djed',
    naziv: 'Djed Božićnjak',
    opis: 'Djed Božićnjak viri s dna čestitke, uz darove i pahulje. Krem kuverta s crvenim pečatom na crvenoj pozadini.',
    fonts: ['berkshire', 'garamond', 'jakarta'],
    preload: 'berkshire',
    pecat: '★',
    bg: '#7a0c0c',
    najvisePoruka: 180,
    deco: 'bor',
    vars: varijable({
      bg: '#7a0c0c', glow: '#a61c1c', gumb: '#faf6f0', gumbTekst: '#7a0c0c',
      back: '#d9cfbb', front: '#faf6f0', flap: '#ffffff', line: 'rgba(166, 28, 28, 0.4)', liner: '#a61c1c', stripe: '#faf6f0', seal: '#a61c1c',
      list: '#1b4332', list2: '#3a8560', bobica: '#d4af37', papir: '#f8f3e9',
    }),
    karta: {
      papir: '#f8f3e9', naslovFont: PISMA.berkshire, naslovPx: 112, tekstFont: GARAMOND, potpisFont: PISMA.berkshire,
      naslovBoja: '#a61c1c', tekstBoja: '#2a211c', potpisBoja: '#1f5a3f',
      okvir: { x: 150, y: 120, w: 780, h: 470 },
    },
  },
  {
    key: 'sob',
    naziv: 'Sob',
    opis: 'Sob s crvenim nosom, šalom i lampicama na rogovima s desne strane, poruka s lijeve. Smeđa kuverta od natron papira.',
    fonts: ['berkshire', 'garamond', 'jakarta'],
    preload: 'berkshire',
    pecat: '❄',
    bg: '#3f2c1b',
    najvisePoruka: 180,
    deco: 'bor',
    vars: varijable({
      bg: '#3f2c1b', glow: '#5f4429', gumb: '#faf6f0', gumbTekst: '#3f2c1b',
      back: '#9c7b4a', front: '#c9a877', flap: '#d3b486', line: 'rgba(90, 60, 30, 0.45)', liner: '#a61c1c', stripe: '#faf6f0', seal: '#a61c1c',
      list: '#1b4332', list2: '#3a8560', bobica: '#faf6f0', papir: '#eadfc8',
    }),
    karta: {
      papir: '#eadfc8', naslovFont: PISMA.berkshire, naslovPx: 104, tekstFont: GARAMOND, potpisFont: PISMA.berkshire,
      naslovBoja: '#8b0000', tekstBoja: '#33261a', potpisBoja: '#1f5a3f',
      okvir: { x: 90, y: 390, w: 450, h: 760 },
    },
  },
  {
    key: 'drvce',
    naziv: 'Božićno drvce',
    opis: 'Okićeno drvce s darovima na tamnozelenoj čestitki, poruka zlatnim slovima s desne strane. Zelena kuverta sa zlatnim pečatom.',
    fonts: ['pinyon', 'garamond', 'jakarta'],
    preload: 'pinyon',
    pecat: '★',
    bg: '#0a1712',
    najvisePoruka: 220,
    deco: 'bozikovina',
    vars: varijable({
      bg: '#0a1712', glow: '#143627', gumb: '#d4af37', gumbTekst: '#0a1712',
      back: '#0a1c14', front: '#143627', flap: '#1b4332', line: ZLATO, liner: '#8b0000', stripe: '#d4af37', seal: '#d4af37',
      list: '#2a6a4d', list2: '#4a9a70', bobica: '#c22a2a', papir: '#143627',
    }),
    karta: {
      papir: '#143627', naslovFont: PISMA.pinyon, naslovPx: 120, tekstFont: GARAMOND, potpisFont: PISMA.pinyon,
      naslovBoja: '#f3d77a', tekstBoja: '#faf6f0', potpisBoja: '#f3d77a', sjena: 'rgba(0, 0, 0, 0.45)',
      okvir: { x: 550, y: 170, w: 450, h: 960 },
    },
  },
  {
    key: 'vijenac',
    naziv: 'Vijenac',
    opis: 'Vijenac od bora sa šišarkama, bobicama i mašnom: naslov je u vijencu, poruka ispod. Bordo kuverta sa zlatnim pečatom.',
    fonts: ['parisienne', 'garamond', 'jakarta'],
    preload: 'parisienne',
    pecat: '✦',
    bg: '#efe7d6',
    najvisePoruka: 200,
    deco: 'bor',
    vars: varijable({
      bg: '#efe7d6', glow: '#fbf7ee', svijetla: true, gumb: '#8b0000', gumbTekst: '#faf6f0',
      back: '#3d0606', front: '#5e0b0b', flap: '#6c1010', line: ZLATO, liner: '#1b4332', stripe: '#d4af37', seal: '#d4af37',
      list: '#1b4332', list2: '#3a8560', bobica: '#d4af37', papir: '#faf6f0',
    }),
    karta: {
      papir: '#faf6f0', naslovFont: PISMA.parisienne, naslovPx: 96, tekstFont: GARAMOND, potpisFont: PISMA.parisienne,
      naslovBoja: '#8b0000', tekstBoja: '#2a211c', potpisBoja: '#1f5a3f',
      naslovOkvir: { x: 400, y: 280, w: 280, h: 200 },
      okvir: { x: 150, y: 910, w: 780, h: 350 },
    },
  },
];

// Najdulja poruka koju baza prima (check u 003_duljina_poruke.sql); pojedini dizajn može tražiti kraću.
export const NAJVISE_PORUKA = Math.max(...TEME.map((t) => t.najvisePoruka));

export function tema(key: string | null | undefined): Tema {
  return TEME.find((t) => t.key === key) ?? TEME[0];
}
