// Ponude (Bruno, 22. 11. 2026.): ista cijena s fotografijom i bez nje.
// Kod paketa se odmah otključa čestitka s koje je kupac platio, a ostale se troše na sljedećim čestitkama.
export type PonudaKey = 'jedna' | 'paket5' | 'paket10';

export type Ponuda = { key: PonudaKey; komada: 1 | 5 | 10; centi: number; naziv: string };

export const PONUDE: Ponuda[] = [
  { key: 'jedna', komada: 1, centi: 299, naziv: 'Božićna čestitka u kuverti' },
  { key: 'paket5', komada: 5, centi: 999, naziv: 'Paket od 5 božićnih čestitki' },
  { key: 'paket10', komada: 10, centi: 1499, naziv: 'Paket od 10 božićnih čestitki' },
];

export const ponuda = (key: unknown): Ponuda | null => PONUDE.find((p) => p.key === key) ?? null;
export const ponudaZaKomada = (n: unknown): Ponuda | null => PONUDE.find((p) => String(p.komada) === String(n)) ?? null;

export const iznos = (centi: number) => (centi / 100).toFixed(2).replace('.', ',') + ' €';

export const nazivPonude = (komada: number) => (komada === 1 ? 'Jedna čestitka' : `Paket od ${komada} čestitki`);

// Kratki tekst cijene za početnu, uređivač i pregled (Bruno, 27. 11. 2026.: cijena se vidi prije plaćanja).
const centiZa = (key: PonudaKey) => PONUDE.find((p) => p.key === key)!.centi;
export const CIJENA_JEDNE = iznos(centiZa('jedna'));
export const CIJENA_KRATKO = `Jedna čestitka ${CIJENA_JEDNE}, paket od 5 za ${iznos(centiZa('paket5'))}, paket od 10 za ${iznos(centiZa('paket10'))}.`;
