import type { APIRoute } from 'astro';
import { obradiDogadaj, provjeriPotpis } from '../../lib/placanje';
import { siteOrigin } from '../../lib/seo';

// Stripe javlja dovršene naplate ovdje (Stripe → Developers → Webhooks, adresa /stripe/webhook).
// Događaji: checkout.session.completed i checkout.session.async_payment_succeeded.
export const POST: APIRoute = async ({ request, locals, url }) => {
  const payload = await request.text();
  if (!(await provjeriPotpis(payload, request.headers.get('stripe-signature') ?? ''))) {
    return new Response('Neispravan potpis.', { status: 400 });
  }
  try {
    await obradiDogadaj(locals.supabase, JSON.parse(payload), siteOrigin(url));
  } catch (e) {
    console.error('stripe webhook', e);
    // Stripe ponavlja slanje dok ne dobije 2xx.
    return new Response('Greška pri obradi.', { status: 500 });
  }
  return new Response('ok');
};
