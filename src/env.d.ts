/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    user: import('@supabase/supabase-js').User | null;
    // Adresa Supabase projekta (https://xxxx.supabase.co), za javne URL-ove slika.
    supabaseUrl: string;
    // Izvor ulaska na stranicu (utm, vanjska stranica, izravno), null za klik unutar stranice. Vidi lib/izvor.ts.
    izvor: import('./lib/izvor').Izvor | null;
  }
}

// Minimalna deklaracija za Cloudflare Workers okruženje (varijable i bindinzi).
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
