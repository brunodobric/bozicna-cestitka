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
- `src/pages/primjer/[tema].astro`: primjer svake teme, radi bez baze.
- `src/components/Envelope.astro`, `EnvelopeHead.astro`: kuverta iz Kuverte; CSS u `src/styles/kuverta.css` (doslovno iz Kuvertinog `invitation.css`).
- `src/components/Karta.astro` + `src/scripts/spremi.ts`: čestitka i "Spremi kao sliku" (crtanje na canvas). **Promjena rasporeda kartice traži istu promjenu u `spremi.ts`.**
- `src/lib/teme.ts` + `src/styles/teme.css`: teme `klasicna`, `zimska`, `moderna` (ključevi su u bazi, ne mijenjati).
- `src/middleware.ts`: Supabase klijent po zahtjevu, CSP, `noindex` i `no-store` na `/c/`, `/napravi`, `/uredi`.

## Baza

- Migracije su u `supabase/migrations/NNN_ime.sql`. Nikad ne pretpostavljaj da je migracija pokrenuta.
- Sigurnost je u bazi: RLS na tablicama, primatelj i uplata idu kroz `SECURITY DEFINER` funkcije, `service_role` se ne koristi.
- Okidač `cestitka_guard`: kupac ne može sam uključiti `placeno`, mijenjati tokene ni `brisanje_nakon`; funkcije baze to rade uz oznaku `cestitka.sustav`.
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

**Otvoreno / čeka Brunu:** CAPTCHA (Turnstile) u Supabase Authu, `placanje_secret` (korak 7), odluke iz odjeljka 9 (cijena, trajanje čestitke, ime i domena, obavijest kupcu), proba na pravom iPhoneu i Androidu.
