// Spremanje čestitke iz uređivača (/napravi). Kupac nema račun: pri prvom spremanju ga Supabase tiho
// prijavi anonimno (pravi auth.uid(), kolačić sesije je httpOnly), pa sva pravila RLS-a rade kao za
// prijavljenog korisnika. Zaštita: RLS na tablici (samo vlasnik), okidač cestitka_guard (ne može sam
// platiti ni mijenjati tokene) i pravila bucketa (fotografija samo u mapi vlastite čestitke).
import type { APIRoute } from 'astro';
import { captchaToken } from '../../lib/turnstile';
import { provjeri } from '../../lib/uredivac';
import { BUCKET, MAX_BYTES, ispravnaPutanja, novaPutanja, sniffImage } from '../../lib/slike';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const odgovor = (status: number, tijelo: Record<string, unknown>) =>
  new Response(JSON.stringify(tijelo), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const ZAKLJUCANO = {
  otvorena: 'Primatelj je već otvorio čestitku, pa se više ne može mijenjati.',
  ime: 'Ime na kuverti ne može se mijenjati nakon plaćanja. Za drugu osobu napravite novu čestitku.',
};

export const POST: APIRoute = async ({ locals, request, url }) => {
  // Zahtjev mora doći s naše stranice (obrazac šalje fetch s istog podrijetla).
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return odgovor(403, { greska: 'Zahtjev nije dopušten.' });
  // Fotografija do 5 MB + tekst; veće odbijamo prije čitanja.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES + 256 * 1024)
    return odgovor(413, { greska: 'Fotografija je prevelika. Najviše 5 MB.' });

  let f: FormData;
  try {
    f = await request.formData();
  } catch {
    return odgovor(400, { greska: 'Podaci nisu stigli. Pokušajte ponovno.' });
  }
  const p = provjeri(f);
  if ('greska' in p) return odgovor(400, { greska: p.greska });
  const { unos } = p;

  const { supabase } = locals;
  let user = locals.user;
  if (!user) {
    // CAPTCHA: token iz Turnstilea provjerava Supabase Auth (kad je zaštita tamo uključena).
    const token = captchaToken(f);
    const { data, error } = await supabase.auth.signInAnonymously(token ? { options: { captchaToken: token } } : undefined);
    if (error || !data.user) {
      console.error('signInAnonymously', error?.message);
      if (/captcha/i.test(error?.message ?? ''))
        return odgovor(400, { greska: 'Provjera da niste robot nije uspjela. Pokušajte ponovno.', captcha: true });
      return odgovor(503, { greska: 'Spremanje trenutno ne radi. Pokušajte za minutu.' });
    }
    user = data.user;
  }

  // ---- nova čestitka ili izmjena postojeće (RLS: samo vlasnik je vidi) ----
  const trazeniId = String(f.get('id') ?? '');
  let id: string;
  let staraSlika: string | null = null;
  if (UUID.test(trazeniId)) {
    const { data: postojeca } = await supabase
      .from('cestitke')
      .select('id, slika, za, placeno, prvo_otvaranje')
      .eq('id', trazeniId)
      .maybeSingle();
    if (!postojeca) return odgovor(404, { greska: 'Ova čestitka nije pronađena na ovom uređaju. Napravite novu.', izgubljena: true });
    // Zaključavanje (isto pravilo čuva i baza, okidač cestitka_zakljucavanje u migraciji 006).
    if (postojeca.prvo_otvaranje) return odgovor(409, { greska: ZAKLJUCANO.otvorena });
    if (postojeca.placeno && unos.za !== (postojeca.za ?? '')) return odgovor(409, { greska: ZAKLJUCANO.ime });
    id = postojeca.id;
    staraSlika = postojeca.slika;
    const { error } = await supabase.from('cestitke').update(unos).eq('id', id);
    if (error) {
      console.error('update cestitke', error.message);
      if (error.message.includes('cestitka_otvorena')) return odgovor(409, { greska: ZAKLJUCANO.otvorena });
      if (error.message.includes('ime_zakljucano')) return odgovor(409, { greska: ZAKLJUCANO.ime });
      return odgovor(500, { greska: 'Čestitka se nije spremila. Pokušajte ponovno.' });
    }
  } else {
    const { data, error } = await supabase
      .from('cestitke')
      .insert({ ...unos, owner_id: user.id })
      .select('id')
      .single();
    if (error || !data) {
      console.error('insert cestitke', error?.message);
      return odgovor(500, { greska: 'Čestitka se nije spremila. Pokušajte ponovno.' });
    }
    id = data.id;
  }

  // ---- fotografija: nova zamjenjuje staru, "ukloni" je briše ----
  let slika = staraSlika;
  const datoteka = f.get('fotografija');
  const ukloni = f.get('ukloni_fotografiju') === '1';
  let upozorenje: string | null = null;
  if (datoteka instanceof File && datoteka.size > 0) {
    const bytes = new Uint8Array(await datoteka.arrayBuffer());
    const vrsta = datoteka.size <= MAX_BYTES ? sniffImage(bytes) : null;
    if (!vrsta) {
      upozorenje = 'Fotografija nije spremljena: dopušteni su JPEG, PNG i WebP do 5 MB.';
    } else {
      const put = novaPutanja(id, vrsta.ext);
      const { error } = await supabase.storage.from(BUCKET).upload(put, bytes, { contentType: vrsta.mime, upsert: false, cacheControl: '31536000' });
      if (error) {
        console.error('upload fotografije', error.message);
        upozorenje = 'Fotografija se nije učitala. Tekst čestitke je spremljen, pokušajte s fotografijom ponovno.';
      } else {
        const { error: e2 } = await supabase.from('cestitke').update({ slika: put }).eq('id', id);
        if (e2) {
          await supabase.storage.from(BUCKET).remove([put]); // da ne ostane datoteka bez čestitke
          upozorenje = 'Fotografija se nije spremila. Pokušajte ponovno.';
        } else {
          if (ispravnaPutanja(staraSlika)) await supabase.storage.from(BUCKET).remove([staraSlika]);
          slika = put;
        }
      }
    }
  } else if (ukloni && staraSlika) {
    const { error } = await supabase.from('cestitke').update({ slika: null }).eq('id', id);
    if (!error) {
      if (ispravnaPutanja(staraSlika)) await supabase.storage.from(BUCKET).remove([staraSlika]);
      slika = null;
    }
  }

  return odgovor(200, { id, slika, upozorenje });
};
