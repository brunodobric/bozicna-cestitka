// Sitemap: javne stranice platforme i primjeri tema (čestitke kupaca nikad).
import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/seo';
import { TEME } from '../lib/teme';

export const GET: APIRoute = ({ url }) => {
  const o = siteOrigin(url);
  const adrese = ['/', ...TEME.map((t) => `/primjer/${t.key}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adrese.map((a) => `  <url><loc>${o}${a}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
