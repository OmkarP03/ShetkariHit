import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Why this does not throw:
 *
 * Throwing here runs at module import, which is before React mounts — the
 * result is a blank white page and an error only visible in the console.
 * Instead we report the problem and let the app render a screen that says
 * what to fix. A missing config file is the single most likely first-run
 * problem, so it deserves an explanation, not a void.
 */
export const supabaseConfigError: string | null = (() => {
  if (!url) return 'VITE_SUPABASE_URL is missing from .env.local';
  if (!anonKey) return 'VITE_SUPABASE_ANON_KEY is missing from .env.local';
  if (anonKey.includes('your-anon-key')) {
    return 'VITE_SUPABASE_ANON_KEY is still the placeholder from .env.example';
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    return `VITE_SUPABASE_URL does not look like a Supabase URL: ${url}`;
  }
  return null;
})();

/**
 * The anon key is public by design — row level security is what protects the
 * data, not the key. The service_role key must never appear in this bundle.
 *
 * Fallbacks keep the module importable when config is missing; every call
 * fails at request time rather than at load time, and the UI has already
 * shown the setup screen by then.
 */
export const supabase = createClient<Database>(
  url || 'https://unconfigured.supabase.co',
  anonKey || 'unconfigured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,

      // MUST stay true. Google sign-in and the password-reset link both come
      // back as a redirect carrying `?code=...`. With this off, supabase-js
      // ignores that code, no session is created, and the user silently lands
      // back on the signed-out page having "logged in" successfully.
      detectSessionInUrl: true,

      // PKCE is the safe flow for a browser app: the token is exchanged
      // server-side against a verifier this tab stored, so a code leaking from
      // the URL or browser history is useless on its own.
      flowType: 'pkce',
    },
  },
);
