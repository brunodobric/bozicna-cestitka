// PROTOTIP (samo za razvoj): poleđina čestitke s fotografijom kupca. Ista ilustracija kao prednja strana,
// a fotografija stoji na mjestu gdje je na prednjoj strani tekst; kod vijenca je okrugla, unutar vijenca.
import type { Podaci } from './cestitka';

const W = 1080;
const H = 1350;

function ucitaj(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
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

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / r;
  const sh = h / r;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

const font = (opis: string, px: number) => opis.replace(" '", ` ${Math.round(px)}px '`) + ', serif';

export async function nacrtajPoledinu(p: Podaci & { natpis: string }): Promise<HTMLCanvasElement> {
  const k = p.karta;
  await document.fonts.load(font(k.potpisFont, 40), p.natpis + 'čćđšž').catch(() => null);
  const [ilustracija, foto] = await Promise.all([ucitaj(`/ilustracije/${p.tema}.svg`), ucitaj(p.slika!)]);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = k.papir;
  ctx.fillRect(0, 0, W, H);
  if (ilustracija) ctx.drawImage(ilustracija, 0, 0, W, H);
  if (!foto) return c;

  if (p.tema === 'vijenac') {
    // okrugla fotografija u sredini vijenca (sredina 540, 380; unutarnji rub oko 200)
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 380, 196, 0, Math.PI * 2);
    ctx.clip();
    cover(ctx, foto, 344, 184, 392, 392);
    ctx.restore();
    ctx.font = font(k.potpisFont, 84);
    ctx.fillStyle = k.potpisBoja;
    ctx.textAlign = 'center';
    ctx.fillText(p.natpis, 540, 1040);
    return c;
  }

  // fotografija s bijelim rubom, malo nakošena, u okviru za tekst; ispod natpis rukom
  const o = k.okvir;
  const natpisH = 110;
  const maxW = o.w - 30;
  const maxH = o.h - natpisH - 20;
  // omjer fotografije se zadržava koliko okvir dopušta (između 4:5 i 4:3)
  const omjer = Math.min(Math.max(foto.naturalWidth / foto.naturalHeight, 0.8), 1.33);
  let fw = maxW;
  let fh = fw / omjer;
  if (fh > maxH) {
    fh = maxH;
    fw = fh * omjer;
  }
  const rub = 18;
  const cx = o.x + o.w / 2;
  const cy = o.y + 10 + fh / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-2.2 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fffdf8';
  zaobljeno(ctx, -fw / 2, -fh / 2, fw, fh, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save();
  zaobljeno(ctx, -fw / 2 + rub, -fh / 2 + rub, fw - 2 * rub, fh - 2 * rub, 3);
  ctx.clip();
  cover(ctx, foto, -fw / 2 + rub, -fh / 2 + rub, fw - 2 * rub, fh - 2 * rub);
  ctx.restore();
  ctx.restore();
  ctx.font = font(k.potpisFont, 80);
  ctx.fillStyle = k.potpisBoja;
  ctx.textAlign = 'center';
  if (k.sjena) {
    ctx.shadowColor = k.sjena;
    ctx.shadowBlur = 10;
  }
  ctx.fillText(p.natpis, cx, o.y + 10 + fh + natpisH - 10);
  return c;
}
