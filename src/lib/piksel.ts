// Meta piksel (oglasi na Facebooku i Instagramu). Uključuje se upisom META_PIXEL_ID u Cloudflare (samo broj).
// Bez te varijable na stranici nema piksela, obavijesti o kolačićima ni Metinih domena u CSP-u.
// Piksel se učitava tek kad posjetitelj prihvati kolačiće (components/Kolacici.astro).
import { env } from 'cloudflare:workers';

export function metaPiksel(): string {
  const id = (env as Record<string, unknown>).META_PIXEL_ID;
  return typeof id === 'string' && /^\d{6,20}$/.test(id.trim()) ? id.trim() : '';
}

// Domene koje piksel treba (skripta s connect.facebook.net, slanje događaja na www.facebook.com).
export const PIKSEL_CSP = {
  script: 'https://connect.facebook.net',
  connect: 'https://connect.facebook.net https://www.facebook.com',
  img: 'https://www.facebook.com',
};

// Događaj koji stranica želi poslati Meti (osim PageView, koji ide na svakoj stranici).
export type PikselDogadaj = {
  ime: 'InitiateCheckout' | 'Purchase';
  value: number;
  currency: string;
  // Purchase: oznaka Stripeove sesije, da se ista kupnja ne broji dvaput (osvježavanje stranice).
  id?: string;
};
