// Dnevno čišćenje (cron u src/worker.ts): briše čestitke kojima je prošao rok od 30 dana i neplaćene
// čestitke koje nitko nije dirao 30 dana, pa njihove fotografije iz Storagea.
// Ide anonimnim ključem: brisanje redaka radi funkcija ocisti_istekle (s tajnom), a fotografiju bez čestitke
// Storage dopušta obrisati bilo kome (migracija 005). service_role se ne koristi.
import { createClient } from '@supabase/supabase-js';
import { BUCKET } from './cestitka';

export async function ocistiIstekle(vars: Record<string, unknown>): Promise<void> {
  const tekst = (k: string) => (typeof vars[k] === 'string' ? (vars[k] as string).trim() : '');
  let url = '';
  try {
    url = new URL(tekst('SUPABASE_URL')).origin;
  } catch {
    url = '';
  }
  const kljuc = tekst('SUPABASE_ANON_KEY');
  const tajna = tekst('PLACANJE_SECRET');
  if (!url || !kljuc || !tajna) {
    console.warn('ciscenje: nedostaju SUPABASE_URL, SUPABASE_ANON_KEY ili PLACANJE_SECRET');
    return;
  }
  const supabase = createClient(url, kljuc, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('ocisti_istekle', { p_secret: tajna });
  if (error) throw new Error(`ciscenje: ${error.message}`);
  const putanje = ((data ?? []) as { putanja: string }[]).map((r) => r.putanja);
  for (let i = 0; i < putanje.length; i += 100) {
    const { error: e } = await supabase.storage.from(BUCKET).remove(putanje.slice(i, i + 100));
    if (e) console.error('ciscenje: brisanje fotografija', e.message);
  }
  console.log(`ciscenje: obrisano fotografija ${putanje.length}`);
}
