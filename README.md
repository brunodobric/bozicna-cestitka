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
3. **Cloudflare Worker** `bozicna-cestitka`: Variables and Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, kasnije `SITE_URL`, `TURNSTILE_*`, Stripe i Resend.
4. Workers Builds: poveži repozitorij, build `npm run build`, deploy `npx wrangler deploy`.

## Plan

`docs/PRIJENOS-BOZICNA-CESTITKA.md`, odjeljak 8. Prototip otvaranja je u `prototip/`.
