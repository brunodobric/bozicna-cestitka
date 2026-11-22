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
import { pdfRacuna } from "./fiskalizacija";

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

// Boje stranice: noćna zelena pozadina, krem kartica sa zlatnim rubom, crveni naslov i gumbi.
const BOJA = {
  noc: "#143627",
  nocTamna: "#0b1d16",
  papir: "#fffdf6",
  rub: "#e2d9c4",
  zlato: "#d4af37",
  crvena: "#a61c1c",
  tekst: "#143627",
  blijedo: "#6b7a70",
  svijetlo: "#b9c7bd",
};

export function sadrzajMaila(p: Podaci, origin: string, sRacunom = false) {
  const link = `${origin}/c/${p.token}`;
  const tajni = `${origin}/uredi/${p.uredi_token}`;
  const doDana = datum(p.brisanje_nakon);
  const za = p.za.trim();
  const domena = origin.replace(/^https:\/\//, "");
  // Na kuverti piše npr. "Za baku i djeda", pa to ide u naslov kakvo jest.
  const naslov = za ? `Vaša čestitka je spremna (${za})` : "Vaša čestitka je spremna";
  const ostalo = p.komada - 1;
  const paket =
    p.komada > 1
      ? `U paketu su vam ostale još ${ostalo} ${ostalo < 5 ? "čestitke" : "čestitki"}. Iskoristite ih na istom uređaju na ${origin}/napravi. Tajni link ih prenosi zajedno s ovom čestitkom.`
      : "";
  const ispravci = `Do prvog otvaranja poruku i ostalo možete ispraviti na istom uređaju. Ime na kuverti ostaje isto, a kad primatelj otvori čestitku, više se ne mijenja.${doDana ? ` Čestitka se može otvoriti do ${doDana}, a onda se briše zajedno s fotografijom.` : ""}`;
  // Potvrda na trajnom mediju (Zakon o zaštiti potrošača): kupac je tražio isporuku odmah i time gubi pravo na raskid.
  const odustanak = `Pri plaćanju ste zatražili da čestitka bude dostupna odmah i potvrdili da time gubite pravo na odustanak od kupnje u roku od 14 dana. Uvjeti korištenja: ${origin}/uvjeti`;
  const racun = sRacunom ? "Račun za uplatu je u privitku." : "";
  const kraj = "Ako niste vi platili ovu čestitku, samo odgovorite na ovaj mail.";

  const text = [
    naslov,
    "",
    "Hvala na kupnji. Ovo je link za primatelja, pošaljite ga porukom ili mailom:",
    link,
    "",
    ispravci,
    "",
    "Tajni link vraća čestitku na drugi uređaj (na primjer s mobitela na računalo). Ne šaljite ga primatelju:",
    tajni,
    "",
    ...(paket ? [paket, ""] : []),
    ...(racun ? [racun, ""] : []),
    odustanak,
    "",
    kraj,
    "",
    `${SITE_NAME}, ${domena}`,
  ].join("\n");

  const odlomak = (t: string, extra = "") =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BOJA.tekst};${extra}">${esc(t)}</p>`;
  const sitno = (t: string) =>
    `<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:${BOJA.blijedo}">${esc(t)}</p>`;
  const gumb = (href: string, tekst: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 10px"><tr>
<td style="background:${BOJA.crvena};border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fffdf6;text-decoration:none;border-radius:999px">${esc(tekst)}</a></td>
</tr></table>`;
  const adresa = (href: string) =>
    `<p style="margin:0 0 20px;text-align:center;font-size:13px;line-height:1.5"><a href="${esc(href)}" style="color:${BOJA.crvena};word-break:break-all">${esc(href)}</a></p>`;
  const crta = `<div style="height:1px;background:${BOJA.rub};margin:22px 0"></div>`;

  const html = `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(naslov)}</title></head>
<body style="margin:0;padding:0;background:${BOJA.noc}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BOJA.noc}"><tr><td align="center" style="padding:24px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 4px"><img src="${origin}/mail/kuverta.jpg" width="300" height="207" alt="" style="display:block;width:300px;max-width:70%;height:auto;border:0"></td></tr>
<tr><td style="background:${BOJA.papir};border:1px solid ${BOJA.zlato};border-radius:14px;padding:30px 26px 24px;font-family:Arial,Helvetica,sans-serif">
<h1 style="margin:0 0 6px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:normal;font-size:28px;line-height:1.25;color:${BOJA.crvena}">${esc(naslov)}</h1>
<p style="margin:0 0 22px;text-align:center;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${BOJA.zlato}">&#10022; Hvala na kupnji &#10022;</p>
${odlomak("Ovo je link za primatelja. Pošaljite ga porukom ili mailom:", "text-align:center")}
${gumb(link, "Otvori čestitku")}
${adresa(link)}
${odlomak(ispravci)}
${crta}
${odlomak("Tajni link vraća čestitku na drugi uređaj, na primjer s mobitela na računalo. Ne šaljite ga primatelju.")}
${adresa(tajni)}
${paket ? odlomak(paket) : ""}
${racun ? odlomak(racun) : ""}
${crta}
${sitno(odustanak)}
${sitno(kraj)}
</td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BOJA.svijetlo}">${esc(SITE_NAME)} &middot; <a href="${origin}" style="color:${BOJA.svijetlo}">${esc(domena)}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: naslov, text, html };
}

function base64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

// Pošalje mail za plaćenu sesiju, najviše jednom (baza pamti mail_poslan). Greške samo zapiše u log:
// čestitka je već otključana, a kupac ima link i na stranici /napravi/gotovo.
export async function posaljiMailKupcu(
  supabase: SupabaseClient,
  sessionId: string,
  origin: string,
  sRacunom = false,
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
  try {
    // Račun (PDF) ide u privitak kad je izdan; ako ga servis ne vrati, mail ide bez njega.
    const pdf = sRacunom ? await pdfRacuna(sessionId).catch((e) => (console.error("mail: racun pdf", e), null)) : null;
    const m = sadrzajMaila(p, origin, !!pdf);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${kljuc}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: read("MAIL_OD") || `${SITE_NAME} <cestitka@kuverta.hr>`,
        to: [p.email],
        subject: m.subject,
        text: m.text,
        html: m.html,
        ...(pdf ? { attachments: [{ filename: "racun-bozicna-cestitka.pdf", content: base64(pdf) }] } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error("mail: slanje", e);
    await supabase.rpc("mail_nije_poslan", { p_secret: tajna, p_session_id: sessionId });
  }
}
