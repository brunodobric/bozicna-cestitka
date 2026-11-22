// Ilustracija čestitke kao SVG slika (bez teksta i osobnih podataka): /ilustracije/<tema>.svg.
// Preglednik je crta na canvas zajedno s tekstom (scripts/cestitka.ts). Slika se ne mijenja, pa se dugo pamti.
import type { APIRoute } from 'astro';
import { ilustracija } from '../../lib/ilustracije';
import { TEME } from '../../lib/teme';

export const GET: APIRoute = ({ params }) => {
  const t = TEME.find((x) => x.key === params.tema);
  if (!t) return new Response(null, { status: 404 });
  return new Response(ilustracija(t.key), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
};
