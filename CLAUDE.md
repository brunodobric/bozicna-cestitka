# Božićna čestitka: upute za rad na projektu

Ovu datoteku Claude Code učitava sam. Postavljanje je u `README.md`, ovdje su pravila rada i stanje.

## Projekt i vlasnik

Digitalna božićna čestitka u kuverti (radno ime, ime i domena još nisu odlučeni). Kupac bez registracije napravi čestitku, plati i pošalje link `/c/<token>`; primatelj otvori kuvertu i može spremiti čestitku kao sliku. Kod je izdvojen iz Kuverte (`brunodobric/MyWeddingInvite`), a plan rada je u `docs/PRIJENOS-BOZICNA-CESTITKA.md` (odjeljak 8).

Vlasnik je Bruno (Hrvatska, Europe/Zagreb), kod piše Claude.

- **Jezik:** s Brunom na hrvatskom; sav tekst na stranici je hrvatski; imena u kodu i komentari su hrvatski.
- **Bruno ne piše kod.** Objasni što si napravio u dvije do tri rečenice i što on mora učiniti. Ne nagađaj o stvarima koje ne možeš provjeriti.
- **Commit i push** kad Bruno to traži ili kad je zadatak "napravi i objavi". Poruke commitova na hrvatskom.

## Pravila pisanja teksta

Vrijede pravila skilla **dp-pisanje-teksta**: ljudski i konkretan ton, bez klišeja, bez "nije samo X, nego Y", **bez em dasha**, bez uskličnika u službenim tekstovima, bez izmišljenih brojki.

## Stack i naredbe

TypeScript, **Astro 7** (SSR) na **Cloudflare Workers** (`@astrojs/cloudflare`, ulazna točka `src/worker.ts`), **Supabase** (Postgres, anonimna prijava, Storage, EU). Bez frameworka i Tailwinda: ručni CSS.

```
npm install
npm run dev          # lokalno, treba .dev.vars (SUPABASE_URL, SUPABASE_ANON_KEY)
npx astro check      # mora biti 0 grešaka prije commita
npm run build
```

## Struktura

- `src/pages/c/[token].astro`: čestitka za primatelja (RPC `javna_cestitka`; robotima za pregled poveznice ne otvara čestitku).
- `src/pages/index.astro` + `src/styles/pocetna.css` + `src/components/NocnaScena.astro`: početna kao božićna noć (lampice, snijeg, SVG scena s drvcima, svjetiljkama, snjegovićem i saonicama). Font naslova je Great Vibes (`@fontsource/great-vibes`), samo na početnoj.
- `src/pages/primjer/[tema].astro`: primjer svake teme, radi bez baze.
- `src/lib/teme.ts`: **devet dizajna** (`klasicna`, `zimska`, `moderna`, `imela`, `andeo`, `djed`, `sob`, `drvce`, `vijenac`; ključevi su u bazi, ne mijenjati). Svaki ima boje stranice i kuverte (CSS varijable, postavlja ih `CestitkaLayout`), ukras ispod pečata i opis čestitke: fontove, boje i okvir u koji se slaže tekst.
- `src/lib/ilustracije.ts` + `src/pages/ilustracije/[tema].svg.ts`: ilustracije čestitki (SVG 1080 × 1350 nacrtan kodom, bez teksta).
- `src/scripts/cestitka.ts`: **čestitka je jedna slika**. Crta se na canvas (ilustracija, pa naslov, poruka i potpis koji se smanjuju dok ne stanu u okvir). Ista slika ide na karticu u kuverti, na ekran i u "Spremi kao sliku". Promjena ilustracije traži provjeru okvira za tekst u `teme.ts`.
- **Fotografija kupca je druga kartica** (`nacrtajFotografiju`): ista ilustracija, fotografija s bijelim rubom na mjestu teksta i natpis "Božić <godina>." (kod vijenca okrugla, unutar vijenca). Tekst čestitke zato ostaje jednako velik s fotografijom i bez nje. Nakon kuverte čestitka se pomakne i nakosi, a kartica s fotografijom izviri iza nje; dodir na nju (ili "Pogledaj fotografiju") ih zamijeni. "Spremi kao sliku" sprema obje. Bruno je odabrao ovaj način 22. 11. 2026. (prednja fotografija iznad teksta odbačena jer je tekst postajao presitan).
- `src/components/Envelope.astro`, `EnvelopeHead.astro`: kuverta iz Kuverte; CSS u `src/styles/kuverta.css` (doslovno iz Kuvertinog `invitation.css`), dopune u `src/styles/cestitka.css` (tekstura, pečat, grančica, čestitka koja izlazi iz kuverte i dolazi na svoje mjesto).
- `src/components/Karta.astro`: gotova čestitka (`<img>`) i gumbi.
- `public/primjeri/<tema>.jpg`: sličice za početnu. Nakon promjene dizajna treba ih ponovno snimiti (snimka elementa `#karta` na `/primjer/<tema>`).
- U razvoju `/primjer/<tema>?proba=dugo` i `?proba=foto` pokazuju dugu poruku i čestitku s fotografijom (zamjenska slika `public/primjeri/proba-fotografija.jpg`).
- `src/lib/melodije.ts` + `src/components/Glazba.astro` + `public/glazba/<ključ>.mp3`: **devet melodija** (ključevi su u bazi, ne mijenjati). Melodija krene na dodir kuverte, gumb u kutu je gasi. Licence i način rezanja isječaka su u `docs/GLAZBA.md`. Primjeri imaju svaki svoju melodiju, `?melodija=<ključ>` ili `?melodija=bez` je mijenja. Uređivač mora ponuditi odabir melodije (ili bez glazbe).
- **Uređivač** `src/pages/napravi/index.astro` + `src/scripts/uredivac.ts` + `src/styles/uredivac.css`: dizajn, tekst (granica poruke po dizajnu), melodija s gumbom "poslušaj", jedna fotografija (smanjuje se u pregledniku na 1600 px JPEG). Pregled uživo crta isti `scripts/cestitka.ts`. Pravila polja su u `src/lib/uredivac.ts` (isti `provjeri()` koristi server).
- `src/pages/napravi/spremi.ts`: POST iz uređivača. Prvo spremanje tiho prijavi kupca anonimno (`signInAnonymously`, kolačić httpOnly), pa insert ili update čestitke (RLS), upload fotografije u `cestitke-slike` (`src/lib/slike.ts`, tip po bajtovima), stara fotografija se briše. `/napravi?id=<uuid>` ponovno otvara čestitku na istom uređaju.
- `src/pages/napravi/pregled/[id].astro`: kupčev pregled s kuvertom i glazbom prije plaćanja (samo vlasnik, kuverta svaki put).
- **Plaćanje** (Stripe Checkout bez biblioteke, `src/lib/placanje.ts`): ponude u `src/lib/cijena.ts` (jedna 2,99 €, paket od 5 za 9,99 €, paket od 10 za 14,99 €, ista cijena s fotografijom i bez). Pregled → `/napravi/placanje/[id]` (odabir ponude ili "Iskoristi jednu iz paketa") → `/napravi/placanje/[id]?ponuda=<ključ>` (Stripeova polja za karticu na našoj stranici, Payment Element uz Checkout sesiju `ui_mode: elements`, naše boje i Plus Jakarta Sans; Bruno 22. 11. 2026.) → `/napravi/gotovo/[id]` (provjeri sesiju kod Stripea, link za primatelja, Kopiraj, Pošalji, tajni link). Rezerva bez `STRIPE_PUBLISHABLE_KEY` ili kad se polja ne učitaju: POST `/napravi/plati` na Stripeovu stranicu. Webhook `/stripe/webhook`. Paket: prva čestitka se otključa odmah, ostatak je u tablici `paketi` na kupčevom anonimnom računu. Testni ključ radi samo uz `PLACANJE_TESTNO=da`.
- **Zaključavanje** (Bruno, 22. 11. 2026.): nakon plaćanja ime na kuverti (`za`) se ne mijenja, a kad primatelj prvi put otvori čestitku, ne mijenja se ništa. Čuva ga baza (okidač `cestitka_zakljucavanje`, migracija 006, i Storage pravila), a uređivač i `spremi.ts` to pokazuju.
- **Spremi kao sliku:** na mobitelu (dodir bez miša) izbornik za dijeljenje, na računalu odmah preuzimanje (`jeMobitel()` u `scripts/cestitka.ts`). Uputa ispod gumba ne piše se nigdje (Bruno); isto mjesto pokazuje samo poruke o greški. Na dnu čestitke za primatelja je sitni link na naslovnicu "Pošalji nekome ovakvu čestitku." (Bruno).
- `src/pages/uredi/[token].astro`: tajni link vraća čestitku i ostatak paketa na drugi uređaj (tek na gumb, zbog robota za pregled poveznica).
- **Brisanje:** čestitka vrijedi 30 dana od plaćanja (`brisanje_nakon`, Bruno 22. 11. 2026.). Cron u `src/worker.ts` (`wrangler.jsonc` triggers, 3:15 UTC) zove `ocisti_istekle` i briše fotografije bez čestitke (`src/lib/ciscenje.ts`). Neplaćene čestitke nedirnute 30 dana također se brišu.
- `src/middleware.ts`: Supabase klijent po zahtjevu, CSP, `noindex` i `no-store` na `/c/`, `/napravi`, `/uredi`.

## Baza

- Migracije su u `supabase/migrations/NNN_ime.sql`. Nikad ne pretpostavljaj da je migracija pokrenuta.
- Sigurnost je u bazi: RLS na tablicama, primatelj i uplata idu kroz `SECURITY DEFINER` funkcije, `service_role` se ne koristi.
- Okidač `cestitka_guard`: kupac ne može sam uključiti `placeno`, mijenjati tokene ni `brisanje_nakon`; funkcije baze to rade uz oznaku `cestitka.sustav`.
- `002_devet_dizajna.sql` proširuje popis dopuštenih tema na devet. **Bruno je mora pokrenuti u SQL Editoru prije nego uređivač počne spremati nove dizajne** (primjeri rade i bez nje).
- `003_duljina_poruke.sql` ograničava poruku na 320 znakova; pojedini dizajn traži manje (`najvisePoruka` u `teme.ts`, 180 do 320) i to mora provjeravati uređivač. I nju Bruno pokreće ručno.
- `004_melodija.sql` dodaje stupac `melodija` i ponovno stvara `javna_cestitka` (vraća i melodiju). Bruno je pokreće ručno; dok ne pokrene, čestitke kupaca rade bez glazbe.
- `005_placanje_i_brisanje.sql`: rok 30 dana u `potvrdi_uplatu_cestitke` (novi parametar `p_komada`), tablica `paketi`, `iskoristi_paket`, `preuzmi_cestitku` s paketom, `ocisti_istekle` i Storage pravila za brisanje fotografija bez čestitke. Na kraju ispiše `placanje_secret` za Cloudflare. Provjerena na lokalnom Postgresu 16; Bruno je pokreće ručno.
- `007_mail_kupcu.sql`: stupac `uplate.mail_poslan`, `mail_za_uplatu` (zauzme slanje i vrati podatke za mail) i `mail_nije_poslan`. Mail šalje `src/lib/mail.ts` (Resend, `RESEND_API_KEY`, s `cestitka@kuverta.hr`) nakon potvrde uplate, i iz webhooka i s povratka; baza pazi da ode samo jednom. Provjerena na lokalnom Postgresu 16; Bruno je pokreće ručno.
- `006_zakljucavanje.sql`: okidač `cestitka_zakljucavanje` i Storage pravila bez zamjene ili brisanja fotografije otvorene čestitke. Provjerena na lokalnom Postgresu 16; Bruno je pokreće ručno.
- `001_cestitke.sql` je provjerena na lokalnom Postgresu 16 sa zamjenskim auth/storage shemama (plaćanje, krivi ključ, RLS između kupaca, prvo otvaranje, prijenos tajnim linkom, istek).

## Dizajn i provjera

- Mobitel je prioritet: provjeri 390 px i 1280 px, bez vodoravnog scrolla.
- Fontovi s vlastite domene (`@fontsource`, `ThemeFonts.astro`).
- Na pravom iPhoneu još ništa nije isprobano (otvaranje, zum, spremanje u galeriju). Reci Bruni što treba isprobati.

## Okruženja

- **Supabase:** projekt `bozicna-cestitka` (ref `ofnvwzpvyjztbllhuewy`, Frankfurt) u zasebnoj besplatnoj organizaciji na računu info@digitalnipartner.hr; Bruno je u njoj Developer. Claudeov Supabase konektor taj projekt ne vidi, pa Bruno migracije pokreće ručno u SQL Editoru. `001_cestitke.sql` pokrenuta 21. 11. 2026., anonimna prijava uključena.
- **Cloudflare:** Worker `bozicna-cestitka`, Workers Builds s repozitorija `brunodobric/bozicna-cestitka` (grana `main`), adresa **https://bozicna.kuverta.hr** (Custom Domain na Workeru, zona `kuverta.hr` je na istom Cloudflare računu kao Kuverta; Bruno je odabrao 22. 11. 2026., `cestitke.kuverta.hr` ostaje za kasnije druge vrste čestitki). Stara adresa https://bozicna-cestitka.bruno-dobric32.workers.dev preusmjerava na novu kad je upisan `SITE_URL` (`src/middleware.ts`), osim `/stripe/`. Varijable `SUPABASE_URL` i `SUPABASE_ANON_KEY` upisane; za plaćanje trebaju `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLACANJE_SECRET` i za probu `PLACANJE_TESTNO=da`. Node za build je u `.node-version` (Astro 7.4 traži najmanje 22.23.4).

## Stanje

Gotovo (21. 11. 2026.): koraci 1 do 4 plana (kostur, tri teme, javna čestitka, spremanje slike), objavljeno na workers.dev.
Gotovo (22. 11. 2026.): božićna početna, devet dizajna čestitki, čestitka kao jedna slika u kuverti, na ekranu i u galeriji.

Gotovo (22. 11. 2026.): glazba u čestitkama (devet melodija, javno dobro).
Gotovo (22. 11. 2026.): fotografija kupca kao druga kartica iza čestitke. Uređivač (korak 5) treba ponuditi upload jedne fotografije (smanjivanje na 1600 px JPEG kao u Kuverti); kad se čestitka briše, treba obrisati i fotografiju iz bucketa.

Gotovo (22. 11. 2026.): uređivač (korak 5): `/napravi`, spremanje s anonimnom prijavom, fotografija, pregled s kuvertom. Lokalno provjeren s lažnim Supabaseom; na pravom još nije isproban. **Treba migracije 002, 003 i 004** (insert šalje stupac `melodija`).

Gotovo (22. 11. 2026.): migracije 002, 003 i 004 pokrenute; uređivač spojen.
Gotovo (22. 11. 2026.): plaćanje preko Stripea (jedna, paket 5, paket 10), rok 30 dana, dnevno brisanje, tajni link za drugi uređaj. Lokalno provjereno s lažnim Supabaseom; Stripe nije isproban.

Gotovo (22. 11. 2026.): migracija 005 pokrenuta, Stripe ključevi i webhook upisani, plaćanje na našoj stranici spojeno.

Gotovo (22. 11. 2026.): migracija 006 pokrenuta, zaključavanje spojeno.

Gotovo (22. 11. 2026.): domena bozicna.kuverta.hr spojena (`SITE_URL` i webhook upisani), mail kupcu (migracija 007 i `RESEND_API_KEY` upisani), božićna ikonica.

**Otvoreno / čeka Brunu:** proba plaćanja testnom karticom, isključiti suvišne načine plaćanja u Stripeu (MB WAY, Swish...), proba maila kupcu (stiže li s cestitka@kuverta.hr), proba zvuka na iPhoneu (prekidač za tihi način gasi zvuk), CAPTCHA (Turnstile) u Supabase Authu, odluke iz odjeljka 9 (ime, obavijest kupcu), fiskalizacija, proba na pravom iPhoneu i Androidu.
