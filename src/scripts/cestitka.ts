// Čestitka se crta na canvas 1080 × 1350: ilustracija dizajna (SVG s /ilustracije/<tema>.svg), po želji
// fotografija, pa naslov, poruka i potpis složeni u okvir koji dizajn ostavlja praznim (lib/teme.ts).
// Ista slika se prikazuje u kuverti, na ekranu i sprema u galeriju, pa se ne mogu razlikovati.
// HTML se ne "fotografira" (html2canvas i slični su nepouzdani na iOS Safariju s fontovima i slikama).
// Mobitel: Web Share s datotekom (korisnik odabere "Spremi sliku"). Inače: preuzimanje PNG-a.
import type { KartaOpis, Okvir } from '../lib/teme';

export type Podaci = {
  tema: string;
  karta: KartaOpis;
  naslov: string;
  poruka: string;
  od: string;
  slika: string | null; // javni URL fotografije
};

const W = 1080;
const H = 1350;

function ucitaj(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous'; // bez toga canvas ne smije izvesti PNG
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

// "400 'Great Vibes'" + 120 → "400 120px 'Great Vibes', serif"
const font = (opis: string, px: number) => opis.replace(" '", ` ${Math.round(px)}px '`) + ', serif';

function prelomi(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

type Blok = { vrsta: 'naslov' | 'poruka' | 'potpis'; redovi: string[]; razmak: number; font: string; boja: string; prije: number };

function visina(blokovi: Blok[]): number {
  return blokovi.reduce((s, b) => s + (b.redovi.length ? b.prije + b.redovi.length * b.razmak : 0), 0);
}

// Naslov: najviše dva reda, smanjuje se dok ne stane u širinu (i u visinu, ako ima svoj okvir).
function slozNaslov(ctx: CanvasRenderingContext2D, k: KartaOpis, naslov: string, w: number, px0: number, maxH = Infinity): Blok {
  let px = px0;
  for (;;) {
    ctx.font = font(k.naslovFont, px);
    const redovi = prelomi(ctx, naslov, w);
    const sirok = redovi.some((r) => ctx.measureText(r).width > w);
    if ((redovi.length <= 2 && !sirok && redovi.length * px * 1.08 <= maxH) || px <= 36) {
      return { vrsta: 'naslov', redovi: redovi.slice(0, 2), razmak: px * 1.08, font: ctx.font, boja: k.naslovBoja, prije: 0 };
    }
    px *= 0.94;
  }
}

function ispisi(ctx: CanvasRenderingContext2D, blokovi: Blok[], o: Okvir, sjena?: string) {
  let y = o.y + Math.max(0, (o.h - visina(blokovi)) / 2);
  const cx = o.x + o.w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  if (sjena) {
    ctx.shadowColor = sjena;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
  }
  for (const b of blokovi) {
    if (!b.redovi.length) continue;
    y += b.prije;
    ctx.font = b.font;
    ctx.fillStyle = b.boja;
    for (const r of b.redovi) {
      y += b.razmak;
      ctx.fillText(r, cx, y - b.razmak * 0.28);
    }
  }
  ctx.restore();
}

function zaobljeno(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function nacrtaj(p: Podaci): Promise<HTMLCanvasElement> {
  const k = p.karta;
  const naslov = p.naslov.trim();
  const poruka = p.poruka.trim();
  const potpis = p.od.trim();

  // Fontovi se dijele na podskupove (latin, latin-ext), pa tražimo baš slova iz teksta. Ako se font
  // ne učita za tri sekunde, crtamo zamjenskim (bolje nego prazna čestitka).
  const fontovi = Promise.all([
    document.fonts.load(font(k.naslovFont, 40), naslov + 'čćđšž'),
    document.fonts.load(font(k.potpisFont, 40), potpis + 'čćđšž'),
    document.fonts.load(font(k.tekstFont, 40), poruka + 'čćđšž'),
  ]).catch(() => null);
  const [ilustracija, foto] = await Promise.all([
    ucitaj(`/ilustracije/${p.tema}.svg`, false),
    p.slika ? ucitaj(p.slika, !p.slika.startsWith('/')) : Promise.resolve(null),
    Promise.race([fontovi, new Promise((r) => setTimeout(r, 3000))]),
  ]);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = k.papir;
  ctx.fillRect(0, 0, W, H);
  // SVG se crta cijeli, bez izrezivanja (Safari na iPhoneu krivo reže dio SVG slike).
  if (ilustracija) ctx.drawImage(ilustracija, 0, 0, W, H);

  // fotografija na vrhu okvira za tekst, kao zalijepljena slika s bijelim rubom
  let o: Okvir = { ...k.okvir };
  if (foto && foto.naturalWidth) {
    const fh = Math.round(Math.min(o.h * 0.44, o.w * 0.78));
    const fw = Math.round(Math.min(o.w, fh * 1.3));
    const fx = Math.round(o.x + (o.w - fw) / 2);
    const fy = o.y;
    const rub = 10;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#fffdf8';
    zaobljeno(ctx, fx, fy, fw, fh, 8);
    ctx.fill();
    ctx.restore();
    // Fotografija se najprije cijela iscrta na pomoćni canvas, pa se iz njega reže dio (object-fit: cover).
    const izvor = document.createElement('canvas');
    izvor.width = foto.naturalWidth;
    izvor.height = foto.naturalHeight;
    izvor.getContext('2d')?.drawImage(foto, 0, 0);
    const iw = fw - 2 * rub;
    const ih = fh - 2 * rub;
    const r = Math.max(iw / izvor.width, ih / izvor.height);
    const sw = iw / r;
    const sh = ih / r;
    ctx.save();
    zaobljeno(ctx, fx + rub, fy + rub, iw, ih, 4);
    ctx.clip();
    ctx.drawImage(izvor, (izvor.width - sw) / 2, (izvor.height - sh) / 2, sw, sh, fx + rub, fy + rub, iw, ih);
    ctx.restore();
    o = { x: o.x, y: o.y + fh + 20, w: o.w, h: o.h - fh - 20 };
  }

  // naslov u vlastitom okviru (vijenac) ili zajedno s porukom
  const odvojeno = k.naslovOkvir;
  if (odvojeno && naslov) ispisi(ctx, [slozNaslov(ctx, k, naslov, odvojeno.w, k.naslovPx, odvojeno.h)], odvojeno, k.sjena);

  // poruka i potpis: smanjuj dok sve ne stane u okvir
  let blokovi: Blok[] = [];
  for (let f = 1; ; f -= 0.05) {
    const porukaPx = Math.max(24, 52 * f);
    const potpisPx = porukaPx * 1.55;
    blokovi = [];
    if (naslov && !odvojeno) blokovi.push(slozNaslov(ctx, k, naslov, o.w, Math.max(54, k.naslovPx * f)));
    ctx.font = font(k.tekstFont, porukaPx);
    if (poruka) blokovi.push({ vrsta: 'poruka', redovi: prelomi(ctx, poruka, o.w), razmak: porukaPx * 1.36, font: ctx.font, boja: k.tekstBoja, prije: blokovi.length ? porukaPx * 0.5 : 0 });
    ctx.font = font(k.potpisFont, potpisPx);
    if (potpis) blokovi.push({ vrsta: 'potpis', redovi: prelomi(ctx, potpis, o.w).slice(0, 2), razmak: potpisPx * 1.15, font: ctx.font, boja: k.potpisBoja, prije: porukaPx * 0.7 });
    if (visina(blokovi) <= o.h) break;
    if (porukaPx <= 24) {
      // ni najmanja slova ne stanu: skrati poruku
      const b = blokovi.find((x) => x.vrsta === 'poruka');
      while (b && b.redovi.length > 1 && visina(blokovi) > o.h) b.redovi.pop();
      if (b && b.redovi.length) b.redovi[b.redovi.length - 1] += ' …';
      break;
    }
  }
  ispisi(ctx, blokovi, o, k.sjena);
  return c;
}

export function uBlob(c: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

// Čestitka s fotografijom ima dvije slike (prednja strana i poleđina) i obje se spremaju odjednom.
export async function spremi(blob: Blob, poledina: Blob | null = null): Promise<void> {
  const files = [new File([blob], 'bozicna-cestitka.png', { type: 'image/png' })];
  if (poledina) files.push(new File([poledina], 'bozicna-cestitka-fotografija.png', { type: 'image/png' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title: 'Božićna čestitka' });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
}
