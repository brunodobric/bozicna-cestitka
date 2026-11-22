// Ilustracije čestitki (SVG 1080 × 1350, bez teksta). Svaki dizajn slaže se iz istih dijelova:
// grane bora, božikovina, imela, kuglice, mašne, drvce, Djed Božićnjak, sob, anđeo, vijenac, zimska noć.
// Ista SVG slika crta se na canvas (scripts/cestitka.ts), pa je čestitka u kuverti, na ekranu i u galeriji jedna te ista.
// Sve je nacrtano kodom (nema vanjskih slika), a raspored je uvijek isti jer "slučajni" brojevi imaju zadano sjeme.
import type { TemaKey } from './teme';

export const SIRINA = 1080;
export const VISINA = 1350;

const n = (v: number) => +v.toFixed(1);

function slucaj(sjeme: number) {
  let s = sjeme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const g = (x: number, y: number, sadrzaj: string, o: { rot?: number; s?: number; sx?: number; sjena?: boolean; op?: number } = {}) =>
  `<g transform="translate(${n(x)} ${n(y)}) rotate(${o.rot ?? 0}) scale(${(o.sx ?? 1) * (o.s ?? 1)} ${o.s ?? 1})"${o.sjena ? ' filter="url(#sj)"' : ''}${
    o.op != null ? ` opacity="${o.op}"` : ''
  }>${sadrzaj}</g>`;

const DEFS = `
<linearGradient id="zlato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e7a8"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#96741a"/></linearGradient>
<linearGradient id="zlatoV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e7a8"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8f6d17"/></linearGradient>
<linearGradient id="crv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8423c"/><stop offset=".55" stop-color="#a61c1c"/><stop offset="1" stop-color="#6f0707"/></linearGradient>
<linearGradient id="crvT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b0000"/><stop offset="1" stop-color="#560404"/></linearGradient>
<linearGradient id="zel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a9a70"/><stop offset=".5" stop-color="#1f5a3f"/><stop offset="1" stop-color="#0f2e22"/></linearGradient>
<linearGradient id="zelT" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f7352"/><stop offset=".55" stop-color="#1b4332"/><stop offset="1" stop-color="#0c2419"/></linearGradient>
<linearGradient id="bij" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d6cc"/></linearGradient>
<linearGradient id="imelaL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b7cf9f"/><stop offset="1" stop-color="#5f8553"/></linearGradient>
<linearGradient id="smed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b98350"/><stop offset=".6" stop-color="#8a5a2e"/><stop offset="1" stop-color="#5e3a1a"/></linearGradient>
<linearGradient id="koza" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8d5b8"/><stop offset="1" stop-color="#e9b592"/></linearGradient>
<linearGradient id="halja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f1ede2"/><stop offset="1" stop-color="#cfd6de"/></linearGradient>
<radialGradient id="sfera" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".22" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<radialGradient id="sjaj" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".4" stop-color="#f5cf58" stop-opacity=".3"/><stop offset="1" stop-color="#f5cf58" stop-opacity="0"/></radialGradient>
<radialGradient id="vinjeta" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></radialGradient>
<radialGradient id="svjetlo" cx=".3" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="sj" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="9"/><feOffset dx="0" dy="10" result="o"/><feComponentTransfer><feFuncA type="linear" slope=".32"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="sjM" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="0" dy="4"/><feComponentTransfer><feFuncA type="linear" slope=".3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="zrno" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .05 0"/></filter>
<filter id="mek"><feGaussianBlur stdDeviation="14"/></filter>
`;

// ---------- papir i okviri ----------
function papir(boja: string, o: { vinjeta?: boolean } = {}) {
  return `<rect width="1080" height="1350" fill="${boja}"/><rect width="1080" height="1350" fill="url(#svjetlo)"/><rect width="1080" height="1350" filter="url(#zrno)"/>${
    o.vinjeta === false ? '' : '<rect width="1080" height="1350" fill="url(#vinjeta)"/>'
  }`;
}
function okvir(boja = 'url(#zlato)', tanki = 'rgba(212,175,55,.55)') {
  return `<rect x="34" y="34" width="1012" height="1282" fill="none" stroke="${boja}" stroke-width="5"/><rect x="52" y="52" width="976" height="1246" fill="none" stroke="${tanki}" stroke-width="2"/>`;
}

// ---------- sitni ukrasi ----------
function zvijezda(r: number, boja = 'url(#zlato)') {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${n(Math.cos(a) * rr)} ${n(Math.sin(a) * rr)}`;
  }
  return `<path d="${d}Z" fill="${boja}"/>`;
}
function iskra(r: number, boja = '#d4af37') {
  const k = r * 0.16;
  return `<path d="M0 ${-r} L${k} ${-k} L${r} 0 L${k} ${k} L0 ${r} L${-k} ${k} L${-r} 0 L${-k} ${-k} Z" fill="${boja}"/>`;
}
function pahulja(r: number, boja = '#fff', deb = 3) {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const c = Math.cos(a);
    const s = Math.sin(a);
    d += `M0 0 L${n(c * r)} ${n(s * r)}`;
    for (const t of [0.5, 0.75]) {
      const bx = c * r * t;
      const by = s * r * t;
      for (const k of [-1, 1]) {
        const b = a + (k * Math.PI) / 3;
        d += `M${n(bx)} ${n(by)} L${n(bx + Math.cos(b) * r * 0.24)} ${n(by + Math.sin(b) * r * 0.24)}`;
      }
    }
  }
  return `<path d="${d}" stroke="${boja}" stroke-width="${deb}" stroke-linecap="round" fill="none"/>`;
}
function snijegPada(sjeme: number, broj: number, boja = '#fff', y0 = 0, y1 = 1350) {
  const r = slucaj(sjeme);
  let s = '';
  for (let i = 0; i < broj; i++) {
    const x = r() * 1080;
    const y = y0 + r() * (y1 - y0);
    const v = 2 + r() * 6;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(v)}" fill="${boja}" opacity="${n(0.35 + r() * 0.6)}"/>`;
  }
  return s;
}
function iskre(sjeme: number, tocke: [number, number, number][], boja = '#d4af37') {
  const r = slucaj(sjeme);
  return tocke.map(([x, y, v]) => g(x, y, iskra(v, boja), { rot: r() * 20 - 10, op: 0.55 + r() * 0.45 })).join('');
}

// ---------- grana bora: stabljika uz +x, iglice s obje strane ----------
const ZELENE = ['#17462f', '#1f5a3f', '#2a6a4d', '#3a8560', '#123a27'];
function grana(duljina: number, sjeme: number, o: { igla?: number; snijeg?: boolean; savijanje?: number; grancice?: number } = {}): string {
  const r = slucaj(sjeme);
  const L = o.igla ?? 40;
  const sav = o.savijanje ?? duljina * 0.08;
  const tocka = (t: number) => [t * duljina, Math.sin(t * Math.PI) * sav - t * t * sav * 0.6] as const;
  const kut = (t: number) => {
    const [x1, y1] = tocka(Math.max(0, t - 0.02));
    const [x2, y2] = tocka(Math.min(1, t + 0.02));
    return Math.atan2(y2 - y1, x2 - x1);
  };
  let s = '';
  // bočne grančice (ispod glavnih iglica)
  const gr = o.grancice ?? 0;
  for (let i = 0; i < gr; i++) {
    const t = 0.18 + (i / Math.max(1, gr)) * 0.6;
    const [x, y] = tocka(t);
    const strana = i % 2 ? 1 : -1;
    s += g(x, y, grana(duljina * (0.5 - t * 0.2), sjeme * 7 + i, { igla: L * 0.85, snijeg: o.snijeg }), { rot: n((kut(t) * 180) / Math.PI + strana * (32 + r() * 12)) });
  }
  let st = 'M0 0';
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    const [x, y] = tocka(t);
    st += ` L${n(x)} ${n(y)}`;
  }
  s += `<path d="${st}" stroke="#4a3320" stroke-width="${n(Math.max(3, duljina / 60))}" stroke-linecap="round" fill="none"/>`;
  const korak = Math.max(5, L * 0.16);
  const slojevi: string[] = ['', ''];
  for (let d = 6; d <= duljina; d += korak) {
    const t = d / duljina;
    const [x, y] = tocka(t);
    const a = kut(t);
    for (const strana of [-1, 1]) {
      const b = a + strana * (0.5 + r() * 0.55);
      const l = L * (1 - t * 0.45) * (0.75 + r() * 0.4);
      const boja = ZELENE[Math.floor(r() * ZELENE.length)];
      const linija = `<path d="M${n(x)} ${n(y)} L${n(x + Math.cos(b) * l)} ${n(y + Math.sin(b) * l)}" stroke="${boja}"/>`;
      slojevi[r() < 0.5 ? 0 : 1] += linija;
    }
  }
  // vrh
  const [vx, vy] = tocka(1);
  for (let i = -2; i <= 2; i++) {
    const b = kut(1) + i * 0.28;
    slojevi[1] += `<path d="M${n(vx)} ${n(vy)} L${n(vx + Math.cos(b) * L * 0.6)} ${n(vy + Math.sin(b) * L * 0.6)}" stroke="${ZELENE[(i + 2) % 5]}"/>`;
  }
  s += `<g stroke-width="${n(Math.max(2.2, L / 14))}" stroke-linecap="round" fill="none">${slojevi[0]}${slojevi[1]}</g>`;
  if (o.snijeg) {
    for (let d = duljina * 0.15; d < duljina; d += duljina * 0.17) {
      const [x, y] = tocka(d / duljina);
      s += `<ellipse cx="${n(x)}" cy="${n(y - L * 0.25)}" rx="${n(L * (0.5 + r() * 0.3))}" ry="${n(L * 0.2)}" fill="#fff" opacity=".92"/>`;
    }
  }
  return s;
}

// grančica bora za kuvertu (ispod pečata), u koordinatama 200 × 120 sa sredinom u (0,0)
export function grancica(): string {
  return [200, 160, -20, 20, 90].map((k, i) => `<g transform="rotate(${k}) translate(14 0)">${grana(62, 90 + i, { igla: 17 })}</g>`).join('');
}

// ---------- božikovina ----------
const LIST = 'M0 0 Q8 -15 18 -8 Q23 -19 32 -10 Q39 -19 46 -8 Q55 -10 64 0 Q55 10 46 8 Q39 19 32 10 Q23 19 18 8 Q8 15 0 0 Z';
function bobica(r: number, boja = '#b3151b') {
  return `<circle r="${r}" fill="${boja}"/><circle r="${r}" fill="url(#sfera)"/>`;
}
function bozikovina(o: { bobice?: string; listova?: number } = {}) {
  const kutovi = [200, 160, -20, 20, 90, -65].slice(0, o.listova ?? 5);
  let s = '';
  kutovi.forEach((k, i) => {
    s += `<g transform="rotate(${k}) translate(10 0) scale(2.1)"><path d="${LIST}" fill="${i % 2 ? 'url(#zel)' : 'url(#zelT)'}"/><path d="M3 0 H58" stroke="rgba(255,255,255,.3)" stroke-width="1" fill="none"/></g>`;
  });
  s += g(-14, 6, bobica(15, o.bobice)) + g(14, 2, bobica(16, o.bobice)) + g(2, -18, bobica(14, o.bobice));
  return s;
}

// ---------- imela: visi prema dolje od (0,0) ----------
function imela(sjeme: number, vel = 1) {
  const r = slucaj(sjeme);
  const list = 'M0 0 C12 -15 52 -19 76 -6 C82 -2 82 4 76 7 C52 18 12 13 0 0 Z';
  let stabljike = '';
  let listovi = '';
  let bobe = '';
  const grane = [-70, -50, -30, -10, 10, 30, 50, 70];
  grane.forEach((kutDeg, i) => {
    const a = ((90 + kutDeg) * Math.PI) / 180;
    const l1 = (120 + r() * 120) * vel;
    const x1 = Math.cos(a) * l1;
    const y1 = Math.sin(a) * l1;
    stabljike += `<path d="M0 0 Q${n(x1 * 0.4)} ${n(y1 * 0.7)} ${n(x1)} ${n(y1)}" />`;
    for (const k of [-1, 1]) {
      const b = a + k * (0.35 + r() * 0.2);
      const l2 = (90 + r() * 50) * vel;
      const x2 = x1 + Math.cos(b) * l2;
      const y2 = y1 + Math.sin(b) * l2;
      stabljike += `<path d="M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}"/>`;
      for (const m of [-1, 1]) {
        const c = (b * 180) / Math.PI + m * (16 + r() * 10);
        listovi += `<g transform="translate(${n(x2)} ${n(y2)}) rotate(${n(c)}) scale(${n(vel * (1.5 + r() * 0.45))})"><path d="${list}" fill="url(#imelaL)"/><path d="M4 0 C30 -3 55 -3 74 0" stroke="rgba(255,255,255,.45)" stroke-width="1.6" fill="none"/></g>`;
      }
      if (r() < 0.75) bobe += g(x2 - 6 * k, y2 - 4, bobica(13 * vel, '#f4f0e2')) + g(x2 + 12, y2 + 10, bobica(11 * vel, '#f7f4ea'));
    }
    if (i % 2 === 0) bobe += g(x1, y1, bobica(14 * vel, '#f4f0e2')) + g(x1 + 16 * vel, y1 - 10 * vel, bobica(11 * vel, '#fbf9f2'));
  });
  return `<g stroke="#7f8f55" stroke-width="${n(6 * vel)}" stroke-linecap="round" fill="none">${stabljike}</g>${listovi}${bobe}`;
}

// ---------- kuglica: vrh kapice je u (0,0), kugla visi ispod ----------
type Uzorak = 'trake' | 'zvjezdice' | 'tockice' | 'nista';
function kuglica(r: number, boja: string, uzorak: Uzorak = 'nista', konac = 0, ukras = '#f3d77a') {
  let s = '';
  if (konac) s += `<path d="M0 ${-konac} V-16" stroke="#b8922b" stroke-width="2.5"/>`;
  s += `<circle cy="-12" r="9" fill="none" stroke="url(#zlato)" stroke-width="3.5"/>`;
  s += `<circle cy="${r + 8}" r="${r}" fill="${boja}"/>`;
  const cy = r + 8;
  if (uzorak === 'trake') {
    for (const [dy, deb] of [
      [-0.18, 0.07],
      [0.12, 0.16],
      [0.4, 0.06],
    ]) {
      const y = cy + dy * r;
      const pola = Math.sqrt(Math.max(0, r * r - (dy * r) ** 2));
      s += `<path d="M${n(-pola)} ${n(y)} Q0 ${n(y + r * 0.28)} ${n(pola)} ${n(y)}" stroke="${ukras}" stroke-width="${n(r * deb)}" fill="none" opacity=".95"/>`;
    }
  } else if (uzorak === 'zvjezdice') {
    for (const [dx, dy, v] of [
      [0, 0.05, 0.3],
      [-0.5, -0.3, 0.14],
      [0.48, -0.25, 0.16],
      [-0.42, 0.45, 0.15],
      [0.45, 0.48, 0.13],
    ])
      s += g(dx * r, cy + dy * r, iskra(r * v, ukras));
  } else if (uzorak === 'tockice') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      s += `<circle cx="${n(Math.cos(a) * r * 0.55)}" cy="${n(cy + Math.sin(a) * r * 0.55)}" r="${n(r * 0.07)}" fill="${ukras}"/>`;
    }
    s += g(0, cy, iskra(r * 0.22, ukras));
  }
  s += `<circle cy="${cy}" r="${r}" fill="url(#sfera)"/>`;
  s += `<rect x="${-r * 0.24}" y="-4" width="${r * 0.48}" height="${n(r * 0.22 + 8)}" rx="3" fill="url(#zlatoV)"/>`;
  return s;
}

// ---------- mašna: čvor je u (0,0), širina oko 330 ----------
function masna(svijetla = 'url(#crv)', tamna = 'url(#crvT)', repovi = true) {
  const petlja = `<path d="M0 0 C-40 -78 -150 -96 -164 -30 C-170 14 -150 64 -108 52 C-68 40 -30 16 0 0 Z" fill="${svijetla}"/><path d="M-4 2 C-52 -24 -112 -22 -134 12 C-112 34 -60 26 -4 2 Z" fill="${tamna}"/><path d="M-20 -22 C-60 -66 -128 -76 -148 -38" stroke="rgba(255,255,255,.28)" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const rep = `<path d="M-12 8 C-44 60 -74 124 -104 196 L-64 176 L-46 214 C-26 146 -4 72 12 14 Z" fill="${svijetla}"/><path d="M-12 8 C-30 40 -44 68 -56 98 C-36 80 -14 50 6 16 Z" fill="${tamna}" opacity=".7"/>`;
  return `${repovi ? rep + `<g transform="scale(-1 1)">${rep}</g>` : ''}${petlja}<g transform="scale(-1 1)">${petlja}</g><rect x="-26" y="-24" width="52" height="52" rx="16" fill="${svijetla}"/><path d="M-10 -22 C-16 -6 -16 12 -8 26 M10 -22 C16 -6 16 12 8 26" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/><rect x="-26" y="-24" width="52" height="20" rx="10" fill="rgba(255,255,255,.16)"/>`;
}

// ---------- poklon: sredina dna je u (0,0) ----------
function poklon(w: number, h: number, boja: string, traka = 'url(#zlatoV)') {
  return `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="3" fill="${boja}"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="3" fill="url(#vinjeta)"/><rect x="${-w / 2}" y="${-h}" width="${w * 0.22}" height="${h}" fill="rgba(255,255,255,.12)"/><rect x="${-w * 0.08}" y="${-h}" width="${w * 0.16}" height="${h}" fill="${traka}"/><rect x="${-w / 2 - 5}" y="${-h - 4}" width="${w + 10}" height="${h * 0.2}" rx="3" fill="${boja}"/><rect x="${-w / 2 - 5}" y="${-h - 4}" width="${w + 10}" height="${h * 0.2}" rx="3" fill="rgba(0,0,0,.14)"/><rect x="${-w * 0.08}" y="${-h - 4}" width="${w * 0.16}" height="${h * 0.2}" fill="${traka}"/>${g(0, -h - 6, masna(traka, 'rgba(0,0,0,.25)', false), { s: w / 420 })}`;
}

// ---------- okićeno drvce: sredina dna debla je u (0,0), visina oko 900 ----------
function drvce(sjeme: number, o: { snijeg?: boolean; pokloni?: boolean } = {}) {
  const r = slucaj(sjeme);
  const kat = [
    [-150, 250, 760],
    [-300, 220, 600],
    [-440, 185, 440],
    [-570, 150, 300],
    [-690, 112, 200],
  ]; // [y dna, poluširina, visina kata]
  let s = `<ellipse cx="0" cy="6" rx="270" ry="26" fill="#000" opacity=".22" filter="url(#mek)"/>`;
  s += `<rect x="-28" y="-170" width="56" height="176" rx="6" fill="url(#smed)"/>`;
  const ukrasi: string[] = [];
  kat.forEach(([y, w, h], i) => {
    const vrh = y - h * 0.62;
    const zub = 7;
    let d = `M0 ${vrh} L${w} ${y}`;
    for (let k = 0; k < zub; k++) {
      const x1 = w - ((k + 0.5) / zub) * 2 * w;
      const x2 = w - ((k + 1) / zub) * 2 * w;
      d += ` Q${n(x1)} ${y + 46 - Math.abs(x1) * 0.04} ${n(x2)} ${y - (k === zub - 1 ? 0 : 8)}`;
    }
    d += ' Z';
    s += `<path d="${d}" fill="url(#zelT)"/>`;
    // iglice kao tekstura
    let igle = '';
    for (let k = 0; k < 130 - i * 14; k++) {
      const ty = r();
      const yy = vrh + (y + 30 - vrh) * ty;
      const pola = w * ty * 0.98;
      const xx = (r() * 2 - 1) * pola;
      const a = Math.PI / 2 + (xx / (w || 1)) * 0.9 + (r() - 0.5) * 0.5;
      const l = 16 + r() * 22;
      igle += `<path d="M${n(xx)} ${n(yy)} L${n(xx + Math.cos(a) * l)} ${n(yy + Math.sin(a) * l)}" stroke="${ZELENE[Math.floor(r() * 5)]}"/>`;
    }
    s += `<g stroke-width="3.2" stroke-linecap="round" opacity=".9">${igle}</g>`;
    if (o.snijeg) {
      let sn = `M${-w * 0.92} ${y - 6}`;
      for (let k = 0; k < zub; k++) {
        const x1 = -w * 0.92 + ((k + 0.5) / zub) * 1.84 * w;
        const x2 = -w * 0.92 + ((k + 1) / zub) * 1.84 * w;
        sn += ` Q${n(x1)} ${y + 34} ${n(x2)} ${y - 8}`;
      }
      sn += ` Q${n(w * 0.5)} ${y - 44} 0 ${y - 40} Q${n(-w * 0.5)} ${y - 44} ${n(-w * 0.92)} ${y - 6} Z`;
      s += `<path d="${sn}" fill="#fff" opacity=".93"/>`;
    }
    // lanac od perli
    const yl = y - h * 0.22;
    let perle = '';
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const xx = -w * 0.72 + t * w * 1.44;
      const yy = yl + Math.sin(t * Math.PI) * 30 - t * 34;
      perle += `<circle cx="${n(xx)}" cy="${n(yy)}" r="6" fill="url(#zlato)"/>`;
    }
    s += perle;
    // kuglice na katu
    const broj = 4 - Math.floor(i / 2);
    for (let k = 0; k < broj; k++) {
      const t = (k + 0.5) / broj;
      const xx = -w * 0.66 + t * w * 1.32 + (r() - 0.5) * 20;
      const yy = y - 36 - r() * 20;
      const boje = ['#b3151b', 'url(#zlato)', '#f4efe2', '#c22a2a'];
      ukrasi.push(g(xx, yy, kuglica(20, boje[(k + i) % 4], k % 2 ? 'trake' : 'nista'), { sjena: false }));
      ukrasi.push(`<circle cx="${n(xx * 0.55 + 20)}" cy="${n(yy - 70)}" r="26" fill="url(#sjaj)"/><circle cx="${n(xx * 0.55 + 20)}" cy="${n(yy - 70)}" r="5" fill="#fff3c4"/>`);
    }
  });
  s += ukrasi.join('');
  s += `<circle cy="-838" r="90" fill="url(#sjaj)"/>` + g(0, -838, zvijezda(52), { sjena: false });
  if (o.pokloni !== false) {
    s += g(-150, 8, poklon(130, 96, '#a61c1c'), { sjena: true });
    s += g(120, 10, poklon(150, 80, '#f4efe2', 'url(#crv)'), { sjena: true });
    s += g(-30, 14, poklon(96, 66, '#1f5a3f'), { sjena: true });
  }
  return s;
}

// ---------- Djed Božićnjak: poprsje, širina oko 640, dno u y = 660 ----------
function krzno(tocke: [number, number, number][]) {
  return tocke.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
}
function djed() {
  const obrub: [number, number, number][] = [];
  for (let i = 0; i <= 9; i++) obrub.push([150 + i * 38, 196 + Math.sin(i * 1.3) * 5, 36]);
  const rub: [number, number, number][] = [];
  for (let i = 0; i <= 7; i++) rub.push([320, 470 + i * 32, 34]);
  const kugla: [number, number, number][] = [
    [560, 250, 34],
    [540, 228, 26],
    [584, 232, 24],
    [548, 276, 24],
    [584, 268, 26],
  ];
  return `
<path d="M20 700 C10 540 120 440 320 440 C520 440 630 540 620 700 Z" fill="url(#crv)"/>
<path d="M20 700 C10 540 120 440 320 440" stroke="rgba(255,255,255,.18)" stroke-width="10" fill="none"/>
<g fill="url(#bij)">${krzno(rub)}</g>
<path d="M150 300 C110 440 210 590 320 604 C430 590 530 440 490 300 C440 350 200 350 150 300 Z" fill="url(#bij)"/>
<g stroke="#cfccc2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"><path d="M210 420 C220 470 250 520 290 548"/><path d="M430 420 C420 470 390 520 350 548"/><path d="M320 470 C316 510 318 550 320 580"/><path d="M262 400 C268 440 282 480 300 506"/><path d="M378 400 C372 440 358 480 340 506"/></g>
<ellipse cx="320" cy="282" rx="122" ry="104" fill="url(#koza)"/>
<circle cx="246" cy="304" r="30" fill="#ef8f86" opacity=".55"/><circle cx="394" cy="304" r="30" fill="#ef8f86" opacity=".55"/>
<path d="M258 262 q14 -16 28 0" stroke="#2a1d16" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M354 262 q14 -16 28 0" stroke="#2a1d16" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M238 236 C254 216 286 216 300 232" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M340 232 C354 216 386 216 402 236" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round"/>
<path d="M320 338 C286 316 214 326 190 372 C236 392 296 380 320 352 C344 380 404 392 450 372 C426 326 354 316 320 338 Z" fill="#fff"/>
<path d="M320 338 C286 316 214 326 190 372" stroke="#d9d6cc" stroke-width="4" fill="none"/><path d="M320 338 C354 316 426 326 450 372" stroke="#d9d6cc" stroke-width="4" fill="none"/>
<path d="M296 372 Q320 396 344 372 Q320 384 296 372 Z" fill="#8b2a2a"/>
<ellipse cx="320" cy="312" rx="26" ry="22" fill="#e99a84"/><ellipse cx="312" cy="304" rx="9" ry="6" fill="#fff" opacity=".5"/>
<path d="M170 196 C186 70 300 14 396 44 C476 70 540 150 566 236 C520 176 470 150 452 196 Z" fill="url(#crv)"/>
<path d="M196 170 C220 90 300 50 380 66" stroke="rgba(255,255,255,.2)" stroke-width="12" fill="none" stroke-linecap="round"/>
<g fill="url(#bij)">${krzno(obrub)}</g>
<g fill="#fff">${krzno(kugla)}</g><circle cx="562" cy="252" r="44" fill="url(#sfera)" opacity=".35"/>`;
}

// ---------- sob: poprsje, širina oko 520, dno u y = 760 ----------
function sob() {
  const rog = `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#6f5237" stroke-width="22"><path d="M196 250 C176 170 126 120 92 34"/><path d="M158 168 C128 160 96 142 70 112"/><path d="M178 214 C146 216 112 210 84 196"/><path d="M120 104 C128 76 140 54 158 32"/></g><g stroke="#b3936b" stroke-width="7"><path d="M192 244 C172 168 124 118 92 40"/><path d="M152 162 C126 154 98 138 76 114"/><path d="M118 98 C126 74 138 56 154 38"/></g></g>`;
  const uho = `<path d="M0 0 C-34 -34 -96 -30 -124 8 C-92 40 -36 40 0 18 Z" fill="url(#smed)"/><path d="M-14 4 C-40 -16 -84 -14 -104 8 C-80 26 -42 26 -14 12 Z" fill="#e2b9a0"/>`;
  const lampice = [
    [92, 60, '#e0483f'],
    [70, 126, '#f5cf58'],
    [140, 150, '#3fa66e'],
    [110, 204, '#faf6f0'],
    [428, 60, '#f5cf58'],
    [450, 126, '#3fa66e'],
    [380, 150, '#e0483f'],
    [410, 204, '#f5cf58'],
  ]
    .map(([x, y, b]) => `<circle cx="${x}" cy="${+y + 14}" r="30" fill="${b}" opacity=".22"/><rect x="${+x - 5}" y="${+y - 4}" width="10" height="10" rx="2" fill="#2a2a2a"/><ellipse cx="${x}" cy="${+y + 16}" rx="10" ry="14" fill="${b}"/><ellipse cx="${+x - 3}" cy="${+y + 11}" rx="3" ry="5" fill="#fff" opacity=".6"/>`)
    .join('');
  return `
${rog}<g transform="translate(520 0) scale(-1 1)">${rog}</g>
<path d="M92 60 C80 100 60 110 70 126 C90 150 120 130 140 150 C150 180 100 180 110 204 M428 60 C440 100 460 110 450 126 C430 150 400 130 380 150 C370 180 420 180 410 204" stroke="#2a2a2a" stroke-width="3" fill="none"/>
${lampice}
<path d="M196 500 C176 600 128 690 96 780 L424 780 C392 690 344 600 324 500 Z" fill="url(#smed)"/>
<path d="M214 560 C210 640 190 720 176 780 L344 780 C330 720 310 640 306 560 Z" fill="#e6caa2" opacity=".85"/>
${g(150, 318, uho, { rot: 12 })}${g(370, 318, uho, { rot: -12, sx: -1 })}
<path d="M260 214 C170 214 138 280 148 356 C156 420 184 470 204 510 C216 556 304 556 316 510 C336 470 364 420 372 356 C382 280 350 214 260 214 Z" fill="url(#smed)"/>
<path d="M236 220 C246 196 274 196 284 220 C274 240 246 240 236 220 Z" fill="#6b4420"/>
<ellipse cx="260" cy="494" rx="70" ry="54" fill="#e6caa2"/>
<circle cx="190" cy="408" r="26" fill="#ef8f86" opacity=".45"/><circle cx="330" cy="408" r="26" fill="#ef8f86" opacity=".45"/>
<g><ellipse cx="210" cy="352" rx="19" ry="23" fill="#1c130d"/><ellipse cx="310" cy="352" rx="19" ry="23" fill="#1c130d"/><circle cx="216" cy="344" r="7" fill="#fff"/><circle cx="316" cy="344" r="7" fill="#fff"/><circle cx="205" cy="360" r="3" fill="#fff" opacity=".7"/><circle cx="305" cy="360" r="3" fill="#fff" opacity=".7"/></g>
<path d="M186 326 q10 -12 22 -10 M334 326 q-10 -12 -22 -10" stroke="#3c2613" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse cx="260" cy="466" rx="36" ry="27" fill="#c21d1b"/><ellipse cx="260" cy="466" rx="36" ry="27" fill="url(#sfera)"/>
<path d="M260 494 V510 M232 514 Q260 536 288 514" stroke="#5e3a1a" stroke-width="5" fill="none" stroke-linecap="round"/>
<g filter="url(#sjM)"><path d="M166 566 C226 606 294 606 354 566 L368 626 C298 668 222 668 152 626 Z" fill="url(#crv)"/><path d="M300 640 L352 624 L392 760 L372 752 L360 772 L344 754 L330 770 Z" fill="url(#crv)"/>
<g stroke="#faf6f0" stroke-width="9" opacity=".9"><path d="M196 590 L186 650"/><path d="M240 604 L236 664"/><path d="M286 604 L290 664"/><path d="M328 590 L340 650"/><path d="M322 690 L374 676"/><path d="M332 728 L384 714"/></g></g>`;
}

// ---------- anđeo: širina oko 460, visina oko 900 ----------
function andeo() {
  const pero = (y: number, w: number, k: number) => `<path d="M230 ${330 + y} C${230 - w * 0.5} ${250 + y} ${230 - w} ${220 + y + k} ${230 - w * 1.06} ${300 + y + k} C${230 - w * 1.08} ${370 + y + k} ${230 - w * 0.62} ${430 + y} 230 ${420 + y} Z"/>`;
  const krilo = `<g fill="url(#halja)" stroke="#d9cfae" stroke-width="3">${pero(60, 215, 120)}${pero(20, 222, 50)}${pero(-30, 200, -10)}</g><g stroke="#d4af37" stroke-width="2.5" fill="none" opacity=".7"><path d="M70 330 C110 370 160 380 210 372"/><path d="M40 390 C90 430 150 440 214 420"/><path d="M50 460 C100 492 160 494 216 470"/><path d="M96 300 C130 330 170 338 214 334"/></g>`;
  return `
<g filter="url(#sj)">${krilo}<g transform="translate(460 0) scale(-1 1)">${krilo}</g></g>
<ellipse cx="230" cy="120" rx="150" ry="150" fill="url(#sjaj)" opacity=".8"/>
<path d="M158 250 C140 320 150 400 172 440 L288 440 C310 400 320 320 302 250 Z" fill="#c98f3a"/>
<path d="M186 300 C140 420 104 700 70 860 C170 908 290 908 390 860 C356 700 320 420 274 300 Z" fill="url(#halja)"/>
<g stroke="#cfc8b4" stroke-width="4" fill="none" opacity=".8"><path d="M200 470 C180 600 150 760 130 872"/><path d="M230 480 C230 620 228 780 228 890"/><path d="M262 470 C280 600 310 760 330 872"/></g>
<path d="M84 800 C180 846 280 846 376 800 L390 860 C290 908 170 908 70 860 Z" fill="url(#zlato)"/>
<path d="M92 782 C186 826 274 826 368 782" stroke="url(#zlato)" stroke-width="5" fill="none"/>
${[[150, 640], [230, 700], [310, 640], [190, 560], [272, 560]].map(([x, y]) => g(x, y, iskra(14, '#d4af37'))).join('')}
<path d="M190 304 C132 356 124 440 196 462 L214 420 C176 404 176 360 212 322 Z" fill="url(#halja)" stroke="#d9cfae" stroke-width="2.5"/>
<path d="M270 304 C328 356 336 440 264 462 L246 420 C284 404 284 360 248 322 Z" fill="url(#halja)" stroke="#d9cfae" stroke-width="2.5"/>
<circle cx="230" cy="424" r="62" fill="url(#sjaj)"/>${g(230, 424, zvijezda(40))}
<circle cx="208" cy="446" r="15" fill="url(#koza)"/><circle cx="252" cy="446" r="15" fill="url(#koza)"/>
<path d="M196 296 Q230 330 264 296 L256 282 Q230 300 204 282 Z" fill="url(#zlato)"/>
<circle cx="230" cy="214" r="78" fill="#d9a441"/><circle cx="230" cy="214" r="78" fill="url(#sfera)" opacity=".35"/>
<circle cx="230" cy="226" r="58" fill="url(#koza)"/>
<path d="M172 214 C180 164 230 150 262 172 C282 186 290 204 288 220 C270 196 236 186 208 196 C192 202 180 208 172 214 Z" fill="#d9a441"/>
<path d="M200 232 q10 8 20 0 M240 232 q10 8 20 0" stroke="#5a3d22" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M218 258 q12 9 24 0" stroke="#b8574d" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="194" cy="250" r="12" fill="#ef8f86" opacity=".5"/><circle cx="266" cy="250" r="12" fill="#ef8f86" opacity=".5"/>
<ellipse cx="230" cy="120" rx="66" ry="17" fill="none" stroke="url(#zlato)" stroke-width="9"/>`;
}

// ---------- vijenac od bora: sredina u (0,0) ----------
function sisarka(v = 1) {
  let s = `<ellipse rx="${26 * v}" ry="${40 * v}" fill="#6b4420"/>`;
  for (let red = 0; red < 6; red++)
    for (let k = -1; k <= 1; k++) {
      const x = (k * 15 + (red % 2 ? 7 : 0) - 3) * v;
      const y = (-28 + red * 11) * v;
      if (Math.abs(x) < 24 * v) s += `<path d="M${n(x - 9 * v)} ${n(y)} q${9 * v} ${10 * v} ${18 * v} 0" stroke="#a9794a" stroke-width="${3 * v}" fill="#8a5a2e"/>`;
    }
  return s;
}
function vijenac(R: number, sjeme: number, debljina = 70) {
  const r = slucaj(sjeme);
  let s = `<circle r="${R}" fill="none" stroke="#000" stroke-width="${debljina * 1.5}" opacity=".2" filter="url(#mek)" transform="translate(0 14)"/>`;
  s += `<circle r="${R}" fill="none" stroke="#143627" stroke-width="${debljina}"/>`;
  const slojevi = ['', '', ''];
  const broj = Math.round(R * 5);
  for (let i = 0; i < broj; i++) {
    const th = r() * Math.PI * 2;
    const rr = R + (r() * 2 - 1) * debljina * 0.62;
    const x = Math.cos(th) * rr;
    const y = Math.sin(th) * rr;
    const a = th + Math.PI / 2 + (r() - 0.5) * 2.2;
    const l = 34 + r() * 38;
    slojevi[i % 3] += `<path d="M${n(x)} ${n(y)} L${n(x + Math.cos(a) * l)} ${n(y + Math.sin(a) * l)}" stroke="${ZELENE[Math.floor(r() * 5)]}"/>`;
  }
  s += `<g stroke-width="4.6" stroke-linecap="round">${slojevi.join('')}</g>`;
  // grančice koje vire
  for (let i = 0; i < 26; i++) {
    const th = (i / 26) * Math.PI * 2 + r() * 0.2;
    s += g(Math.cos(th) * (R - 10), Math.sin(th) * (R - 10), grana(110 + r() * 40, sjeme + i * 13, { igla: 34 }), { rot: n((th * 180) / Math.PI + (i % 2 ? 55 : -55) + 90) });
  }
  // ukrasi
  for (let i = 0; i < 12; i++) {
    const th = (i / 12) * Math.PI * 2 + 0.26;
    const x = Math.cos(th) * (R + (i % 2 ? 14 : -12));
    const y = Math.sin(th) * (R + (i % 2 ? 14 : -12));
    if (Math.abs(th - Math.PI / 2) < 0.5) continue; // dolje je mašna
    if (i % 3 === 0) s += g(x, y, g(-12, 4, bobica(14)) + g(12, 0, bobica(15)) + g(0, -16, bobica(13)), { sjena: false });
    else if (i % 3 === 1) s += `<g filter="url(#sjM)">${g(x, y, sisarka(0.9), { rot: n((th * 180) / Math.PI + 60) })}</g>`;
    else s += `<g filter="url(#sjM)">${g(x, y - 28, kuglica(24, i % 2 ? 'url(#zlato)' : '#f4efe2', 'nista'))}</g>`;
  }
  return s;
}

// ---------- zimska noć (dno čestitke) ----------
function nocnoDrvo(v: number, snijeg = true) {
  const k = (y: number, w: number, h: number) =>
    `<path d="M0 ${y - h} L${w} ${y} Q0 ${y + w * 0.3} ${-w} ${y} Z" fill="url(#zelT)"/>${snijeg ? `<path d="M${-w} ${y} Q0 ${y + w * 0.3} ${w} ${y} L${w * 0.86} ${y - w * 0.2} Q${w * 0.4} ${y + w * 0.08} ${w * 0.1} ${y - w * 0.1} Q${-w * 0.3} ${y + w * 0.1} ${-w * 0.5} ${y - w * 0.12} Q${-w * 0.74} ${y - w * 0.04} ${-w * 0.86} ${y - w * 0.2} Z" fill="#fff"/>` : ''}`;
  return `<g transform="scale(${v})"><rect x="-7" y="-20" width="14" height="24" fill="#3a2718"/>${k(-16, 62, 110)}${k(-76, 48, 96)}${k(-128, 34, 84)}${snijeg ? '<path d="M0 -212 L12 -182 Q6 -188 0 -180 Q-6 -188 -12 -182 Z" fill="#fff"/>' : ''}</g>`;
}
function kucica() {
  return `<circle cx="0" cy="-40" r="120" fill="url(#sjaj)" opacity=".45"/><rect x="34" y="-136" width="18" height="40" fill="#0c1d17"/><path d="M30 -136 h26 v-7 q-13 -7 -26 0 Z" fill="#fff"/><rect x="-74" y="-80" width="148" height="84" fill="#152c3f"/><path d="M-90 -78 L0 -148 L90 -78 Z" fill="#0f2233"/><path d="M-94 -74 L0 -154 L94 -74 L82 -74 L0 -138 L-82 -74 Z" fill="#fff"/><g fill="#f5cf58"><rect x="-54" y="-58" width="28" height="30" rx="2"/><rect x="26" y="-58" width="28" height="30" rx="2"/><circle cx="0" cy="-102" r="10"/></g><path d="M-40 -58 v30 M-54 -43 h28 M40 -58 v30 M26 -43 h28" stroke="#152c3f" stroke-width="3"/><rect x="-12" y="-40" width="24" height="44" rx="2" fill="#8b0000"/><circle cy="-26" r="7" fill="none" stroke="#2f7352" stroke-width="4"/>`;
}
function snjegovic() {
  return `<ellipse cx="10" cy="0" rx="70" ry="10" fill="#7f97b8" opacity=".5"/><path d="M-30 -116 L-80 -152 M-66 -142 L-78 -130 M-64 -141 L-70 -158 M30 -116 L80 -148 M66 -139 L80 -130 M64 -138 L66 -156" stroke="#3a2718" stroke-width="5" stroke-linecap="round" fill="none"/><circle cy="-50" r="52" fill="#fff"/><circle cy="-50" r="52" fill="url(#sfera)" opacity=".4"/><circle cy="-122" r="37" fill="#fff"/><circle cy="-122" r="37" fill="url(#sfera)" opacity=".4"/><circle cy="-176" r="26" fill="#fff"/><circle cy="-176" r="26" fill="url(#sfera)" opacity=".35"/><g fill="#1a1a1a"><circle cy="-132" r="3.6"/><circle cy="-112" r="3.6"/><circle cy="-68" r="3.8"/><circle cx="-9" cy="-183" r="3"/><circle cx="9" cy="-183" r="3"/></g><path d="M-10 -166 q10 8 20 0" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M0 -178 L28 -172 L0 -169 Z" fill="#e0782b"/><path d="M-26 -160 Q0 -144 26 -160 L25 -148 Q0 -132 -25 -148 Z" fill="url(#crv)"/><path d="M10 -146 L28 -150 L34 -106 L26 -110 L21 -104 L15 -110 Z" fill="#8b0000"/><rect x="-30" y="-202" width="60" height="7" rx="3" fill="#0f2a1f"/><rect x="-19" y="-238" width="38" height="38" rx="3" fill="#143627"/><rect x="-19" y="-212" width="38" height="9" fill="#a61c1c"/>`;
}

// ================= devet čestitki =================
const CESTITKE: Record<TemaKey, () => string> = {
  // 1. Klasična: krem papir, girlanda od bora s crvenom mašnom gore, božikovina u donjim kutovima
  klasicna: () => {
    let s = papir('#faf6f0') + okvir();
    let gore = '';
    gore += g(540, 150, grana(430, 11, { igla: 54, grancice: 4 }), { rot: 168 });
    gore += g(540, 150, grana(430, 12, { igla: 54, grancice: 4 }), { rot: 12 });
    gore += g(540, 140, grana(330, 13, { igla: 48, grancice: 3 }), { rot: 196 });
    gore += g(540, 140, grana(330, 14, { igla: 48, grancice: 3 }), { rot: -16 });
    gore += g(540, 160, grana(210, 15, { igla: 44 }), { rot: 140 }) + g(540, 160, grana(210, 16, { igla: 44 }), { rot: 40 });
    s += `<g filter="url(#sj)">${gore}</g>`;
    s += `<g filter="url(#sjM)">${g(250, 190, kuglica(34, '#b3151b', 'trake', 60))}${g(830, 190, kuglica(34, 'url(#zlato)', 'zvjezdice', 60, '#fff8dc'))}${g(380, 214, kuglica(24, 'url(#zlato)', 'nista', 44))}${g(700, 214, kuglica(24, '#b3151b', 'nista', 44))}</g>`;
    s += g(250, 150, bozikovina({ listova: 3 }), { s: 0.8, rot: 20, sjena: true }) + g(830, 150, bozikovina({ listova: 3 }), { s: 0.8, rot: -20, sx: -1, sjena: true });
    s += g(540, 150, masna(), { s: 1.25, sjena: true });
    let dolje = g(96, 1254, grana(250, 21, { igla: 44, grancice: 2 }), { rot: -34 }) + g(96, 1254, grana(200, 22, { igla: 40 }), { rot: -78 }) + g(96, 1254, grana(200, 23, { igla: 40 }), { rot: 2 });
    dolje += g(984, 1254, grana(250, 24, { igla: 44, grancice: 2 }), { rot: 214 }) + g(984, 1254, grana(200, 25, { igla: 40 }), { rot: 258 }) + g(984, 1254, grana(200, 26, { igla: 40 }), { rot: 178 });
    s += `<g filter="url(#sj)">${dolje}</g>`;
    s += g(120, 1232, bozikovina(), { s: 0.95, rot: -40, sjena: true }) + g(960, 1232, bozikovina(), { s: 0.95, rot: 40, sx: -1, sjena: true });
    s += iskre(5, [
      [150, 420, 12],
      [930, 470, 10],
      [110, 760, 9],
      [972, 800, 12],
      [170, 1040, 8],
      [900, 1060, 9],
    ]);
    return s;
  },

  // 2. Zimska noć: nebo, mjesec, snježni brežuljci, kućica, drvca i snjegović
  zimska: () => {
    let s = `<linearGradient id="nebo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1730"/><stop offset=".6" stop-color="#1a2f58"/><stop offset="1" stop-color="#35548a"/></linearGradient><rect width="1080" height="1350" fill="url(#nebo)"/>`;
    const r = slucaj(42);
    for (let i = 0; i < 70; i++) s += `<circle cx="${n(r() * 1080)}" cy="${n(r() * 860)}" r="${n(1 + r() * 2.4)}" fill="#fff8e1" opacity="${n(0.4 + r() * 0.6)}"/>`;
    s += `<circle cx="880" cy="170" r="190" fill="url(#sjaj)" opacity=".5"/><circle cx="880" cy="170" r="74" fill="#fbf6e6"/><circle cx="880" cy="170" r="74" fill="url(#sfera)" opacity=".25"/><circle cx="858" cy="150" r="12" fill="#e6dcc0" opacity=".6"/><circle cx="902" cy="196" r="18" fill="#e6dcc0" opacity=".5"/>`;
    s += g(170, 210, pahulja(34, '#dbe7fb', 3), { op: 0.7 }) + g(96, 520, pahulja(22, '#dbe7fb', 2.5), { op: 0.6 }) + g(990, 560, pahulja(28, '#dbe7fb', 2.5), { op: 0.6 }) + g(560, 96, pahulja(20, '#dbe7fb', 2.5), { op: 0.6 });
    s += `<path d="M0 1010 Q200 930 430 990 T860 960 T1080 940 V1350 H0 Z" fill="#8ea6cc"/>`;
    s += g(840, 986, kucica(), { s: 1.05 });
    s += g(70, 1004, nocnoDrvo(0.85), { op: 0.9 }) + g(210, 990, nocnoDrvo(1.05), { op: 0.9 }) + g(640, 976, nocnoDrvo(0.8), { op: 0.9 }) + g(1020, 972, nocnoDrvo(1.0), { op: 0.9 });
    s += `<path d="M0 1120 Q240 1040 520 1090 T1080 1060 V1350 H0 Z" fill="#e8eef8"/><path d="M0 1120 Q240 1040 520 1090 T1080 1060" stroke="#fff" stroke-width="6" fill="none"/>`;
    s += g(120, 1150, nocnoDrvo(1.55)) + g(960, 1130, nocnoDrvo(1.4));
    s += g(360, 1196, snjegovic(), { s: 1.15 });
    s += g(640, 1210, poklon(110, 80, '#a61c1c'), { sjena: true }) + g(740, 1218, poklon(84, 60, '#f4efe2', 'url(#crv)'), { sjena: true });
    s += `<path d="M0 1270 Q300 1210 600 1250 T1080 1230 V1350 H0 Z" fill="#fff"/>`;
    s += snijegPada(8, 70, '#fff', 0, 1300);
    s += `<rect x="30" y="30" width="1020" height="1290" fill="none" stroke="rgba(219,231,251,.55)" stroke-width="3"/>`;
    return s;
  },

  // 3. Moderna: bijeli papir, kuglice koje vise s vrha
  moderna: () => {
    let s = papir('#ffffff');
    s += `<rect x="34" y="34" width="1012" height="1282" fill="none" stroke="#b3262e" stroke-width="3"/>`;
    const k: [number, number, number, string, Uzorak, string][] = [
      [150, 300, 58, '#b3151b', 'trake', '#f3d77a'],
      [320, 190, 44, 'url(#zlato)', 'nista', '#fff'],
      [470, 400, 70, '#f4efe2', 'zvjezdice', '#d4af37'],
      [640, 240, 52, '#1f5a3f', 'tockice', '#f3d77a'],
      [790, 360, 62, '#b3151b', 'zvjezdice', '#f3d77a'],
      [940, 210, 46, 'url(#zlato)', 'trake', '#fff8dc'],
    ];
    s += k.map(([x, y, rr, b, u, uk]) => `<g filter="url(#sj)">${g(x, y, kuglica(rr, b, u, y, uk))}</g>`).join('');
    s += g(150, 300 - 2, masna('url(#zlato)', 'rgba(0,0,0,.25)', true), { s: 0.26 }) + g(790, 358, masna('url(#zlato)', 'rgba(0,0,0,.25)', true), { s: 0.28 });
    s += iskre(9, [
      [240, 520, 14],
      [600, 560, 10],
      [900, 540, 12],
      [120, 1180, 12],
      [960, 1200, 14],
      [540, 1262, 10],
    ]);
    s += `<g filter="url(#sj)">${g(60, 1300, grana(230, 31, { igla: 40, grancice: 2 }), { rot: -30 })}${g(1020, 1300, grana(230, 32, { igla: 40, grancice: 2 }), { rot: 210 })}</g>`;
    return s;
  },

  // 4. Imela: svežanj imele s crvenom mašnom visi s vrha
  imela: () => {
    let s = papir('#f4f1e6') + okvir('url(#zlato)', 'rgba(31,90,63,.4)');
    s += `<path d="M540 34 V150" stroke="url(#crv)" stroke-width="14"/>`;
    s += `<g filter="url(#sj)">${g(540, 170, imela(4, 1.02))}</g>`;
    s += g(540, 176, masna(), { s: 1.05, sjena: true });
    s += `<g filter="url(#sjM)">${g(110, 1240, bozikovina({ bobice: '#b3151b', listova: 4 }), { s: 0.8, rot: -30 })}${g(970, 1240, bozikovina({ bobice: '#b3151b', listova: 4 }), { s: 0.8, rot: 30, sx: -1 })}</g>`;
    s += iskre(3, [
      [130, 300, 12],
      [950, 330, 10],
      [100, 700, 9],
      [980, 760, 11],
    ]);
    return s;
  },

  // 5. Anđeo: anđeo lijevo, tekst desno
  andeo: () => {
    let s = papir('#f3f1ea') + okvir('url(#zlato)', 'rgba(212,175,55,.5)');
    s += `<circle cx="260" cy="640" r="360" fill="url(#sjaj)" opacity=".5"/>`;
    s += g(20, 250, andeo(), { s: 1.02 });
    s += iskre(12, [
      [120, 170, 16],
      [330, 130, 10],
      [450, 230, 12],
      [90, 1180, 12],
      [430, 1220, 14],
      [600, 150, 12],
      [900, 130, 16],
      [980, 300, 10],
      [960, 1180, 14],
      [640, 1230, 10],
    ]);
    s += g(250, 1244, grana(190, 51, { igla: 36 }), { rot: 180, sjena: true }) + g(250, 1244, grana(190, 52, { igla: 36 }), { rot: 0, sjena: true }) + g(250, 1240, g(-12, 4, bobica(13)) + g(12, 0, bobica(14)) + g(0, -15, bobica(12)));
    return s;
  },

  // 6. Djed Božićnjak: tekst gore, Djed viri s dna
  djed: () => {
    let s = papir('#f8f3e9') + okvir('url(#crv)', 'rgba(166,28,28,.35)');
    s += g(110, 150, pahulja(38, '#c9b98f', 3)) + g(960, 190, pahulja(30, '#c9b98f', 3)) + g(930, 700, pahulja(24, '#c9b98f', 2.5)) + g(130, 720, pahulja(26, '#c9b98f', 2.5));
    s += `<g filter="url(#sj)">${g(188, 590, djed(), { s: 1.1 })}</g>`;
    s += `<g filter="url(#sj)">${g(150, 1290, poklon(150, 110, '#1f5a3f'))}${g(930, 1290, poklon(130, 130, '#f4efe2', 'url(#crv)'))}</g>`;
    s += `<rect x="34" y="1290" width="1012" height="26" fill="#f8f3e9"/>` + okvir('url(#crv)', 'rgba(166,28,28,0)');
    return s;
  },

  // 7. Sob: tekst lijevo, sob desno
  sob: () => {
    let s = papir('#eadfc8') + okvir('url(#crv)', 'rgba(111,82,55,.4)');
    s += `<g filter="url(#sj)">${g(540, 520, sob(), { s: 1.0 })}</g>`;
    s += `<rect x="34" y="1290" width="1012" height="26" fill="#eadfc8"/><rect x="34" y="34" width="1012" height="1282" fill="none" stroke="url(#crv)" stroke-width="5"/>`;
    s += `<g filter="url(#sj)">${g(70, 110, grana(330, 71, { igla: 46, grancice: 3 }), { rot: 18 })}${g(70, 110, grana(250, 72, { igla: 42, grancice: 2 }), { rot: 62 })}</g>` + g(92, 124, bozikovina({ listova: 3 }), { s: 0.8, rot: 40, sjena: true });
    s += g(980, 150, pahulja(34, '#fff', 3.5)) + g(880, 300, pahulja(22, '#fff', 3)) + g(640, 170, pahulja(26, '#fff', 3)) + g(110, 1220, pahulja(30, '#fff', 3.5)) + g(330, 1250, pahulja(20, '#fff', 3));
    return s;
  },

  // 8. Božićno drvce: tamnozelena čestitka, drvce lijevo, tekst desno
  drvce: () => {
    let s = `<linearGradient id="tz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c2419"/><stop offset="1" stop-color="#1b4332"/></linearGradient><rect width="1080" height="1350" fill="url(#tz)"/><rect width="1080" height="1350" filter="url(#zrno)"/>`;
    s += `<circle cx="270" cy="700" r="460" fill="url(#sjaj)" opacity=".28"/>`;
    s += snijegPada(15, 46, '#faf6f0', 60, 1240);
    s += `<path d="M34 1200 Q260 1150 520 1190 T1046 1180 V1316 H34 Z" fill="#faf6f0"/>`;
    s += g(270, 1180, drvce(8, { snijeg: true }), { s: 1.02 });
    s += okvir('url(#zlato)', 'rgba(212,175,55,.5)');
    return s;
  },

  // 9. Vijenac: naslov u vijencu, poruka ispod
  vijenac: () => {
    let s = papir('#faf6f0') + okvir('url(#zelT)', 'rgba(212,175,55,.6)');
    s += g(540, 380, vijenac(250, 9, 78));
    s += g(540, 640, masna(), { s: 1.1, sjena: true });
    s += iskre(21, [
      [120, 140, 12],
      [960, 140, 12],
      [110, 760, 10],
      [970, 760, 10],
      [150, 1230, 12],
      [930, 1230, 12],
    ]);
    return s;
  },
} as Record<TemaKey, () => string>;

export function ilustracija(key: TemaKey): string {
  const crtaj = CESTITKE[key] ?? CESTITKE.klasicna;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIRINA}" height="${VISINA}" viewBox="0 0 ${SIRINA} ${VISINA}"><defs>${DEFS}</defs>${crtaj()}</svg>`;
}
