import { createClient } from "@supabase/supabase-js";

/**
 * การเชื่อมต่อ Supabase (ค่ามาจากไฟล์ .env ดูตัวอย่างที่ .env.example)
 *  VITE_SUPABASE_URL       = Project URL
 *  VITE_SUPABASE_ANON_KEY  = anon / publishable key (ปลอดภัยที่จะอยู่ในหน้าเว็บ สิทธิ์ถูกจำกัดด้วย RLS)
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

// flowType "pkce": หลังเข้าสู่ระบบด้วย Google / LINE / Facebook จะกลับมาพร้อม ?code= (ไม่ใช่ #access_token=)
// เว็บนี้ใช้ # เป็นที่อยู่หน้า (#/login) ถ้ากลับมาเป็น # จะชนกัน
export const supabaseUrl = url;
export const supabaseKey = key;
export const supabase = isSupabaseConfigured ? createClient(url, key, { auth: { flowType: "pkce" } }) : null;

if (!isSupabaseConfigured) {
  console.warn("ยังไม่ได้ตั้งค่า Supabase: สร้างไฟล์ .env ตามตัวอย่างใน .env.example แล้วรัน npm run dev ใหม่");
}
