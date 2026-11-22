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
- `src/scripts/cestitka.ts`: **čestitka je jedna slika**. Crta se na canvas (ilustracija, po želji fotografija, pa naslov, poruka i potpis koji se smanjuju dok ne stanu u okvir). Ista slika ide na karticu u kuverti, na ekran i u "Spremi kao sliku". Promjena ilustracije traži provjeru okvira za tekst u `teme.ts`.
- `src/components/Envelope.astro`, `EnvelopeHead.astro`: kuverta iz Kuverte; CSS u `src/styles/kuverta.css` (doslovno iz Kuvertinog `invitation.css`), dopune u `src/styles/cestitka.css` (tekstura, pečat, grančica, čestitka koja izlazi iz kuverte i dolazi na svoje mjesto).
- `src/components/Karta.astro`: gotova čestitka (`<img>`) i gumbi.
- `public/primjeri/<tema>.jpg`: sličice za početnu. Nakon promjene dizajna treba ih ponovno snimiti (snimka elementa `#karta` na `/primjer/<tema>`).
- U razvoju `/primjer/<tema>?proba=dugo` i `?proba=foto` pokazuju dugu poruku i čestitku s fotografijom.
- `src/middleware.ts`: Supabase klijent po zahtjevu, CSP, `noindex` i `no-store` na `/c/`, `/napravi`, `/uredi`.

## Baza

- Migracije su u `supabase/migrations/NNN_ime.sql`. Nikad ne pretpostavljaj da je migracija pokrenuta.
- Sigurnost je u bazi: RLS na tablicama, primatelj i uplata idu kroz `SECURITY DEFINER` funkcije, `service_role` se ne koristi.
- Okidač `cestitka_guard`: kupac ne može sam uključiti `placeno`, mijenjati tokene ni `brisanje_nakon`; funkcije baze to rade uz oznaku `cestitka.sustav`.
- `002_devet_dizajna.sql` proširuje popis dopuštenih tema na devet. **Bruno je mora pokrenuti u SQL Editoru prije nego uređivač počne spremati nove dizajne** (primjeri rade i bez nje).
- `003_duljina_poruke.sql` ograničava poruku na 320 znakova; pojedini dizajn traži manje (`najvisePoruka` u `teme.ts`, 180 do 320) i to mora provjeravati uređivač. I nju Bruno pokreće ručno.
- `001_cestitke.sql` je provjerena na lokalnom Postgresu 16 sa zamjenskim auth/storage shemama (plaćanje, krivi ključ, RLS između kupaca, prvo otvaranje, prijenos tajnim linkom, istek).

## Dizajn i provjera

- Mobitel je prioritet: provjeri 390 px i 1280 px, bez vodoravnog scrolla.
- Fontovi s vlastite domene (`@fontsource`, `ThemeFonts.astro`).
- Na pravom iPhoneu još ništa nije isprobano (otvaranje, zum, spremanje u galeriju). Reci Bruni što treba isprobati.

## Okruženja

- **Supabase:** projekt `bozicna-cestitka` (ref `ofnvwzpvyjztbllhuewy`, Frankfurt) u zasebnoj besplatnoj organizaciji na računu info@digitalnipartner.hr; Bruno je u njoj Developer. Claudeov Supabase konektor taj projekt ne vidi, pa Bruno migracije pokreće ručno u SQL Editoru. `001_cestitke.sql` pokrenuta 21. 11. 2026., anonimna prijava uključena.
- **Cloudflare:** Worker `bozicna-cestitka`, Workers Builds s repozitorija `brunodobric/bozicna-cestitka` (grana `main`), adresa https://bozicna-cestitka.bruno-dobric32.workers.dev. Varijable `SUPABASE_URL` i `SUPABASE_ANON_KEY` upisane. Node za build je u `.node-version` (Astro 7.4 traži najmanje 22.23.4).

## Stanje

Gotovo (21. 11. 2026.): koraci 1 do 4 plana (kostur, tri teme, javna čestitka, spremanje slike), objavljeno na workers.dev.
Gotovo (22. 11. 2026.): božićna početna, devet dizajna čestitki, čestitka kao jedna slika u kuverti, na ekranu i u galeriji.

**Otvoreno / čeka Brunu:** migracije `002_devet_dizajna.sql` i `003_duljina_poruke.sql`, CAPTCHA (Turnstile) u Supabase Authu, `placanje_secret` (korak 7), odluke iz odjeljka 9 (cijena, trajanje čestitke, ime i domena, obavijest kupcu), proba na pravom iPhoneu i Androidu.
