// Ulazna točka Workera: stranice obrađuje Astro. Cron za brisanje isteklih čestitki (korak 10 plana)
// dodaje se ovdje kao scheduled() i u wrangler.jsonc kao "triggers".
import { handle } from '@astrojs/cloudflare/handler';

export default {
  fetch: handle,
};
