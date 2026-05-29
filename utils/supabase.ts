import { createClient } from '@supabase/supabase-js';

// نضع قيم افتراضية مؤقتة لكي ينجح بناء Vercel بدون توقف
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);