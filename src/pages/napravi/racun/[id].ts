import type { APIRoute } from 'astro';
import { pdfRacuna } from '../../../lib/fiskalizacija';

// Račun (PDF) za uplatu čestitke, samo za kupca na uređaju na kojem je platio (RLS na tablici uplate).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const GET: APIRoute = async ({ locals, params }) => {
  const { supabase, user } = locals;
  const id = params.id ?? '';
  if (!user || !UUID.test(id)) return new Response('Račun nije pronađen.', { status: 404 });
  const { data } = await supabase
    .from('uplate')
    .select('stripe_session_id')
    .eq('cestitka_id', id)
    .like('stripe_session_id', 'cs_%')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return new Response('Račun nije pronađen.', { status: 404 });
  try {
    const pdf = await pdfRacuna(data.stripe_session_id);
    if (!pdf) return new Response('Račun još nije izdan. Pokušajte malo kasnije.', { status: 404 });
    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="racun-bozicna-cestitka.pdf"',
        'cache-control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('racun pdf', e);
    return new Response('Račun trenutno nije dostupan. Pokušajte malo kasnije.', { status: 503 });
  }
};
