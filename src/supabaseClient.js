import { createClient } from "@supabase/supabase-js";

// Mengambil kunci rahasia dari environment variable (.env / .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Mengecek apakah kunci sudah terpasang
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase configuration! Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah disetel di file .env.local."
  );
}

// Membuat client ke database Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
