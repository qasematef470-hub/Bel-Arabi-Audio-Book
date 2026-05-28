import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('بيانات الاتصال بـ Supabase غير مكتملة في ملف .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);