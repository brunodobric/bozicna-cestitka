/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    user: import('@supabase/supabase-js').User | null;
    // Adresa Supabase projekta (https://xxxx.supabase.co), za javne URL-ove slika.
    supabaseUrl: string;
  }
}

// Minimalna deklaracija za Cloudflare Workers okruženje (varijable i bindinzi).
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
