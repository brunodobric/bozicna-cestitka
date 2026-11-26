import type { APIRoute } from 'astro';
import { otvoriNaplatu, placanjeDostupno } from '../../lib/placanje';
import { ponuda as nadiPonudu } from '../../lib/cijena';
import { metaPodaciZaSesiju } from '../../lib/metaKonverzije';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Gumbi na pregledu čestitke: "Plati" (jedna ili paket) otvara Stripeovu stranicu plaćanja,
// a "Iskoristi čestitku iz paketa" otključa čestitku bez plaćanja ako kupac ima preostalih.
export const POST: APIRoute = async ({ request, locals, url, redirect }) => {
  const { supabase, user } = locals;
  const f = await request.formData();
  const id = String(f.get('id') ?? '');
  if (!UUID.test(id)) return redirect('/napravi', 303);
  if (!user) return redirect(`/napravi?id=${id}`, 303);
  const pregled = `/napravi/pregled/${id}`;

  // RLS: vidi se samo vlastita čestitka.
  const { data: c } = await supabase.from('cestitke').select('id, placeno, poruka').eq('id', id).maybeSingle();
  if (!c) return redirect(`/napravi?id=${id}`, 303);
  if (c.placeno) return redirect(`/napravi/gotovo/${id}`, 303);
  if (!c.poruka?.trim()) return redirect(pregled, 303);

  if (f.get('ponuda') === 'iz-paketa') {
    const { data: ok, error } = await supabase.rpc('iskoristi_paket', { p_cestitka: id });
    if (error) console.error('iskoristi_paket', error.message);
    return redirect(ok ? `/napravi/gotovo/${id}` : `${pregled}?placanje=greska`, 303);
  }

  const p = nadiPonudu(f.get('ponuda'));
  if (!p || !placanjeDostupno()) return redirect(pregled, 303);
  // Bez izričitog pristanka na isporuku odmah (kvačica o odustanku) ne otvaramo naplatu.
  if (f.get('odricanje') !== 'da') return redirect(`/napravi/placanje/${id}?ponuda=${p.key}&odricanje=nedostaje`, 303);
  try {
    return redirect(await otvoriNaplatu(user, id, p, url.origin, metaPodaciZaSesiju(request)), 303);
  } catch (e) {
    console.error('placanje', e);
    return redirect(`${pregled}?placanje=greska`, 303);
  }
};
