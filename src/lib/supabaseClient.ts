// src/lib/supabaseClient.ts
// Single shared Supabase client used across the app.

import { createClient } from "@supabase/supabase-js"; // official JS client

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string; // project URL from env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string; // anon public key from env

// Create a typed Supabase client instance for the whole app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
