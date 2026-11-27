import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { env } from "cloudflare:workers";
import { ROBOT, siteOrigin } from "./lib/seo";
import { metaPiksel, PIKSEL_CSP } from "./lib/piksel";
import { brojiUlazak, izvorUlaska } from "./lib/izvor";

// Stara adresa na workers.dev. Kad je upisan SITE_URL (https://bozicna.kuverta.hr), posjeti se preusmjeravaju
// na pravu domenu. Webhook ostaje na staroj adresi dok se u Stripeu ne promijeni, a pregledi grana
// (<grana>-bozicna-cestitka...workers.dev) ostaju gdje jesu.
const STARA_ADRESA = "bozicna-cestitka.bruno-dobric32.workers.dev";

// Preuzeto iz Kuverte (src/middleware.ts). Posjete se broje po izvoru (src/lib/izvor.ts, migracija 009).

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  if (
    url.hostname === STARA_ADRESA &&
    (request.method === "GET" || request.method === "HEAD") &&
    !url.pathname.startsWith("/stripe/")
  ) {
    const nova = siteOrigin(url);
    if (nova !== url.origin)
      return Response.redirect(nova + url.pathname + url.search, 302);
  }
  const vars = env as unknown as Record<string, unknown>;
  // Uzimamo samo adresu projekta (https://xxxx.supabase.co), pa ne smeta ako je zalijepljen
  // i nastavak poput /rest/v1/ ili kosa crta na kraju.
  const rawUrl =
    typeof vars.SUPABASE_URL === "string" ? vars.SUPABASE_URL.trim() : "";
  let SUPABASE_URL = "";
  try {
    SUPABASE_URL = rawUrl ? new URL(rawUrl).origin : "";
  } catch {
    SUPABASE_URL = "";
  }
  const SUPABASE_ANON_KEY =
    typeof vars.SUPABASE_ANON_KEY === "string"
      ? vars.SUPABASE_ANON_KEY.trim()
      : "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [
      !SUPABASE_URL && "SUPABASE_URL",
      !SUPABASE_ANON_KEY && "SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    return new Response(`Aplikacija nije postavljena: nedostaje ${missing}.`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(
          context.request.headers.get("Cookie") ?? "",
        ).flatMap((c) =>
          c.value === undefined ? [] : [{ name: c.name, value: c.value }],
        );
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          // Preglednik ne treba čitati sesiju (sve ide preko servera), pa je kolačić httpOnly.
          context.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
          });
        }
      },
    },
  });

  context.locals.supabase = supabase;
  context.locals.supabaseUrl = SUPABASE_URL;
  context.locals.user = null;

  const path = context.url.pathname;
  // Javne stranice (čestitka za primatelja, primjeri tema) ne trebaju provjeru prijave.
  const isPublic =
    path.startsWith("/c/") ||
    path.startsWith("/primjer/") ||
    path.startsWith("/stripe/");
  // Bez kolačića sesije nema što provjeravati (posjetitelj se još nije prijavio, ni anonimno).
  const imaSesiju = /(^|;\s*)sb-[^=]*-auth-token/.test(
    context.request.headers.get("Cookie") ?? "",
  );
  if (!isPublic && imaSesiju) {
    const { data } = await supabase.auth.getUser();
    context.locals.user = data.user ?? null;
  }

  // Ulazak na stranicu (s oznakom utm, s vanjske stranice ili upisanom adresom) broji se po danu i izvoru,
  // bez kolačića. Roboti, pregledi poveznica i prefetch se ne broje. Izvor ide i u stranicu (Base.astro),
  // da poveznice do uređivača ponesu izvor i da se vidi otkud su kupnje.
  context.locals.izvor = null;
  const zaglavlja = request.headers;
  const dest = zaglavlja.get("Sec-Fetch-Dest");
  if (
    request.method === "GET" &&
    brojiUlazak(path) &&
    (!dest || dest === "document") &&
    !/prefetch|prerender/i.test(zaglavlja.get("Sec-Purpose") ?? zaglavlja.get("Purpose") ?? "") &&
    !ROBOT.test(zaglavlja.get("User-Agent") ?? "")
  ) {
    const izvor = izvorUlaska(url, zaglavlja.get("Referer"));
    if (izvor) {
      context.locals.izvor = izvor;
      const posjet = Promise.resolve(supabase
        .rpc("zabiljezi_posjet", { p_izvor: izvor.izvor, p_medij: izvor.medij, p_kampanja: izvor.kampanja, p_oglas: izvor.oglas })
        .then(({ error }) => {
          if (error) console.error("zabiljezi_posjet", error.message);
        }));
      const cf = (context.locals as { cfContext?: { waitUntil(p: Promise<unknown>): void } }).cfContext;
      if (cf) cf.waitUntil(posjet);
      else await posjet;
    }
  }

  const response = await next();

  // Sigurnosna zaglavlja. Kopiramo odgovor jer njegova zaglavlja mogu biti nepromjenjiva.
  const res = new Response(response.body, response);
  // Stripeova polja za karticu (Stripe.js i njegovi okviri) samo na stranici plaćanja.
  const stripe = path.startsWith("/napravi/placanje/");
  // Meta piksel (samo kad je upisan META_PIXEL_ID; učitava se tek nakon pristanka na kolačiće).
  const fb = metaPiksel() !== "";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // Rezerva "Platite na Stripeovoj stranici" šalje obrazac nama, a mi preusmjerimo na Stripe.
    "form-action 'self' https://checkout.stripe.com",
    // Astro ubacuje male inline skripte; Turnstile učitava skriptu i okvir s Cloudflarea.
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${stripe ? " https://js.stripe.com https://*.js.stripe.com" : ""}${fb ? ` ${PIKSEL_CSP.script}` : ""}`,
    `frame-src https://challenges.cloudflare.com${stripe ? " https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com" : ""}`,
    `connect-src 'self' https://challenges.cloudflare.com ${SUPABASE_URL}${stripe ? " https://api.stripe.com https://merchant-ui-api.stripe.com https://*.stripe.com" : ""}${fb ? ` ${PIKSEL_CSP.connect}` : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: za sliku čestitke nacrtanu na canvas (Spremi kao sliku); Supabase za slike iz Storagea.
    `img-src 'self' data: blob: ${SUPABASE_URL}${stripe ? " https://*.stripe.com" : ""}${fb ? ` ${PIKSEL_CSP.img}` : ""}`,
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    `camera=(), microphone=(), geolocation=(), payment=${stripe ? '(self "https://js.stripe.com")' : "()"}`,
  );
  res.headers.set("Strict-Transport-Security", "max-age=31536000");
  // Čestitke ne smiju u tražilice (imena, osobne poruke), a ni u predmemoriju između korisnika.
  if (
    path.startsWith("/c/") ||
    path.startsWith("/napravi") ||
    path.startsWith("/uredi")
  ) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "private, no-store");
  } else if (context.url.hostname.endsWith(".workers.dev")) {
    res.headers.set("X-Robots-Tag", "noindex");
  }
  return res;
});
