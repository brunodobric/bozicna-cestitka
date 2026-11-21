// "Spremi kao sliku": čestitka se crta na canvas (1080 × 1350, format za mobitel i Instagram), a ne
// fotografira se HTML (html2canvas i slični su nepouzdani na iOS Safariju s fontovima i slikama).
// Boje i fontovi čitaju se iz stvarnog izgleda čestitke (CSS teme), pa je slika jednaka prikazu.
// Mobitel: Web Share s datotekom (korisnik odabere "Spremi sliku" i slika ide u galeriju). Inače: preuzimanje PNG-a.
// Slika iz Supabase Storagea mora imati crossorigin="anonymous", inače canvas ne smije izvesti PNG.

const W = 1080;
const H = 1350;

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

function font(el: Element | null, px: number): string {
  if (!el) return `${px}px serif`;
  const s = getComputedStyle(el);
  return `${s.fontStyle} ${s.fontWeight} ${px}px ${s.fontFamily}`;
}

// Tema može naslov pisati velikim slovima (text-transform), a canvas to ne radi sam.
function velikaSlova(el: Element | null, text: string): string {
  return el && getComputedStyle(el).textTransform === 'uppercase' ? text.toLocaleUpperCase('hr') : text;
}

function boja(el: Element | null, fallback: string): string {
  return el ? getComputedStyle(el).color : fallback;
}

function varijabla(el: Element, ime: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(ime).trim() || fallback;
}

export async function nacrtaj(karta: HTMLElement): Promise<Blob | null> {
  await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const naslovEl = karta.querySelector('#karta-naslov');
  const porukaEl = karta.querySelector('#karta-poruka');
  const potpisEl = karta.querySelector('#karta-potpis');
  const img = karta.querySelector<HTMLImageElement>('#karta-slika');

  // pozadina
  const g = ctx.createRadialGradient(W / 2, H * 0.44, 50, W / 2, H * 0.44, H * 0.8);
  g.addColorStop(0, varijabla(karta, '--bg-glow', '#1a4a37'));
  g.addColorStop(1, varijabla(karta, '--bg', '#0f2e22'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // kartica
  const m = 70;
  const cw = W - 2 * m;
  const ch = H - 2 * m;
  ctx.fillStyle = varijabla(karta, '--k-papir', '#fffaf0');
  ctx.fillRect(m, m, cw, ch);
  ctx.strokeStyle = varijabla(karta, '--k-rub', '#b8892f');
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, cw, ch);

  // slika (object-fit: cover)
  let y = m;
  if (img && img.complete && img.naturalWidth) {
    const ih = Math.round(cw * 0.62);
    const r = Math.max(cw / img.naturalWidth, ih / img.naturalHeight);
    const sw = cw / r;
    const sh = ih / r;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, m, m, cw, ih);
    y = m + ih;
  }
  ctx.strokeStyle = varijabla(karta, '--k-rub2', 'rgba(184,137,47,.45)');
  ctx.strokeRect(m + 16, m + 16, cw - 32, ch - 32);

  // tekst: najprije izmjeri cijeli blok, pa ga okomito centriraj u preostalom prostoru kartice
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const imaSliku = y > m;
  const naslov = velikaSlova(naslovEl, naslovEl?.textContent?.trim() ?? '');
  const poruka = porukaEl?.textContent?.trim() ?? '';
  const potpis = potpisEl?.textContent?.trim() ?? '';
  const naslovPx = imaSliku ? 72 : 96;
  const porukaPx = imaSliku ? 38 : 48;
  const potpisPx = Math.round(porukaPx * 1.15);
  const razmak = Math.round(porukaPx * 1.4);
  ctx.font = font(naslovEl, naslovPx);
  const naslovRedovi = prelomi(ctx, naslov, cw - 140).slice(0, 2);
  ctx.font = font(porukaEl, porukaPx);
  const maxRedaka = imaSliku ? 8 : 12;
  let redovi = poruka ? prelomi(ctx, poruka, cw - 160) : [];
  if (redovi.length > maxRedaka) redovi = [...redovi.slice(0, maxRedaka - 1), redovi[maxRedaka - 1] + ' …'];

  const ukrasH = imaSliku ? 0 : 80;
  const naslovH = naslovRedovi.length * Math.round(naslovPx * 1.15);
  const porukaH = redovi.length ? 40 + redovi.length * razmak : 0;
  const potpisH = potpis ? 40 + Math.round(potpisPx * 1.3) : 0;
  const visina = ukrasH + naslovH + porukaH + potpisH;
  const vrh = y + 30;
  const dno = m + ch - 40;
  let ty = vrh + Math.max(30, (dno - vrh - visina) / 2);

  if (!imaSliku) {
    // ukras iznad naslova (isto kao .karta__ukras)
    const uy = ty + 20;
    ctx.strokeStyle = varijabla(karta, '--k-rub', '#b8892f');
    ctx.fillStyle = varijabla(karta, '--k-rub', '#b8892f');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 160, uy);
    ctx.lineTo(W / 2 - 40, uy);
    ctx.moveTo(W / 2 + 40, uy);
    ctx.lineTo(W / 2 + 160, uy);
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.font = `36px ${getComputedStyle(karta).fontFamily}`;
    ctx.fillText('✦', W / 2, uy + 2);
    ctx.textBaseline = 'alphabetic';
    ty += ukrasH;
  }

  ctx.fillStyle = boja(naslovEl, '#8a1c24');
  ctx.font = font(naslovEl, naslovPx);
  for (const l of naslovRedovi) {
    ty += Math.round(naslovPx * 1.15);
    ctx.fillText(l, W / 2, ty - Math.round(naslovPx * 0.2));
  }

  if (redovi.length) {
    ty += 40;
    ctx.fillStyle = boja(porukaEl, '#2a211c');
    ctx.font = font(porukaEl, porukaPx);
    for (const l of redovi) {
      ty += razmak;
      ctx.fillText(l, W / 2, ty - Math.round(razmak * 0.3));
    }
  }
  if (potpis) {
    ty += 40 + Math.round(potpisPx * 1.3);
    ctx.fillStyle = boja(potpisEl, '#8a6420');
    ctx.font = font(potpisEl, potpisPx);
    ctx.fillText(potpis, W / 2, Math.min(ty - Math.round(potpisPx * 0.3), dno));
  }
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

export async function spremiKaoSliku(karta: HTMLElement): Promise<void> {
  const blob = await nacrtaj(karta);
  if (!blob) throw new Error('canvas');
  const file = new File([blob], 'bozicna-cestitka.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Božićna čestitka' });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
