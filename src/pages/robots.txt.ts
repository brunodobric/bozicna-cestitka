// Pravila za tražilice i AI alate (kao u Kuverti). Čestitke i uređivač su zatvoreni.
import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/seo';

export const GET: APIRoute = ({ url }) => {
  const body = `User-agent: *
Allow: /
Disallow: /c/
Disallow: /napravi
Disallow: /uredi
Disallow: /stripe/

Sitemap: ${siteOrigin(url)}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
