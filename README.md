# Božićna čestitka

Digitalna božićna čestitka u kuverti. Astro 7 na Cloudflare Workers, Supabase (EU).

## Lokalno

```
npm install
cp .dev.vars.example .dev.vars   # upiši SUPABASE_URL i SUPABASE_ANON_KEY
npm run dev
```

Bez baze rade početna i primjeri: `/primjer/klasicna`, `/primjer/zimska`, `/primjer/moderna`.

## Postavljanje (jednom)

1. **Supabase** (novi projekt, EU): u SQL Editoru pokreni `supabase/migrations/001_cestitke.sql`, zatim upiši tajnu:
   `insert into public.private_settings (key, value) values ('placanje_secret', '<dugi-nasumični-niz>');`
2. Supabase → Authentication → Sign In / Providers: uključi **Allow anonymous sign-ins**; pod Attack Protection uključi **CAPTCHA (Turnstile)**.
3. **Cloudflare Worker** `bozicna-cestitka`: Variables and Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL` (`https://bozicna.kuverta.hr`), kasnije `TURNSTILE_*`, Stripe i Resend.
4. **Stripe** (plaćanje): u Supabaseu pokreni `005_placanje_i_brisanje.sql` i prepiši ispisanu tajnu u Cloudflare kao `PLACANJE_SECRET`. Stripe → Developers → Webhooks: adresa `https://<domena>/stripe/webhook`, događaji `checkout.session.completed` i `checkout.session.async_payment_succeeded`. U Cloudflare upiši `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET` (kao Secret) i `STRIPE_PUBLISHABLE_KEY` (`pk_...`, može kao obična varijabla; bez njega se plaća na Stripeovoj stranici). S testnim ključem dodaj i `PLACANJE_TESTNO=da`, a makni ga kad prijeđeš na pravi ključ.
5. **Mail kupcu** (Resend): u Supabaseu pokreni `007_mail_kupcu.sql`, a u Cloudflare upiši `RESEND_API_KEY` (Secret). Šalje se s `cestitka@kuverta.hr` (domena je u Resendu potvrđena za Kuvertu); druga adresa ide u `MAIL_OD`. Mail ide jednom po uplati, s linkom za primatelja, tajnim linkom i rokom.
7. **CAPTCHA** (Turnstile na anonimnoj prijavi): Cloudflare → Turnstile → Add widget (ili postojećem widgetu dodaj hostname `bozicna.kuverta.hr`), način Managed. Javni ključ upiši u Cloudflare Worker kao `TURNSTILE_SITE_KEY`, pričekaj objavu, pa tek onda u Supabaseu: Authentication → Attack Protection → Enable CAPTCHA protection, provider Turnstile, tajni ključ widgeta. Obrnutim redom kupci ne bi mogli spremiti čestitku.
5. Workers Builds: poveži repozitorij, build `npm run build`, deploy `npx wrangler deploy`.

## Plan

`docs/PRIJENOS-BOZICNA-CESTITKA.md`, odjeljak 8. Prototip otvaranja je u `prototip/`.
