// Fotografija kupca (jedna po čestitci) u javnom bucketu cestitke-slike. Preuzeto iz Kuverte (lib/images.ts):
// stvarni tip se prepoznaje po bajtovima, a putanja je <id čestitke>/<32 nasumična hex znaka>.<ext>,
// pa se ne može pogoditi. Pravila bucketa dopuštaju upload i brisanje samo vlasniku čestitke (001_cestitke.sql).
export { BUCKET } from './cestitka';
export const MAX_BYTES = 5 * 1024 * 1024; // isto ograničenje je i na bucketu

const PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{32}\.(jpg|png|webp)$/;

export function ispravnaPutanja(path: unknown): path is string {
  return typeof path === 'string' && PATH_RE.test(path);
}

// Prepoznaje stvarni tip po početnim bajtovima (ne vjerujemo imenu ni Content-Type zaglavlju).
export function sniffImage(b: Uint8Array): { mime: string; ext: 'jpg' | 'png' | 'webp' } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return { mime: 'image/png', ext: 'png' };
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export function novaPutanja(cestitkaId: string, ext: string): string {
  return `${cestitkaId}/${crypto.randomUUID().replace(/-/g, '')}.${ext}`;
}
