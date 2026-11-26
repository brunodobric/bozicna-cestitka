// Meta Conversions API: nakon uplate server javi kupnju Meti izravno, pa se broje i kupci kojima preglednik blokira piksel.
// Šalje se samo za kupca koji je prihvatio kolačiće (kolačić "kolacici=da" iz components/Kolacici.astro) u trenutku
// otvaranja naplate. Isti event_id kao piksel u pregledniku (Stripeova sesija), pa Meta kupnju ne broji dvaput.
// Meti ne šaljemo e-mail ni sadržaj čestitke: samo IP, preglednik i Metine oznake (_fbp, _fbc), kao i piksel.
// Varijable: META_PIXEL_ID, META_CAPI_TOKEN (Secret, Events Manager → Postavke → Conversions API → Generate access token),
// META_TEST_EVENT_CODE (neobavezno, kod s kartice Test events; tada idu i testne uplate).
import { env } from 'cloudflare:workers';
import { metaPiksel } from './piksel';

const VERZIJA = 'v26.0';

const read = (k: string) => {
  const v = (env as Record<string, unknown>)[k];
  return typeof v === 'string' ? v.trim() : '';
};

const kolacic = (zaglavlje: string, ime: string) => {
  for (const dio of zaglavlje.split(';')) {
    const [k, ...v] = dio.trim().split('=');
    if (k === ime) return decodeURIComponent(v.join('='));
  }
  return '';
};

// Metapodaci za Stripeovu sesiju (ključevi bez "metadata[...]"). Prazno kad kupac nije pristao ili piksel nije uključen.
export function metaPodaciZaSesiju(request: Request): Record<string, string> {
  if (!metaPiksel() || !read('META_CAPI_TOKEN')) return {};
  const k = request.headers.get('cookie') ?? '';
  if (kolacic(k, 'kolacici') !== 'da') return {};
  const fbp = kolacic(k, '_fbp');
  const fbc = kolacic(k, '_fbc');
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const ua = request.headers.get('user-agent') ?? '';
  const m: Record<string, string> = { meta_pristanak: 'da' };
  if (/^fb\.\d\.\d+\.\d+$/.test(fbp)) m.meta_fbp = fbp;
  if (/^fb\.\d\.\d+\..{1,400}$/.test(fbc)) m.meta_fbc = fbc;
  if (ip && ip.length <= 64) m.meta_ip = ip;
  if (ua) m.meta_ua = ua.slice(0, 500);
  return m;
}

type Sesija = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  livemode?: boolean;
  metadata?: Record<string, string> | null;
};

// Javi kupnju Meti. Ne baca grešku: kupnja je već potvrđena, a Meta nije nužna za uslugu.
export async function javiKupnjuMeti(s: Sesija, origin: string): Promise<void> {
  const piksel = metaPiksel();
  const token = read('META_CAPI_TOKEN');
  const m = s.metadata ?? {};
  if (!piksel || !token || m.meta_pristanak !== 'da') return;
  const testniKod = read('META_TEST_EVENT_CODE');
  if (s.livemode === false && !testniKod) return;

  const user_data: Record<string, string> = {};
  if (m.meta_ip) user_data.client_ip_address = m.meta_ip;
  if (m.meta_ua) user_data.client_user_agent = m.meta_ua;
  if (m.meta_fbp) user_data.fbp = m.meta_fbp;
  if (m.meta_fbc) user_data.fbc = m.meta_fbc;
  const tijelo: Record<string, unknown> = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: s.id,
        action_source: 'website',
        event_source_url: `${origin}/napravi/gotovo/${m.cestitka_id ?? ''}`,
        user_data,
        custom_data: { value: (s.amount_total ?? 0) / 100, currency: (s.currency ?? 'eur').toUpperCase() },
      },
    ],
  };
  if (testniKod) tijelo.test_event_code = testniKod;
  try {
    const res = await fetch(`https://graph.facebook.com/${VERZIJA}/${piksel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tijelo),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('meta konverzije', res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error('meta konverzije', e);
  }
}

export const konverzijeUkljucene = () => metaPiksel() !== '' && read('META_CAPI_TOKEN') !== '';
