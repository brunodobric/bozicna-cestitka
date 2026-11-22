// Uređivač čestitke (/napravi): pregled uživo, brojač znakova prema dizajnu, poslušaj melodiju,
// smanjivanje fotografije u pregledniku i spremanje (napravi/spremi.ts).
import { nacrtaj, nacrtajFotografiju, natpisFotografije, type Podaci } from './cestitka';
import type { KartaOpis } from '../lib/teme';

type Teme = Record<string, { karta: KartaOpis; najvise: number; naziv: string }>;
type Pocetak = { id: string; slikaUrl: string | null };

const podaci = JSON.parse(document.getElementById('uredivac-podaci')?.textContent ?? '{}') as { teme: Teme; pocetak: Pocetak };
const teme = podaci.teme;
const forma = document.getElementById('obrazac') as HTMLFormElement;
const polje = (ime: string) => forma.elements.namedItem(ime) as HTMLInputElement | HTMLTextAreaElement;
const porukaPolje = polje('poruka') as HTMLTextAreaElement;
const brojac = document.getElementById('brojac')!;
const greska = document.getElementById('greska')!;
const stanje = document.getElementById('stanje')!;
const gumb = document.getElementById('spremi') as HTMLButtonElement;
const pregledCestitka = document.getElementById('pregled-cestitka') as HTMLImageElement;
const pregledFoto = document.getElementById('pregled-foto') as HTMLImageElement;

const duljina = (s: string) => [...s].length;
const odabrano = (ime: string) => (forma.querySelector<HTMLInputElement>(`input[name="${ime}"]:checked`)?.value ?? '');

// ---------------------------------------------------------------- fotografija
// Nova fotografija (smanjena) čeka u memoriji do spremanja; postojeća je javni URL iz bucketa.
let novaFoto: Blob | null = null;
let fotoUrl: string | null = podaci.pocetak.slikaUrl;
let ukloniFoto = false;
const fotoIzbor = document.getElementById('foto-izbor') as HTMLInputElement;
const fotoMala = document.getElementById('foto-mala') as HTMLImageElement;
const fotoUkloni = document.getElementById('foto-ukloni') as HTMLButtonElement;
const fotoNatpis = document.getElementById('foto-natpis')!;
const fotoGreska = document.getElementById('foto-greska')!;

const MAX_STRANICA = 1600;
// Kao u Kuverti: smanji na najviše 1600 px po duljoj stranici i spremi kao JPEG (brz upload, ispod 5 MB).
async function smanji(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const s = Math.min(1, MAX_STRANICA / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob: Blob | null = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('toBlob');
  return blob;
}

function prikaziFoto() {
  const ima = !!fotoUrl;
  fotoMala.hidden = !ima;
  if (fotoUrl) fotoMala.src = fotoUrl;
  fotoUkloni.hidden = !ima;
  fotoNatpis.textContent = ima ? 'Zamijeni fotografiju' : 'Dodaj fotografiju';
}

fotoIzbor.addEventListener('change', async () => {
  const f = fotoIzbor.files?.[0];
  fotoIzbor.value = '';
  if (!f) return;
  fotoGreska.hidden = true;
  fotoNatpis.textContent = 'Pripremam…';
  try {
    novaFoto = await smanji(f);
    if (fotoUrl?.startsWith('blob:')) URL.revokeObjectURL(fotoUrl);
    fotoUrl = URL.createObjectURL(novaFoto);
    ukloniFoto = false;
  } catch {
    fotoGreska.textContent = 'Ova fotografija se ne može otvoriti. Odaberite JPEG ili PNG.';
    fotoGreska.hidden = false;
  }
  prikaziFoto();
  osvjezi();
});

fotoUkloni.addEventListener('click', () => {
  if (fotoUrl?.startsWith('blob:')) URL.revokeObjectURL(fotoUrl);
  novaFoto = null;
  fotoUrl = null;
  ukloniFoto = true;
  prikaziFoto();
  osvjezi();
});

// ---------------------------------------------------------------- brojač i pregled
function granica() {
  return teme[odabrano('tema')]?.najvise ?? 320;
}

function osvjeziBrojac(): boolean {
  const n = duljina(porukaPolje.value.trim());
  const max = granica();
  porukaPolje.maxLength = Math.max(max, porukaPolje.value.length); // ne reže već napisan tekst
  const previse = n > max;
  brojac.textContent = previse
    ? `${n} / ${max}. Za dizajn „${teme[odabrano('tema')]?.naziv}” skratite poruku za ${n - max} znakova.`
    : `${n} / ${max}`;
  brojac.classList.toggle('je-previse', previse);
  return !previse;
}

let red = 0;
let crtanje = 0;
function osvjezi() {
  osvjeziBrojac();
  clearTimeout(red);
  red = window.setTimeout(nacrtajPregled, 250);
}

async function nacrtajPregled() {
  const broj = ++crtanje;
  const t = odabrano('tema');
  const p: Podaci = {
    tema: t,
    karta: teme[t].karta,
    naslov: polje('naslov').value || 'Sretan Božić',
    poruka: porukaPolje.value || 'Ovdje će stajati vaša poruka.',
    od: polje('od').value,
    slika: fotoUrl,
  };
  try {
    const [c, f] = await Promise.all([nacrtaj(p), fotoUrl ? nacrtajFotografiju({ ...p, natpis: natpisFotografije() }) : null]);
    if (broj !== crtanje) return; // u međuvremenu je stigla novija izmjena
    pregledCestitka.src = c.toDataURL('image/jpeg', 0.85);
    pregledFoto.hidden = !f;
    if (f) pregledFoto.src = f.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.error('pregled', e);
  }
}

forma.addEventListener('input', (e) => {
  if ((e.target as HTMLElement).id !== 'foto-izbor') osvjezi();
});
forma.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.name === 'tema' || el.name === 'melodija') osvjezi();
});

// ---------------------------------------------------------------- poslušaj melodiju
const zvuk = new Audio();
let svira: HTMLButtonElement | null = null;
const zaustavi = () => {
  zvuk.pause();
  if (svira) {
    svira.textContent = '▶';
    svira.classList.remove('je-svira');
  }
  svira = null;
};
zvuk.addEventListener('ended', zaustavi);
forma.querySelectorAll<HTMLButtonElement>('.u-poslusaj').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (svira === b) return zaustavi();
    zaustavi();
    zvuk.src = b.dataset.src ?? '';
    zvuk.currentTime = 0;
    zvuk.play().catch(() => null);
    svira = b;
    b.textContent = '■';
    b.classList.add('je-svira');
    // odabir melodije koju sluša
    const radio = b.closest('label')?.querySelector<HTMLInputElement>('input[type=radio]');
    if (radio) radio.checked = true;
  }),
);

// ---------------------------------------------------------------- spremanje
function pokaziGresku(tekst: string | null) {
  greska.textContent = tekst ?? '';
  greska.hidden = !tekst;
}

forma.addEventListener('submit', async (e) => {
  e.preventDefault();
  pokaziGresku(null);
  if (!porukaPolje.value.trim()) {
    pokaziGresku('Napišite poruku.');
    porukaPolje.focus();
    return;
  }
  if (!osvjeziBrojac()) {
    pokaziGresku(brojac.textContent);
    porukaPolje.focus();
    return;
  }
  zaustavi();
  gumb.disabled = true;
  stanje.textContent = novaFoto ? 'Spremam čestitku i fotografiju…' : 'Spremam…';
  const fd = new FormData(forma);
  fd.delete('fotografija-izbor');
  if (novaFoto) fd.set('fotografija', novaFoto, 'fotografija.jpg');
  if (ukloniFoto) fd.set('ukloni_fotografiju', '1');
  try {
    const r = await fetch('/napravi/spremi', { method: 'POST', body: fd, credentials: 'same-origin' });
    const o = (await r.json().catch(() => ({}))) as { id?: string; greska?: string; upozorenje?: string | null; izgubljena?: boolean };
    if (!r.ok || !o.id) {
      if (o.izgubljena) polje('id').value = '';
      throw new Error(o.greska ?? 'Čestitka se nije spremila. Pokušajte ponovno.');
    }
    polje('id').value = o.id;
    history.replaceState(null, '', `/napravi?id=${o.id}`);
    novaFoto = null;
    ukloniFoto = false;
    if (o.upozorenje) {
      pokaziGresku(o.upozorenje);
      stanje.textContent = 'Tekst je spremljen.';
      gumb.disabled = false;
      return;
    }
    location.href = `/napravi/pregled/${o.id}`;
  } catch (err) {
    pokaziGresku(err instanceof Error ? err.message : 'Čestitka se nije spremila.');
    stanje.textContent = '';
    gumb.disabled = false;
  }
});

prikaziFoto();
osvjeziBrojac();
nacrtajPregled();
