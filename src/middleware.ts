import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { env } from "cloudflare:workers";

// Preuzeto iz Kuverte (src/middleware.ts), bez praćenja izvora posjeta.

export const onRequest = defineMiddleware(async (context, next) => {
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

  const response = await next();

  // Sigurnosna zaglavlja. Kopiramo odgovor jer njegova zaglavlja mogu biti nepromjenjiva.
  const res = new Response(response.body, response);
  // Stripeova polja za karticu (Stripe.js i njegovi okviri) samo na stranici plaćanja.
  const stripe = path.startsWith("/napravi/placanje/");
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // Rezerva "Platite na Stripeovoj stranici" šalje obrazac nama, a mi preusmjerimo na Stripe.
    "form-action 'self' https://checkout.stripe.com",
    // Astro ubacuje male inline skripte; Turnstile učitava skriptu i okvir s Cloudflarea.
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${stripe ? " https://js.stripe.com https://*.js.stripe.com" : ""}`,
    `frame-src https://challenges.cloudflare.com${stripe ? " https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com" : ""}`,
    `connect-src 'self' https://challenges.cloudflare.com ${SUPABASE_URL}${stripe ? " https://api.stripe.com https://merchant-ui-api.stripe.com https://*.stripe.com" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: za sliku čestitke nacrtanu na canvas (Spremi kao sliku); Supabase za slike iz Storagea.
    `img-src 'self' data: blob: ${SUPABASE_URL}${stripe ? " https://*.stripe.com" : ""}`,
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
