import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

// Uses the public anon key, so Supabase RLS keeps this API read-only.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});