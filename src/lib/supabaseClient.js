import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Created now so Phase 3 (auth + cloud sync) can import a ready client
   instead of wiring this up from scratch. Not called anywhere yet —
   the app runs entirely on the local GymakStore until Phase 3 adds
   the login/register/forgot-password screens and the sync layer. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

if (!supabase && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "[gymak] Supabase env vars missing — copy .env.example to .env and fill in " +
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY once the Supabase project exists. " +
    "The app works fully offline until then."
  );
}
