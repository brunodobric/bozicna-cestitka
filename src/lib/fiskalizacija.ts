// Fiskalizacija kartičnih uplata preko servisa fisk-racun (repozitorij financijski-softver), isto kao u Kuverti
// (src/lib/fiskalizacija.ts), uz izvor 'cestitka'. Varijable u Cloudflareu: FISK_URL i FISK_TOKEN (iste kao u Kuverti).
// Uplate iz Stripe sandboxa fiskaliziraju se samo uz FISK_TESTNE_UPLATE=true (samo dok je fisk-racun u testnoj okolini; u produkciji bi testna uplata dobila pravi račun).
import { env } from 'cloudflare:workers';

const read = (name: string) => {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === 'string' ? v.trim() : '';
};

export const fiskalizacijaPostavljena = () => !!read('FISK_URL') && !!read('FISK_TOKEN');

async function fisk(tijelo: Record<string, unknown>): Promise<Response> {
  return fetch(read('FISK_URL'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-fisk-token': read('FISK_TOKEN') },
    body: JSON.stringify(tijelo),
    signal: AbortSignal.timeout(15000),
  });
}

export type Uplata = {
  sessionId: string;
  iznosCenti: number;
  testna: boolean;
  opis: string;
  email: string;
  ime: string;
};

// Izdaje (i šalje Poreznoj) račun za uplatu. Isti poziv za istu sesiju vraća već izdani račun.
// Baca grešku samo kad servis nije dostupan, da Stripe ponovi webhook.
export async function izdajRacun(u: Uplata): Promise<'izdan' | 'preskoceno' | 'odbijen'> {
  if (!fiskalizacijaPostavljena()) return 'preskoceno';
  if (u.testna && read('FISK_TESTNE_UPLATE') !== 'true') return 'preskoceno';
  // Uplata od 0 € (npr. kupon od 100 %) ne fiskalizira se.
  if (!(u.iznosCenti > 0)) return 'preskoceno';
  const kupac: Record<string, string> = {};
  if (u.ime) kupac.naziv = u.ime;
  if (u.email) kupac.email = u.email;
  const res = await fisk({
    radnja: 'izdaj',
    izvor: 'cestitka',
    vanjskiId: u.sessionId,
    iznosCenti: u.iznosCenti,
    nacinPlacanja: 'K',
    podaci: {
      opis: u.opis,
      stavke: [{ opis: u.opis, kolicina: 1, cijenaCenti: u.iznosCenti }],
      kupac,
      stripeSession: u.sessionId,
    },
  });
  if (res.ok) return 'izdan';
  const poruka = await res.text().catch(() => '');
  // 422: Porezna je trajno odbila račun; ponavljanje ne pomaže, treba ručna provjera.
  if (res.status === 422) {
    console.error('fiskalizacija odbijena', u.sessionId, poruka);
    return 'odbijen';
  }
  throw new Error(`fisk-racun HTTP ${res.status}: ${poruka.slice(0, 300)}`);
}

export type Povrat = {
  sessionId: string;
  refundId: string;
  iznosCenti: number;
  testna: boolean;
};

// Storno računa za povrat novca (Stripe refund, i djelomičan): novi račun s minusom i vlastitim
// brojem koji upućuje na račun uplate. Isti povrat uvijek daje isti storno.
// Baca grešku samo kad servis nije dostupan, da Stripe ponovi webhook.
export async function stornirajRacun(p: Povrat): Promise<'izdan' | 'preskoceno' | 'odbijen'> {
  if (!fiskalizacijaPostavljena()) return 'preskoceno';
  if (p.testna && read('FISK_TESTNE_UPLATE') !== 'true') return 'preskoceno';
  if (!(p.iznosCenti > 0)) return 'preskoceno';
  const res = await fisk({
    radnja: 'storno',
    izvor: 'cestitka',
    vanjskiId: p.refundId,
    izvorniVanjskiId: p.sessionId,
    iznosCenti: p.iznosCenti,
    podaci: { stripeSession: p.sessionId, stripeRefund: p.refundId },
  });
  if (res.ok) return 'izdan';
  const poruka = await res.text().catch(() => '');
  // 404: za uplatu nema računa (npr. uplata od 0 €), pa nema ni storna.
  if (res.status === 404) return 'preskoceno';
  // 409: storno nije moguć (npr. premašuje iznos računa), 422: Porezna ga je odbila.
  // Ponavljanje ne pomaže, treba ručna provjera.
  if (res.status === 409 || res.status === 422) {
    console.error('storno nije izdan', p.sessionId, p.refundId, poruka);
    return 'odbijen';
  }
  throw new Error(`fisk-racun HTTP ${res.status}: ${poruka.slice(0, 300)}`);
}

export type Storno = { vanjskiId: string; oznaka: string; izdan: string; iznosCenti: number };

// Storna računa uplate (povrati novca), redom izdavanja. Prazan popis ako ih nema ili servis ne odgovara.
export async function stornaRacuna(sessionId: string): Promise<Storno[]> {
  if (!fiskalizacijaPostavljena()) return [];
  try {
    const res = await fisk({ radnja: 'storna', izvor: 'cestitka', izvorniVanjskiId: sessionId });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { storna } = (await res.json()) as { storna?: (Storno & { stanje?: string; zki?: string | null })[] };
    return (storna ?? [])
      .filter((s) => s.stanje !== 'odbijen' && s.zki)
      .map(({ vanjskiId, oznaka, izdan, iznosCenti }) => ({ vanjskiId, oznaka, izdan, iznosCenti }));
  } catch (e) {
    console.error('storna', sessionId, e);
    return [];
  }
}

// PDF računa (uplate cs_… ili storna re_…), ili null ako računa nema.
export async function pdfRacuna(vanjskiId: string): Promise<ArrayBuffer | null> {
  if (!fiskalizacijaPostavljena()) return null;
  const res = await fisk({ radnja: 'pdf', izvor: 'cestitka', vanjskiId });
  if (res.status === 404 || res.status === 409) return null;
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/pdf')) {
    throw new Error(`fisk-racun HTTP ${res.status}`);
  }
  return await res.arrayBuffer();
}
