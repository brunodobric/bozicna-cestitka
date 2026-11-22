// Ulazna točka Workera: stranice obrađuje Astro, a cron (wrangler.jsonc, "triggers") jednom dnevno
// briše istekle čestitke i njihove fotografije (src/lib/ciscenje.ts).
import { handle } from '@astrojs/cloudflare/handler';
import { ocistiIstekle } from './lib/ciscenje';

export default {
  fetch: handle,
  async scheduled(_controller: unknown, env: Record<string, unknown>, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(ocistiIstekle(env).catch((e) => console.error(e)));
  },
};
