// Naplata čestitke preko Stripe Checkouta (polja za karticu na našoj stranici), bez Stripe biblioteke: fetch i Web Crypto.
// Prema Kuvertinom src/lib/placanje.ts; umjesto usluga u metapodacima ide cestitka_id.
//
// Varijable u Cloudflareu (Worker → Settings → Variables and Secrets):
//   STRIPE_SECRET_KEY      sk_test_... ili sk_live_...
//   STRIPE_WEBHOOK_SECRET  whsec_... (Stripe → Developers → Webhooks, adresa /stripe/webhook)
//   STRIPE_PUBLISHABLE_KEY pk_test_... ili pk_live_... (polja za karticu na našoj stranici; bez njega Stripeova stranica)
//   PLACANJE_SECRET        tajna iz private_settings (ispiše je migracija 005)
//   PLACANJE_TESTNO        "da" dopušta plaćanje testnim ključem. Bez toga testni ključ ne radi,
//                          da nitko ne dobije čestitku testnom karticom.
import { env } from "cloudflare:workers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ponudaZaKomada, type Ponuda } from "./cijena";
import { posaljiMailKupcu } from "./mail";
import { izdajRacun, stornirajRacun } from "./fiskalizacija";
import { javiKupnjuMeti } from "./metaKonverzije";

const read = (name: string) => {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === "string" ? v.trim() : "";
};

export const tajnaPlacanja = () => read("PLACANJE_SECRET");

// Može li se sada platiti. Bez ključeva gumb za plaćanje se ne prikazuje.
export function placanjeDostupno(): boolean {
  const key = read("STRIPE_SECRET_KEY");
  if (!key || !tajnaPlacanja()) return false;
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return true;
  return (
    (key.startsWith("sk_test_") || key.startsWith("rk_test_")) &&
    read("PLACANJE_TESTNO").toLowerCase() === "da"
  );
}

export const testnoPlacanje = () =>
  /^(sk|rk)_test_/.test(read("STRIPE_SECRET_KEY"));

// Verzija Stripe API-ja je zakucana (ista kao u Kuverti), da se ponašanje ne mijenja s novim izdanjima.
const STRIPE_VERSION = "2026-10-28.endive";

async function stripe(
  path: string,
  body?: URLSearchParams,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${read("STRIPE_SECRET_KEY")}`,
      "stripe-version": STRIPE_VERSION,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (data.error as { message?: string } | undefined)?.message ??
      `HTTP ${res.status}`;
    throw new Error(`Stripe: ${msg}`);
  }
  return data;
}

// Zajednički podaci Checkout sesije: stavka, metapodaci za otključavanje i rok od sat vremena.
function osnovaSesije(
  user: User,
  cestitkaId: string,
  p: Ponuda,
  meta: Record<string, string>,
): URLSearchParams {
  const b = new URLSearchParams();
  b.set("mode", "payment");
  b.set("client_reference_id", cestitkaId);
  b.set("line_items[0][quantity]", "1");
  b.set("line_items[0][price_data][currency]", "eur");
  b.set("line_items[0][price_data][unit_amount]", String(p.centi));
  b.set("line_items[0][price_data][product_data][name]", p.naziv);
  b.set(
    "line_items[0][price_data][product_data][description]",
    p.komada > 1
      ? `Prva čestitka se otključa odmah, a preostale (${p.komada - 1}) koristite na istom uređaju. Svaka vrijedi tri mjeseca.`
      : "Čestitka vrijedi tri mjeseca od uplate.",
  );
  b.set("metadata[cestitka_id]", cestitkaId);
  b.set("metadata[owner_id]", user.id);
  b.set("metadata[komada]", String(p.komada));
  b.set("payment_intent_data[metadata][cestitka_id]", cestitkaId);
  // Meta Conversions API (lib/metaKonverzije.ts): samo uz pristanak na kolačiće.
  for (const [k, v] of Object.entries(meta)) b.set(`metadata[${k}]`, v);
  // Sesija vrijedi sat vremena (Stripe inače drži 24 sata).
  b.set("expires_at", String(Math.floor(Date.now() / 1000) + 60 * 60));
  return b;
}

const adresaGotovo = (origin: string, cestitkaId: string) =>
  `${origin}/napravi/gotovo/${cestitkaId}?session_id={CHECKOUT_SESSION_ID}`;

// Rezerva: Stripeova stranica plaćanja (kad se polja na našoj stranici ne učitaju). Vraća adresu za preusmjeravanje.
export async function otvoriNaplatu(
  user: User,
  cestitkaId: string,
  p: Ponuda,
  origin: string,
  meta: Record<string, string> = {},
): Promise<string> {
  const b = osnovaSesije(user, cestitkaId, p, meta);
  b.set("locale", "hr");
  b.set("success_url", adresaGotovo(origin, cestitkaId));
  b.set("cancel_url", `${origin}/napravi/placanje/${cestitkaId}`);
  const s = await stripe("checkout/sessions", b);
  if (typeof s.url !== "string")
    throw new Error("Stripe: nema adrese naplate.");
  return s.url;
}

// Plaćanje na našoj stranici (Stripe Payment Element uz Checkout sesiju, ui_mode "elements", kao u Kuverti).
// Vraća client_secret za Stripe.js. Nakon plaćanja Stripe vraća kupca na /napravi/gotovo/<id>.
export async function otvoriUgradenuNaplatu(
  user: User,
  cestitkaId: string,
  p: Ponuda,
  origin: string,
  meta: Record<string, string> = {},
): Promise<string> {
  const b = osnovaSesije(user, cestitkaId, p, meta);
  b.set("ui_mode", "elements");
  b.set("return_url", adresaGotovo(origin, cestitkaId));
  const s = await stripe("checkout/sessions", b);
  if (typeof s.client_secret !== "string")
    throw new Error("Stripe: nema client_secret.");
  return s.client_secret;
}

// Javni ključ za Stripe.js (STRIPE_PUBLISHABLE_KEY). Vraća ga samo ako je istog načina (test/live) kao tajni ključ.
export function stripeJavniKljuc(): string {
  const pk = read("STRIPE_PUBLISHABLE_KEY");
  const sk = read("STRIPE_SECRET_KEY");
  if (pk.startsWith("pk_test_") && /^(sk|rk)_test_/.test(sk)) return pk;
  if (pk.startsWith("pk_live_") && /^(sk|rk)_live_/.test(sk)) return pk;
  return "";
}

type Session = {
  id: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  livemode?: boolean;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Upisuje plaćenu sesiju i otključava čestitku. Isto se smije pozvati više puta (webhook i povratak).
async function potvrdi(supabase: SupabaseClient, s: Session): Promise<boolean> {
  if (s.payment_status !== "paid") return false;
  const cestitka = s.metadata?.cestitka_id ?? "";
  const p = ponudaZaKomada(s.metadata?.komada ?? "1");
  if (!UUID.test(cestitka) || !p) return false;
  const { error } = await supabase.rpc("potvrdi_uplatu_cestitke", {
    p_secret: tajnaPlacanja(),
    p_session_id: s.id,
    p_cestitka: cestitka,
    p_iznos_centi: s.amount_total ?? 0,
    p_valuta: s.currency ?? "eur",
    p_email: s.customer_details?.email ?? "",
    p_testni: s.livemode === false,
    p_komada: p.komada,
  });
  if (error) throw new Error(`Baza: ${error.message}`);
  return true;
}

// Račun za plaćenu sesiju (fiskalizacija, kao u Kuverti). Baca ako servis nije dostupan.
async function fiskaliziraj(s: Session): Promise<"izdan" | "preskoceno" | "odbijen"> {
  if (s.payment_status !== "paid") return "preskoceno";
  const p = ponudaZaKomada(s.metadata?.komada ?? "1");
  return await izdajRacun({
    sessionId: s.id,
    iznosCenti: s.amount_total ?? 0,
    testna: s.livemode === false,
    opis: p?.naziv ?? "Božićna čestitka u kuverti",
    email: s.customer_details?.email ?? "",
    ime: s.customer_details?.name ?? "",
  });
}

// Nakon potvrde: račun, pa mail kupcu (s računom u privitku kad je izdan).
// Kad servis za račune ne odgovara, mail se ne šalje: webhook baci grešku, Stripe ga ponovi,
// a mail ode tek s računom. S povratka se greška samo zapiše, jer webhook dolazi ionako.
async function nakonUplate(supabase: SupabaseClient, s: Session, origin: string, izWebhooka: boolean): Promise<void> {
  let racun: "izdan" | "preskoceno" | "odbijen";
  try {
    racun = await fiskaliziraj(s);
  } catch (e) {
    if (izWebhooka) throw e;
    console.error("fiskalizacija (povratak)", e);
    return;
  }
  await posaljiMailKupcu(supabase, s.id, origin, racun === "izdan");
  // Kupnja Meti sa servera samo iz webhooka (povratak bi je poslao drugi put; Meta bi je ionako spojila po event_id).
  if (izWebhooka) await javiKupnjuMeti(s, origin);
}

// Povratak s naplate: sesiju provjeravamo izravno kod Stripea, pa kupac ne čeka webhook.
// Vrijedi samo za sesiju te čestitke i tog kupca.
export async function potvrdiPovratak(
  supabase: SupabaseClient,
  user: User,
  cestitkaId: string,
  sessionId: string,
  origin: string,
): Promise<boolean> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return false;
  const s = (await stripe(
    `checkout/sessions/${sessionId}`,
  )) as unknown as Session;
  if (
    s.metadata?.cestitka_id !== cestitkaId ||
    s.metadata?.owner_id !== user.id
  )
    return false;
  const ok = await potvrdi(supabase, s);
  if (ok) await nakonUplate(supabase, s, origin, false);
  return ok;
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

// Provjera potpisa Stripe webhooka (zaglavlje Stripe-Signature: t=...,v1=...).
export async function provjeriPotpis(
  payload: string,
  header: string,
  now = Date.now(),
): Promise<boolean> {
  const secret = read("STRIPE_WEBHOOK_SECRET");
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const t = parts.find(([k]) => k === "t")?.[1] ?? "";
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (
    !/^\d+$/.test(t) ||
    !sigs.length ||
    Math.abs(now / 1000 - Number(t)) > 300
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${t}.${payload}`),
    ),
  );
  return sigs.some((s) => {
    if (s.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++)
      diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

type Refund = { id: string; amount: number; status?: string };

// Povrat novca (i djelomičan): za svaki povrat te naplate izdaje se storno računa, kao u Kuverti.
// Prolazi kroz sve povrate naplate, pa ponovljen događaj ništa ne udvostručuje.
async function stornirajPovrate(paymentIntent: string): Promise<void> {
  const pi = encodeURIComponent(paymentIntent);
  const sesije = (await stripe(`checkout/sessions?payment_intent=${pi}&limit=1`)) as unknown as { data?: Session[] };
  const s = sesije.data?.[0];
  // Stripe račun dijeli Kuverta; njezine uplate (bez cestitka_id) ovdje se ne diraju.
  if (!s?.id || !UUID.test(s.metadata?.cestitka_id ?? "")) return;
  await fiskaliziraj(s);
  const povrati = (await stripe(`refunds?payment_intent=${pi}&limit=100`)) as unknown as { data?: Refund[] };
  for (const r of povrati.data ?? []) {
    if (r.status !== "succeeded" && r.status !== "pending") continue;
    await stornirajRacun({ sessionId: s.id, refundId: r.id, iznosCenti: r.amount, testna: s.livemode === false });
  }
}

const idNaplate = (v: unknown) => (typeof v === "string" && /^pi_[A-Za-z0-9]+$/.test(v) ? v : "");

// Događaj iz webhooka: dovršena (ili naknadno potvrđena) naplata te povrati novca.
export async function obradiDogadaj(
  supabase: SupabaseClient,
  event: { type?: string; data?: { object?: unknown } },
  origin: string,
): Promise<void> {
  if (event.type === "charge.refunded" || event.type === "refund.created" || event.type === "refund.updated") {
    const pi = idNaplate((event.data?.object as { payment_intent?: unknown } | undefined)?.payment_intent);
    if (pi) await stornirajPovrate(pi);
    return;
  }
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return;
  const s = event.data?.object as Session | undefined;
  if (s?.id && (await potvrdi(supabase, s))) await nakonUplate(supabase, s, origin, true);
}
