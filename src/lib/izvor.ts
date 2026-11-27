// Otkud dolaze posjetitelji i kupci (Instagram, Facebook, oglasi, Google...). Prema Kuvertinom src/lib/izvor.ts.
//
// - Svaki ulazak na stranicu broji se u bazi po danu i izvoru (RPC zabiljezi_posjet, migracija 009),
//   bez kolačića i bez osobnih podataka: pamti se samo dan, izvor, medij, kampanja i oglas (utm_*).
//   Ulazak je otvaranje stranice s oznakom utm, s vanjske stranice ili upisanom adresom; klik unutar
//   naše stranice nije novi ulazak.
// - Da bi se znalo i otkud su kupnje, izvor ide u adresi poveznica (parametar PARAM_IZVOR, vidi Base.astro)
//   do uređivača, a spremi.ts ga upiše uz čestitku. Tko odabere "Samo nužni", tome se izvor ne prenosi.
// - Brojeve čita nadzorna ploča Digitalnog partnera (dp-nadzor) preko funkcije nadzor_cestitka.

export type Izvor = { izvor: string; medij: string; kampanja: string; oglas: string };

export const PARAM_IZVOR = 'od';
export const IZRAVNO: Izvor = { izvor: 'izravno', medij: '', kampanja: '', oglas: '' };

// Meta ponekad pošalje oznaku kodiranu dvaput (npr. %5Bbozic%5D), pa ostatke kodiranja još jednom dekodiramo.
const dekodiraj = (v: string) => {
  try {
    return /%[0-9a-f]{2}/i.test(v) ? decodeURIComponent(v) : v;
  } catch {
    return v;
  }
};

const cist = (v: string | null | undefined, max: number) =>
  dekodiraj(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);

// Poznate stranice s kojih dolaze posjetitelji bez oznake (poveznica u objavi, pretraga, AI).
const STRANICE: [RegExp, string, string][] = [
  [/(^|\.)instagram\.com$/, 'instagram', 'social'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook', 'social'],
  [/(^|\.)tiktok\.com$/, 'tiktok', 'social'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest', 'social'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x', 'social'],
  [/(^|\.)linkedin\.com$/, 'linkedin', 'social'],
  [/(^|\.)google\.[a-z.]+$/, 'google', 'organic'],
  [/(^|\.)bing\.com$/, 'bing', 'organic'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo', 'organic'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt', 'ai'],
  [/(^|\.)perplexity\.ai$/, 'perplexity', 'ai'],
  [/(^|\.)claude\.ai$/, 'claude', 'ai'],
  [/(^|\.)gemini\.google\.com$/, 'gemini', 'ai'],
];

// Stranice koje nisu izvor (naplata, prijava, naša adresa i pregledi grana).
const NISU_IZVOR = /(^|\.)(stripe\.com|supabase\.co|cloudflare\.com|bozicna\.kuverta\.hr|workers\.dev)$/;

// Izvor ulaska: oznake utm_*, vanjska stranica iz zaglavlja Referer, fbclid ili "izravno" (upisana adresa,
// poveznica iz WhatsAppa i aplikacija koje ne šalju Referer). Vraća null za klik unutar naše stranice.
export function izvorUlaska(url: URL, referer: string | null): Izvor | null {
  const q = url.searchParams;
  const utm = cist(q.get('utm_source'), 40);
  if (utm)
    return { izvor: utm, medij: cist(q.get('utm_medium'), 40), kampanja: cist(q.get('utm_campaign'), 60), oglas: cist(q.get('utm_content'), 80) };
  let host = '';
  try {
    host = referer ? new URL(referer).hostname.toLowerCase() : '';
  } catch {
    host = '';
  }
  if (host === url.hostname) return null;
  if (host && !NISU_IZVOR.test(host)) {
    const s = STRANICE.find(([re]) => re.test(host));
    if (s) return { izvor: s[1], medij: s[2], kampanja: '', oglas: '' };
    return { izvor: cist(host.replace(/^www\./, ''), 40), medij: 'referral', kampanja: '', oglas: '' };
  }
  // Facebook i Instagram dodaju fbclid na vanjske poveznice i kad preglednik ne pošalje Referer.
  if (q.get('fbclid')) return { izvor: 'meta', medij: 'fbclid', kampanja: '', oglas: '' };
  if (host) return null; // Stripe, Supabase: povratak s naplate nije novi ulazak
  return IZRAVNO;
}

// Zapis za parametar PARAM_IZVOR i stupac cestitke.izvor: "izvor|medij|kampanja|oglas" (znak | nije dopušten u dijelovima).
export function izvorUOznaku(i: Izvor): string {
  return [i.izvor, i.medij, i.kampanja, i.oglas].join('|');
}

export function izvorIzOznake(v: string | null | undefined): Izvor | null {
  if (!v) return null;
  const [a, b, c, d] = String(v).slice(0, 300).split('|');
  const izvor = cist(a, 40);
  if (!izvor) return null;
  return { izvor, medij: cist(b, 40), kampanja: cist(c, 60), oglas: cist(d, 80) };
}

// Stranice na kojima se ulazak broji: sve stranice za kupce, a ne čestitka za primatelja (/c/),
// Stripe, slike i obrasci koji primaju POST.
export function brojiUlazak(path: string): boolean {
  if (/\.[a-z0-9]+$/i.test(path)) return false;
  return !/^\/(c|stripe|ilustracije|_astro|_image|_server-islands)(\/|$)/.test(path) && !/^\/napravi\/(spremi|plati|racun)(\/|$)/.test(path);
}
