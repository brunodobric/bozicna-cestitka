// Ime proizvoda i adresa stranice. Ime je RADNO dok Bruno ne odluči ime i domenu (odjeljak 9 plana).
import { env } from 'cloudflare:workers';

export const SITE_NAME = 'Božićna čestitka';
export const SITE_DESCRIPTION =
  'Digitalna božićna čestitka u kuverti: napišete poruku, dodate fotografiju i pošaljete link na WhatsApp ili Viber. Primatelj otvori kuvertu i čestitku može spremiti kao sliku.';

export function siteOrigin(url: URL): string {
  const fixed = (env as Record<string, unknown>).SITE_URL;
  return typeof fixed === 'string' && /^https:\/\/[^/\s]+$/.test(fixed.replace(/\/$/, '')) ? fixed.replace(/\/$/, '') : url.origin;
}

// Preglednici koji samo dohvaćaju pregled poveznice (WhatsApp, Viber, Facebook...) ili indeksiraju stranicu.
// Za njih se čestitka ne otvara (ne bilježi se prvo otvaranje i ne vide se osobni podaci).
export const ROBOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|viber|telegram|discord|skype|curl|wget|python|headless/i;
