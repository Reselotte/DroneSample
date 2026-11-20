import { supabase } from "./supabaseClient";
import { fetchAuthSettings } from "./auth";

/**
 * ตรวจว่าฐานข้อมูล / การตั้งค่า Supabase พร้อมสำหรับฟีเจอร์ต่าง ๆ (หลังบ้าน → ตรวจระบบ)
 * ทุกข้อ "อ่านอย่างเดียว" ไม่เปลี่ยนข้อมูลจริง — ใช้วิธีเรียกแบบที่ต้องถูกปฏิเสธ แล้วดูว่าถูกปฏิเสธด้วยเหตุผลที่ถูก
 * ผลแต่ละข้อ = { key, group, label, status: "ok" | "fail" | "warn" | "info", detail, fix }
 */

const RUN_SQL = "รัน supabase/schema.sql ใหม่ใน Supabase → SQL Editor";
const missingFn = (e) => e?.code === "PGRST202" || /could not find the function/i.test(e?.message || "");
const msgOf = (e) => String(e?.message || e || "");

async function check(key, group, label, fn) {
  try {
    return { key, group, label, ...(await fn()) };
  } catch (e) {
    console.error(key, e);
    return { key, group, label, status: "fail", detail: msgOf(e) || "ตรวจไม่สำเร็จ" };
  }
}

export async function runSystemChecks(myId) {
  const auth = fetchAuthSettings().catch(() => null);

  return Promise.all([
    check("role", "ฐานข้อมูล", "ระบบระดับสิทธิ์ (role)", async () => {
      const { data, error } = await supabase.rpc("my_role");
      if (error) return missingFn(error) ? { status: "fail", detail: "ยังไม่มีระบบ role", fix: RUN_SQL } : { status: "fail", detail: msgOf(error) };
      return data === "admin"
        ? { status: "ok", detail: "บัญชีนี้เป็นผู้ดูแลระบบ" }
        : { status: "warn", detail: `บัญชีนี้เป็น "${data}" ไม่ใช่ผู้ดูแลระบบ` };
    }),

    check("dealer", "ฐานข้อมูล", "ระดับดีลเลอร์", async () => {
      // ลองตั้งตัวเองเป็น dealer → ถ้ารองรับดีลเลอร์จะโดนปฏิเสธเพราะ "ลดสิทธิ์ตัวเองไม่ได้" (ไม่มีอะไรเปลี่ยน)
      const { error } = await supabase.rpc("set_user_role", { p_user: myId, p_role: "dealer" });
      const m = msgOf(error);
      if (/SELF_DEMOTE/.test(m)) return { status: "ok", detail: "ตั้งบัญชีเป็นดีลเลอร์ได้" };
      if (/BAD_ROLE/.test(m)) return { status: "fail", detail: "ฐานข้อมูลยังไม่รู้จักระดับดีลเลอร์", fix: RUN_SQL };
      if (missingFn(error)) return { status: "fail", detail: "ยังไม่มีฟังก์ชันเปลี่ยนระดับ", fix: RUN_SQL };
      return { status: "warn", detail: m || "ผลไม่ตรงที่คาด" };
    }),

    check("agent", "ฐานข้อมูล", "ระดับนายหน้า", async () => {
      const { error } = await supabase.rpc("set_user_role", { p_user: myId, p_role: "agent" });
      const m = msgOf(error);
      if (/SELF_DEMOTE/.test(m)) return { status: "ok", detail: "ตั้งบัญชีเป็นนายหน้าได้" };
      if (/BAD_ROLE/.test(m)) return { status: "fail", detail: "ฐานข้อมูลยังไม่รู้จักระดับนายหน้า", fix: RUN_SQL };
      if (missingFn(error)) return { status: "fail", detail: "ยังไม่มีฟังก์ชันเปลี่ยนระดับ", fix: RUN_SQL };
      return { status: "warn", detail: m || "ผลไม่ตรงที่คาด" };
    }),

    check("members", "ฐานข้อมูล", "รายชื่อสมาชิก (หลังบ้าน → สมาชิก)", async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { p_search: null });
      if (error) return { status: "fail", detail: missingFn(error) ? "ยังไม่มีฟังก์ชัน admin_list_users" : msgOf(error), fix: missingFn(error) ? RUN_SQL : undefined };
      const n = (k) => data.filter((u) => u.role === k).length;
      return { status: "ok", detail: `${data.length} บัญชี · ผู้ดูแล ${n("admin")} · ทีมงาน ${n("staff")} · ดีลเลอร์ ${n("dealer")} · นายหน้า ${n("agent")} · ผู้ใช้งานทั่วไป ${n("user")}` };
    }),

    check("owner", "ฐานข้อมูล", "เจ้าของประกาศ (ประกาศของฉัน)", async () => {
      const { error } = await supabase.from("listings").select("user_id").limit(1);
      if (error) return { status: "fail", detail: "ยังไม่มีช่องเจ้าของประกาศ (listings.user_id)", fix: RUN_SQL };
      const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).is("user_id", null);
      return count
        ? { status: "ok", detail: `พร้อม · มีประกาศเก่าที่ยังไม่มีเจ้าของ ${count} รายการ (เจ้าของแก้เองไม่ได้ ทีมงานแก้ได้)` }
        : { status: "ok", detail: "พร้อม" };
    }),

    check("owneredit", "ฐานข้อมูล", "เจ้าของแก้ไขประกาศตัวเอง", async () => {
      // แก้ประกาศที่ไม่มีอยู่ (รหัส -1) → ต้องถูกปฏิเสธว่า "ไม่ใช่เจ้าของ"
      const { error } = await supabase.rpc("update_my_listing", {
        p_id: -1, p_title: null, p_description: null, p_land_type: null, p_province: null, p_district: null,
        p_rai: null, p_ngan: null, p_wah: null, p_price: null, p_price_unit: null, p_lat: null, p_lng: null,
        p_photos: null, p_seller_name: null, p_phone: null, p_line_id: null,
      });
      if (/NOT_OWNER/.test(msgOf(error))) return { status: "ok", detail: "พร้อม · แก้ประกาศของคนอื่นไม่ได้" };
      if (missingFn(error)) return { status: "fail", detail: "ยังไม่มีฟังก์ชัน update_my_listing", fix: RUN_SQL };
      return { status: "warn", detail: msgOf(error) || "ผลไม่ตรงที่คาด" };
    }),

    check("avatars", "ฐานข้อมูล", "ที่เก็บรูปโปรไฟล์ (avatars)", async () => {
      const { error } = await supabase.storage.from("avatars").list(myId, { limit: 1 });
      if (error) return /not found/i.test(msgOf(error))
        ? { status: "fail", detail: "ยังไม่มีที่เก็บรูปโปรไฟล์", fix: RUN_SQL }
        : { status: "fail", detail: msgOf(error) };
      return { status: "ok", detail: "อัปโหลดรูปโปรไฟล์ได้" };
    }),

    check("oldframe", "ฐานข้อมูล", "ล้างระบบกรอบรูปเก่า", async () => {
      const { error } = await supabase.rpc("set_my_frame", { p_frame: null });
      return missingFn(error)
        ? { status: "ok", detail: "ไม่มีของเก่าค้าง" }
        : { status: "warn", detail: "ยังมีฟังก์ชันกรอบรูปเก่าค้างอยู่ (ไม่กระทบการใช้งาน)", fix: RUN_SQL };
    }),

    check("mfa", "การเข้าสู่ระบบ", "ยืนยันตัวตน 2 ขั้นตอน (2FA)", async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return { status: "fail", detail: msgOf(error) };
      const n = data.totp?.length || 0;
      return { status: "info", detail: n ? `บัญชีนี้เปิด 2FA แล้ว (${n} แอป)` : "บัญชีนี้ยังไม่เปิด 2FA · ทดสอบเปิดได้ที่โปรไฟล์ → ความปลอดภัย" };
    }),

    ...[
      { key: "email", label: "อีเมล + รหัสผ่าน", need: "เข้าสู่ระบบด้วยรหัสผ่านไม่ได้" },
      { key: "google", label: "Google", need: "ปุ่ม Google จะกดไม่ได้" },
      { key: "facebook", label: "Facebook", need: "ปุ่ม Facebook จะกดไม่ได้" },
    ].map((p) => check(`p-${p.key}`, "การเข้าสู่ระบบ", `เข้าสู่ระบบด้วย ${p.label}`, async () => {
      const s = await auth;
      if (!s) return { status: "warn", detail: "อ่านการตั้งค่าไม่ได้" };
      return s[p.key]
        ? { status: "ok", detail: "เปิดใช้งานอยู่" }
        : { status: "warn", detail: `ปิดอยู่ — ${p.need}`, fix: "Supabase → Authentication → Sign In / Providers" };
    })),

    check("p-line", "การเข้าสู่ระบบ", "เข้าสู่ระบบด้วย LINE", async () => (import.meta.env.VITE_AUTH_LINE_PROVIDER
      ? { status: "info", detail: `ตั้งชื่อผู้ให้บริการไว้แล้ว (${import.meta.env.VITE_AUTH_LINE_PROVIDER}) · ทดสอบกดปุ่มจริงที่หน้าเข้าสู่ระบบ` }
      : { status: "warn", detail: "ยังไม่ได้ตั้ง VITE_AUTH_LINE_PROVIDER ใน .env — ปุ่ม LINE จะกดไม่ได้" })),
  ]);
}
