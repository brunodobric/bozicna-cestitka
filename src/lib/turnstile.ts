// Cloudflare Turnstile (CAPTCHA) za anonimnu prijavu kupca. Token provjerava Supabase Auth
// (Authentication → Attack Protection → CAPTCHA, Turnstile s tajnim ključem), ne naš Worker.
// TURNSTILE_SITE_KEY u Cloudflareu: javni ključ widgeta. Bez njega se widget ne prikazuje.
import { env } from 'cloudflare:workers';

export function turnstileSiteKey(): string {
  const v = (env as unknown as Record<string, unknown>).TURNSTILE_SITE_KEY;
  return typeof v === 'string' ? v.trim() : '';
}

// Token iz obrasca (polje koje doda widget), ili undefined ako ga nema.
export function captchaToken(f: FormData): string | undefined {
  const t = f.get('cf-turnstile-response');
  return typeof t === 'string' && t.trim() ? t.trim() : undefined;
}
