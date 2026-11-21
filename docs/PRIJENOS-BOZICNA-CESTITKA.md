# Božićna čestitka: prijenos iz Kuverte u novi projekt

Pripremljeno 21. 11. 2026. iz repozitorija `brunodobric/MyWeddingInvite` (grana `main`). Ovaj dokument i zip `bozicna-cestitka-paket.zip` nose u novi projekt sve što se iz Kuverte može iskoristiti. U Kuverti nije ništa promijenjeno.

## 1. Zaseban projekt ili unutar Kuverte?

**Zaseban projekt.** Razlozi:

- Kuverta je platforma za vjenčanja s pravilom "jedan račun = jedna pozivnica" u bazi. Čestitke traže suprotno: jedan kupac šalje više čestitki, bez registracije, za nekoliko eura. Ta dva modela u istoj bazi i istom kodu bi se stalno sudarala.
- Sezonski proizvod. Čestitka živi od kraja studenog do siječnja; promjene i greške u njoj ne smiju ugroziti naplatu pozivnica.
- Vlastita domena i SEO. "Digitalna božićna čestitka" je drugi upit i druga publika od "digitalna pozivnica za vjenčanje".
- Kod se ne piše ispočetka: kuverta, naplata, fiskalizacija, slanje maila, slike i sigurnosna pravila prenose se gotovi (popis je ispod).

Preporuka za postavljanje: novi GitHub repozitorij, novi Cloudflare Worker i **novi Supabase projekt** (EU regija). Isti Stripe račun i isti servis `fisk-racun` mogu se dijeliti s Kuvertom.

## 2. Što je u zipu

```
bozicna-cestitka-paket/
  prototip/otvaranje-cestitke.html    radni prototip: božićna kuverta → čestitka se zumira → "Spremi kao sliku"
  predlozak-baze/001_cestitke.sql     prijedlog sheme (tablice, RLS, funkcije, bucket za slike)
  izvor-kuverta/                      izvorne datoteke iz Kuverte, s istim putanjama kao u repozitoriju
```

Prototip se otvara izravno u pregledniku (dvoklik). Kuverta i njezina animacija u njemu su doslovno Kuvertine (isti HTML, CSS i skripta), samo s božićnim bojama, snijegom u pozadini, a nakon otvaranja čestitka se pojavi s laganim zumom. Gumb "Spremi kao sliku" crta čestitku na sliku 1080 × 1350 i na mobitelu otvara izbornik za dijeljenje (tamo "Spremi sliku" stavlja je u galeriju), a na računalu je preuzima kao PNG. Provjereno u Chromiumu na širini mobitela; na pravom iPhoneu još nije isprobano.

Iz zipa su namjerno izostavljeni: `.dev.vars`, `.env`, bilo kakvi ključevi i certifikati (npr. `FISK_CA_PEM`), slike i ilustracije Kuverte, album, raspored sjedenja i upitnik za dizajn po narudžbi. Datoteke su pretražene na Stripe, Supabase i Resend ključeve i privatne ključeve; ništa nije nađeno.

## 3. Arhitektura Kuverte ukratko

- **Astro 7 (SSR) na Cloudflare Workers**, TypeScript, ručni CSS, bez frameworka. Ulazna točka `src/worker.ts` (stranice + cron).
- **Supabase**: Postgres, prijava, Storage za slike. Sva sigurnost je u bazi: RLS na tablicama, a sve što gost radi ide kroz `SECURITY DEFINER` funkcije. `service_role` ključ se nikad ne koristi.
- `src/middleware.ts` napravi Supabase klijent po zahtjevu (kolačići sesije su httpOnly), štiti `/nadzorna`, postavlja CSP i sigurnosna zaglavlja, i stavlja `noindex` na stranice gostiju.
- **Stripe bez biblioteke** (`src/lib/placanje.ts`): fetch + Web Crypto, provjera potpisa webhooka, ugrađena naplata (Payment Element) ili Stripeova stranica.
- **Fiskalizacija** (`src/lib/fiskalizacija.ts`) zove vanjski servis `fisk-racun` (repozitorij financijski-softver), PDF računa i storno pri povratu novca.
- **E-mail** preko Resenda (`notify.ts`, `racunMail.ts`, predlošci `*Predlozak.ts`).
- **Turnstile** protiv botova, **Kolacici.astro** za pristanak, `izvor.ts` za praćenje odakle kupci dolaze.

## 4. Što preuzeti i kako ga prilagoditi

| Dio | Datoteke u `izvor-kuverta/` | Za čestitku |
|---|---|---|
| Kuverta i otvaranje | `src/components/Envelope.astro`, `EnvelopeHead.astro`, blok "kuverta pri prvom otvaranju" u `src/styles/invitation.css` (oko retka 880 do 1325), primjer teme u `themes/tema1.css` | Preuzmi doslovno. Boje se zadaju varijablama `--env-back`, `--env-front`, `--env-flap`, `--env-line`, `--env-liner`, `--env-seal`, `--env-seal-ink` (vidi prototip). Tekstovi na kartici: "Sretan Božić", "za Anu", "od Marka". Na kraju otvaranja se čestitka zumira, umjesto da se pretopi u stranicu pozivnice (dopuna je u prototipu, dva retka). |
| Prikaz pozivnice | `InvitationView.astro`, `InvitationLayout.astro`, `p/[slug].astro`, `demo/[tema].astro` | Samo kao uzor: čestitka je jedna kartica (slika, naslov, poruka, potpis), ne duga stranica. Raspored iz `InvitationLayout` (samo CSS i fontovi aktivne teme) vrijedi zadržati. |
| Teme | `src/lib/themes.ts`, `ThemeFonts.astro`, `styles/themes/` | Isti princip: tema je skup CSS varijabli i ukrasa. Za start dvije do tri božićne teme. |
| Upload slike | `src/pages/nadzorna/[id]/slike.ts`, `src/lib/images.ts`, `storage.ts`, skripta za smanjivanje slike na kraju `nadzorna/[id]/index.astro` | Preuzmi gotovo doslovno: smanjivanje u pregledniku (1600 px, JPEG), provjera stvarnog tipa po bajtovima (`sniffImage`), nasumična putanja u javnom bucketu. Za čestitku jedna slika, a bucket je `cestitke-slike`. |
| Uređivač | `src/pages/nadzorna/[id]/index.astro` | Uzor za obrazac i pregled. Za čestitku je puno jednostavniji: tema, "za", "od", poruka (do 600 znakova), slika. |
| Link i dijeljenje | `src/lib/slug.ts`, gumb "Kopiraj link" u nadzornoj | Link bez imena: `/c/<nasumični token>` (token radi baza). Uz "Kopiraj link" dodati gumb "Pošalji" (Web Share: WhatsApp, Viber, Messenger). |
| Naplata | `src/lib/placanje.ts`, `src/pages/stripe/webhook.ts`, `src/pages/nadzorna/placanje/*`, `CekaUplatu.astro`, `Cijena.astro` | Preuzmi gotovo sve. Mijenja se: umjesto `usluge` u metapodacima ide `cestitka_id`, RPC je `potvrdi_uplatu_cestitke`, ponuda je jedna (ili dvije, npr. s vlastitom slikom i bez nje). |
| Fiskalizacija | `src/lib/fiskalizacija.ts`, `nadzorna/placanje/racun.ts`, `racunMail.ts`, `racunMailPredlozak.ts` | Preuzmi doslovno, samo `izvor: 'kuverta'` postaje npr. `'cestitka'`. **Provjeri u financijski-softver** prihvaća li `fisk-racun` novi izvor i kojim nizom brojeva idu računi. Čeka isto što i Kuverta: `fisk-racun` u produkciji prije pravog Stripe ključa. |
| Cijene i propisi | `src/lib/cijene.ts`, `cjenik.ts`, `cjenik.csv.ts`, `cjenik.xml.ts`, `legal.ts`, `privatnost.astro`, `uvjeti.astro` | Isti obrazac: `CIJENE`, `BAZNE`, `NAZIVI`, cjenik za NN 132/2026. Pravni tekstovi trebaju novu verziju (druga usluga, slike trećih osoba, rok brisanja). |
| Prijava | `prijava`, `registracija`, `zaboravljena-lozinka`, `nova-lozinka`, `odjava.ts`, `middleware.ts` | Za kupca čestitke preporučujem **anonimnu prijavu** (vidi 5). Middleware se preuzima, a stranice prijave ostaju samo ako kasnije želiš "Moje čestitke" s lozinkom. |
| Mail | `notify.ts`, `racunMail.ts`, `podsjetnici.ts` (+ predlošci), `akcijaMail.ts` | Novi mail kupcu nakon uplate: link za primatelja i tajni link za uređivanje. Neobavezno: mail kupcu kad primatelj otvori čestitku. |
| Zaštita i statistika | `turnstile.ts`, `Turnstile.astro`, `Kolacici.astro`, `izvor.ts`, migracije 024/027/029 | Preuzmi doslovno ako želiš istu statistiku izvora i Meta Pixel. |
| SEO | `seo.ts`, `robots.txt.ts`, `sitemap.xml.ts`, `llms.txt.ts`, `404.astro` | Preuzmi i prepiši sadržaj. Stranice čestitki (`/c/…`) uvijek `noindex`. |
| Konfiguracija | `package.json`, `astro.config.mjs`, `tsconfig.json`, `wrangler.jsonc`, `.dev.vars.example`, `public/_headers` | Preuzmi; promijeni ime Workera, makni R2 binding albuma. |
| Baza | `supabase/schema.sql` i odabrane migracije | Ne pokretati u novom projektu. Služi kao uzor; nova shema je `predlozak-baze/001_cestitke.sql`. |

`CLAUDE.md` i `README.md` Kuverte su u zipu radi konteksta (pravila pisanja, dizajna, postavljanja Stripea i fiskalizacije). Novi projekt treba svoj `CLAUDE.md`; pravila pisanja i rada mogu se prepisati.

## 5. Tok za kupca i primatelja

**Kupac** (bez registracije):
1. Otvori stranicu, klikne "Napravi čestitku". Supabase ga tiho prijavi anonimno (Turnstile u pozadini), pa baza zna čija je čestitka.
2. Odabere temu, upiše "za koga", poruku i potpis, po želji doda sliku. Pregled uživo, uključujući otvaranje kuverte.
3. Plati karticom (Stripe, Apple Pay i Google Pay). Upisuje samo e-mail.
4. Dobije link za primatelja, gumbe "Kopiraj" i "Pošalji", te mail s računom, linkom za primatelja i tajnim linkom za kasnije uređivanje.

**Primatelj**:
1. Otvori link `/c/<token>` (u pregledu poveznice na WhatsAppu vidi opću božićnu sliku, bez osobnih podataka).
2. Vidi kuvertu na božićnoj pozadini, dodirne je, pečat pukne, kartica izađe i čestitka se zumira tako da se može čitati.
3. "Spremi kao sliku" → izbornik za dijeljenje → "Spremi sliku" u galeriju.

Zašto anonimna prijava: čestitka je mala, impulzivna kupnja i registracija s lozinkom bi otjerala dio kupaca. Anonimni korisnik u Supabaseu ima pravi `auth.uid()`, pa sva Kuvertina RLS pravila rade bez izmjena. Ako kupac promijeni uređaj, tajni link iz maila prebacuje čestitku na novi uređaj (funkcija `preuzmi_cestitku`).

## 6. Prijedlog modela podataka

Potpuni SQL je u `predlozak-baze/001_cestitke.sql`. Ukratko:

- `cestitke`: `id`, `owner_id`, `token` (javni link), `uredi_token` (tajni link za uređivanje), `tema`, `za`, `od`, `naslov`, `poruka` (do 600 znakova), `slika` (putanja u bucketu), `email_kupca`, `placeno`, `prvo_otvaranje`, `brisanje_nakon`.
- `uplate`: kao u Kuverti, ali s `cestitka_id` umjesto popisa usluga.
- `private_settings`: tajna `placanje_secret` (ista kao u Kuverti).
- Funkcije: `potvrdi_uplatu_cestitke` (Worker nakon Stripea, s tajnom), `javna_cestitka` (primatelj, samo plaćene, bilježi prvo otvaranje, kupac koji otvara svoj link se ne broji), `preuzmi_cestitku` (tajni link za uređivanje).
- Okidač `cestitka_guard`: kupac ne može sam uključiti `placeno` ni promijeniti tokene.
- Bucket `cestitke-slike`: javan, do 5 MB, samo JPEG, PNG i WebP, upload i brisanje samo vlasnik.

Shema je provjerena na lokalnom Postgresu 16 sa zamjenskim auth i storage shemama: prijavljeni kupac ne može sam označiti čestitku plaćenom, kriva tajna odbija uplatu, primatelj vidi samo plaćenu čestitku, kupčevo otvaranje se ne broji, a prijenos na drugi uređaj radi. Na pravom Supabaseu još nije pokrenuta.

## 7. Spremanje čestitke kao slike

U prototipu se čestitka crta izravno na canvas (pozadina, okvir, slika, tekst), a ne "fotografira" HTML alatima poput html2canvas, jer su oni na iOS Safariju nepouzdani s fontovima i slikama. Zato je raspored čestitke fiksan i jednostavan. Pravila:

- Fontove poslužiti s vlastite domene (`@fontsource`, kao u Kuverti) i prije crtanja pričekati `document.fonts.ready`.
- Slika iz Supabase Storagea mora imati `crossorigin="anonymous"`, inače canvas ne smije izvesti PNG. Supabase javni bucket to dopušta.
- iPhone i Android: `navigator.share({ files: [...] })`, gdje korisnik bira "Spremi sliku". Računalo: preuzimanje PNG-a.
- U CSP-u novog projekta: `img-src` mora uključivati Supabase adresu i `blob:` (Kuvertin middleware to već ima).

## 8. Plan rada u novom projektu

1. **Postavljanje**: novi repozitorij, Cloudflare Worker, Supabase projekt (EU). Kopiraj konfiguraciju iz `izvor-kuverta/`, promijeni ime Workera i makni R2.
2. **Baza**: pokreni `001_cestitke.sql`, uključi anonimnu prijavu i CAPTCHA (Turnstile) u Supabase Authu, upiši `placanje_secret`.
3. **Kostur**: `middleware.ts` (bez praćenja izvora za početak), `Base.astro`, početna stranica s jednim gumbom.
4. **Javna čestitka** `/c/[token]`: Envelope + EnvelopeHead + kartica iz prototipa, božićne teme, `noindex`.
5. **Uređivač** `/napravi`: anonimna prijava, obrazac, upload slike (iz `slike.ts`), pregled s kuvertom.
6. **Spremanje slike**: canvas i dijeljenje iz prototipa.
7. **Naplata**: `placanje.ts` s `cestitka_id`, webhook, stranica "hvala" s linkom i gumbom "Pošalji".
8. **Mail kupcu** (Resend, nova domena za slanje) i **fiskalizacija** (`izvor: 'cestitka'`, nakon provjere u `fisk-racun`).
9. **Pravno**: uvjeti, privatnost, cjenik (`/cjenik.csv`, `/cjenik.xml`), podaci operatera iz `legal.ts`.
10. **Čišćenje**: cron koji briše čestitke i slike nakon `brisanje_nakon` (npr. sredina siječnja).
11. **Provjera na pravom iPhoneu i Androidu**: otvaranje kuverte, zum, spremanje u galeriju, Apple Pay.
12. **SEO i objava**: stranica za "digitalna božićna čestitka", OG slika, Instagram (predlošci karusela i reelova iz Kuverte se mogu prebojati).

Kasnije, ako bude potražnje: slanje u zakazano vrijeme (npr. na Badnjak u 18 h, cron već postoji), više čestitki odjednom (tvrtke za zaposlenike i klijente), novogodišnja i uskrsna varijanta istog koda.

## 9. Odluke koje su tvoje

- **Cijena** i hoće li biti jedna ili dvije razine (npr. s vlastitom slikom ili bez nje). Stripe za europske kartice uzima oko 1,5 % + 0,25 € po uplati, pa se kod niske cijene fiksni dio osjeti.
- **Koliko dugo čestitka živi** (prijedlog: do sredine siječnja ili 60 dana).
- **Ime i domena** novog proizvoda.
- Hoće li kupac dobiti obavijest kad primatelj otvori čestitku.

## 10. Usput primijećeno u Kuverti (nije mijenjano)

Okidač `invitation_guard` (i `album_guard`, `seating_plan_guard`) vraća stupac `allowed` na staru vrijednost kad god je korisnik prijavljen. Stranica `/nadzorna/placanje/hvala` zove `potvrdi_uplatu` s kupčevom sesijom, pa to otključavanje vjerojatno ne prođe, a uslugu stvarno otključa webhook nekoliko sekundi kasnije. Na produkciji nije provjereno. U shemi za čestitke to je riješeno oznakom `cestitka.sustav` koju postavlja sama funkcija za uplatu. Ako želiš, to se u Kuverti može popraviti u zasebnoj niti.
