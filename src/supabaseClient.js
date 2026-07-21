import { createClient } from "@supabase/supabase-js";

// Mengambil kunci rahasia dari file .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mengecek apakah kunci sudah terpasang
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Kunci Supabase belum ditemukan! Cek file .env.local kamu.");
}

// Membuat "kabel penghubung" (client) ke database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
