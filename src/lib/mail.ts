// Mail kupcu nakon uplate: link za primatelja, tajni link za drugi uređaj i do kada čestitka vrijedi.
// Šalje se preko Resenda (domena kuverta.hr je potvrđena za Kuvertu), samo fetch.
//
// Varijable u Cloudflareu:
//   RESEND_API_KEY  re_... (može biti isti ključ kao u Kuverti). Bez njega se mail ne šalje.
//   MAIL_OD         neobavezno, zadano "Božićna čestitka <cestitka@kuverta.hr>"
import { env } from "cloudflare:workers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tajnaPlacanja } from "./placanje";
import { SITE_NAME } from "./seo";

const read = (name: string) => {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === "string" ? v.trim() : "";
};

type Podaci = {
  email: string;
  za: string;
  token: string;
  uredi_token: string;
  brisanje_nakon: string | null;
  komada: number;
};

const datum = (d: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? "");
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}.` : "";
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function sadrzajMaila(p: Podaci, origin: string) {
  const link = `${origin}/c/${p.token}`;
  const tajni = `${origin}/uredi/${p.uredi_token}`;
  const doDana = datum(p.brisanje_nakon);
  const za = p.za.trim();
  // Na kuverti piše npr. "Za baku i djeda", pa to ide u naslov kakvo jest.
  const naslov = za ? `Vaša čestitka je spremna (${za})` : "Vaša čestitka je spremna";
  const odlomci: string[] = [
    "Hvala na kupnji. Ovo je link za primatelja, pošaljite ga porukom ili mailom:",
    `@@${link}`,
    `Do prvog otvaranja poruku i ostalo možete ispraviti na istom uređaju. Ime na kuverti ostaje isto, a kad primatelj otvori čestitku, više se ne mijenja.${doDana ? ` Čestitka se može otvoriti do ${doDana}, a onda se briše zajedno s fotografijom.` : ""}`,
    "Tajni link vraća čestitku na drugi uređaj (na primjer s mobitela na računalo). Ne šaljite ga primatelju:",
    `@@${tajni}`,
  ];
  if (p.komada > 1)
    odlomci.push(
      `U paketu su vam ostale još ${p.komada - 1} ${p.komada - 1 < 5 ? "čestitke" : "čestitki"}. Iskoristite ih na istom uređaju na ${origin}/napravi. Tajni link ih prenosi zajedno s ovom čestitkom.`,
    );
  odlomci.push("Ako niste vi platili ovu čestitku, samo odgovorite na ovaj mail.");

  const text = [naslov, "", ...odlomci.map((o) => (o.startsWith("@@") ? o.slice(2) : o) + "\n")].join("\n");
  const html = `<!doctype html><html lang="hr"><body style="margin:0;background:#faf6ee;font-family:Arial,Helvetica,sans-serif;color:#143627">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<h1 style="font-size:22px;color:#a61c1c;margin:0 0 18px">${esc(naslov)}</h1>
${odlomci
  .map((o) =>
    o.startsWith("@@")
      ? `<p style="margin:0 0 18px"><a href="${esc(o.slice(2))}" style="color:#a61c1c;word-break:break-all">${esc(o.slice(2))}</a></p>`
      : `<p style="margin:0 0 10px;line-height:1.5">${esc(o)}</p>`,
  )
  .join("\n")}
<p style="margin:24px 0 0;font-size:13px;color:#6b7a70">${esc(SITE_NAME)}, ${esc(origin.replace(/^https:\/\//, ""))}</p>
</div></body></html>`;
  return { subject: naslov, text, html };
}

// Pošalje mail za plaćenu sesiju, najviše jednom (baza pamti mail_poslan). Greške samo zapiše u log:
// čestitka je već otključana, a kupac ima link i na stranici /napravi/gotovo.
export async function posaljiMailKupcu(
  supabase: SupabaseClient,
  sessionId: string,
  origin: string,
): Promise<void> {
  const kljuc = read("RESEND_API_KEY");
  if (!kljuc) return;
  const tajna = tajnaPlacanja();
  const { data, error } = await supabase.rpc("mail_za_uplatu", {
    p_secret: tajna,
    p_session_id: sessionId,
  });
  if (error) {
    console.error("mail: baza", error.message);
    return;
  }
  const p = ((data ?? []) as Podaci[])[0];
  if (!p || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return;
  const m = sadrzajMaila(p, origin);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${kljuc}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: read("MAIL_OD") || `${SITE_NAME} <cestitka@kuverta.hr>`,
        to: [p.email],
        subject: m.subject,
        text: m.text,
        html: m.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error("mail: slanje", e);
    await supabase.rpc("mail_nije_poslan", { p_secret: tajna, p_session_id: sessionId });
  }
}
