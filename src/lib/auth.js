import { supabase, supabaseKey, supabaseUrl } from "./supabaseClient";

/**
 * ระบบสมาชิก: เข้าสู่ระบบด้วย Google / LINE / Facebook แล้วต้องมีเบอร์มือถือ (บังคับ)
 *
 * วิธีเก็บเบอร์ (ตั้งใน .env: VITE_AUTH_PHONE_MODE)
 *  "collect" (ค่าเริ่มต้น, ฟรี) = กรอกเบอร์อย่างเดียว ไม่ส่ง SMS — ทีมงานยืนยันเองตอนโทรติดต่อ
 *  "otp"                       = ส่งรหัส OTP ทาง SMS ต้องยืนยันก่อนใช้งาน (ต้องตั้งผู้ให้บริการ SMS ใน Supabase ซึ่งเสียเงิน)
 *
 * ต้องตั้งค่าใน Supabase ก่อนใช้งานจริง (ดู docs ในรายงาน / README):
 *  • Authentication → Providers → เปิด Google, Facebook (ใส่ Client ID / Secret)
 *  • Authentication → Providers → Phone: เปิด + ตั้งผู้ให้บริการ SMS (ไว้ส่ง OTP)
 *  • Authentication → URL Configuration → Redirect URLs: ใส่ที่อยู่เว็บ เช่น https://โดเมน/ และ http://localhost:5173/
 *  • LINE: Supabase ไม่มีให้ในตัว → ตั้งเป็นผู้ให้บริการแบบกำหนดเอง แล้วใส่ชื่อใน .env: VITE_AUTH_LINE_PROVIDER=ชื่อนั้น
 */

/** "collect" = กรอกเบอร์อย่างเดียว (ฟรี) · "otp" = ยืนยันด้วย SMS */
export const PHONE_MODE = import.meta.env.VITE_AUTH_PHONE_MODE === "otp" ? "otp" : "collect";

/** ช่องทางเข้าสู่ระบบที่แสดงบนหน้า (provider = ชื่อใน Supabase) */
const LINE_PROVIDER = import.meta.env.VITE_AUTH_LINE_PROVIDER || "";
export const LOGIN_PROVIDERS = [
  { key: "google", provider: "google", label: "Google" },
  { key: "line", provider: LINE_PROVIDER, label: "LINE" },
  { key: "facebook", provider: "facebook", label: "Facebook" },
];

/** ถาม Supabase ว่าเปิดช่องทางไหนไว้บ้าง → { google: true, facebook: false, phone: true, ... } */
export async function fetchAuthSettings() {
  const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } });
  if (!res.ok) throw new Error(`auth settings ${res.status}`);
  return (await res.json()).external || {};
}

/** ช่องทางนี้กดได้ไหม (LINE ต้องตั้งชื่อใน .env ก่อน) */
export const isProviderEnabled = (p, settings) => {
  if (!p.provider) return false;
  const name = p.provider.replace(/^custom:/, "");
  return settings?.[name] ?? settings?.[p.provider] ?? p.key === "line";
};

/** ที่อยู่ให้กลับมาหลังเข้าสู่ระบบ = หน้า #/login ของเว็บนี้ (ต้องอยู่ใน Redirect URLs ของ Supabase) */
const returnUrl = () => `${window.location.origin}${window.location.pathname}#/login`;

export const signInWith = (provider) =>
  supabase.auth.signInWithOAuth({ provider, options: { redirectTo: returnUrl() } });

export const signOutUser = () => supabase.auth.signOut();

/** เบอร์ของบัญชี (0812345678) — โหมด otp ใช้เบอร์ที่ยืนยันแล้ว, โหมด collect ใช้เบอร์ที่กรอกไว้ */
export function phoneOf(user) {
  if (!user) return "";
  if (user.phone_confirmed_at && user.phone) return `0${user.phone.slice(2)}`;
  // collect: เบอร์ที่ฐานข้อมูลจองให้แล้ว (app_metadata แก้เองไม่ได้) · ยังไม่ได้รัน schema ใหม่ = ใช้ที่กรอกไว้เดิม
  return PHONE_MODE === "collect" ? user.app_metadata?.phone || user.user_metadata?.phone || "" : "";
}
export const isPhoneVerified = (user) => Boolean(user?.phone_confirmed_at);

/** บัญชีนี้ยังต้องใส่เบอร์อยู่ไหม (แอดมินที่เข้าด้วยอีเมล/รหัสผ่านไม่ต้อง) */
export const needsPhone = (user) =>
  Boolean(user) && user.app_metadata?.provider !== "email" && !phoneOf(user);

/**
 * บันทึก / เปลี่ยนเบอร์มือถือของบัญชี (โหมด collect ไม่ส่ง SMS) — phone = 0812345678
 * ฐานข้อมูลเช็กให้: 1 เบอร์ใช้ได้ 1 บัญชี (เบอร์ที่บัญชีอื่นใช้อยู่ = error PHONE_TAKEN)
 */
export async function savePhone(phone) {
  const { error } = await supabase.rpc("claim_phone", { p_phone: phone });
  if (error) throw error;
  const { data, error: e2 } = await supabase.auth.refreshSession(); // ดึงเบอร์ที่บันทึกแล้วกลับมา
  if (e2) throw e2;
  return data.user;
}

/** ส่ง OTP ไปที่เบอร์ (phone = +66…) — Supabase ส่ง SMS ให้ */
export async function sendPhoneOtp(phone) {
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
}

/** ยืนยันรหัส 6 หลัก → เบอร์ผูกกับบัญชีแล้ว */
export async function verifyPhoneOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "phone_change" });
  if (error) throw error;
  return data.user;
}

/** ข้อมูลติดต่อจากบัญชี ใช้กรอกฟอร์มให้อัตโนมัติ { name, phone (0812345678), lineId } */
export function contactOf(user) {
  if (!user) return { name: "", phone: "", lineId: "" };
  const name = profileOf(user).name;
  return { name: name === user.email ? "" : name, phone: phoneOf(user), lineId: user.user_metadata?.line_id || "" };
}

/**
 * กรอกข้อมูลติดต่อจากบัญชีลงฟอร์ม (เฉพาะช่องที่ยังว่าง ไม่ทับที่ผู้ใช้พิมพ์ไว้)
 * fields = { ชื่อช่องในฟอร์ม: "name" | "phone" | "lineId" }
 */
export function fillContact(values, user, fields, formatPhone) {
  const c = contactOf(user);
  const next = { ...values };
  let changed = false;
  Object.entries(fields).forEach(([key, from]) => {
    const v = from === "phone" && c.phone ? formatPhone(c.phone) : c[from];
    if (v && !String(next[key] || "").trim()) { next[key] = v; changed = true; }
  });
  return changed ? next : values;
}

/** บันทึกข้อมูลโปรไฟล์ (ชื่อที่แสดง, เบอร์, LINE ID) ไว้กับบัญชี */
export async function updateProfile(fields) {
  const { data, error } = await supabase.auth.updateUser({ data: fields });
  if (error) throw error;
  return data.user;
}

// ── รูปโปรไฟล์ + กรอบ ─────────────────────────────────────────────────────────
const AVATAR_BUCKET = "avatars";
const AVATAR_SIZE = 320;

/** ตัดรูปเป็นสี่เหลี่ยมจัตุรัสตรงกลาง ย่อเหลือ 320×320 แปลงเป็น JPEG */
function squareJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("BAD_IMAGE"))), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("BAD_IMAGE")); };
    img.src = url;
  });
}

/** อัปโหลดรูปโปรไฟล์ใหม่ (เก็บที่ avatars/<user id>/…) แล้วลบรูปเก่าทิ้ง */
export async function uploadAvatar(user, file) {
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type)) throw new Error("BAD_IMAGE");
  const blob = await squareJpeg(file);
  const path = `${user.id}/${Date.now()}.jpg`;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { error } = await bucket.upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  const old = user.user_metadata?.avatar_path;
  const next = await updateProfile({ avatar_custom: bucket.getPublicUrl(path).data.publicUrl, avatar_path: path });
  if (old && old !== path) bucket.remove([old]).catch(() => {});
  return next;
}

/** เลิกใช้รูปที่อัปโหลด → กลับไปใช้รูปจากบัญชี Google / LINE / Facebook */
export async function removeAvatar(user) {
  const old = user.user_metadata?.avatar_path;
  const next = await updateProfile({ avatar_custom: null, avatar_path: null });
  if (old) supabase.storage.from(AVATAR_BUCKET).remove([old]).catch(() => {});
  return next;
}

/** รูปจากบัญชีโซเชียล (ไว้แสดงว่าถ้าเลิกใช้รูปที่อัปโหลดจะได้รูปไหน) */
export const providerAvatarOf = (user) => user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

// ── รหัสผ่าน ────────────────────────────────────────────────────────────────
// สมาชิกที่เข้าด้วย Google / LINE / Facebook ตั้งรหัสผ่านเพิ่มได้ในหน้าโปรไฟล์ → เข้าสู่ระบบด้วยอีเมล + รหัสผ่านได้อีกทาง

/** บัญชีนี้ตั้งรหัสผ่านไว้แล้วไหม (บัญชีอีเมล = มีแน่นอน, บัญชีโซเชียล = ดูจากที่บันทึกไว้ตอนตั้ง) */
export const hasPassword = (user) =>
  user?.app_metadata?.provider === "email" || Boolean(user?.user_metadata?.has_password);

/** ตั้ง / เปลี่ยนรหัสผ่าน */
export async function setPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password, data: { has_password: true } });
  if (error) throw error;
  return data.user;
}

/** เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน */
export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** ออกจากระบบทุกอุปกรณ์ (เช่น ลืมออกจากเครื่องคนอื่น) */
export const signOutEverywhere = () => supabase.auth.signOut({ scope: "global" });

// ── ยืนยันตัวตน 2 ขั้นตอน (2FA) ด้วยแอป Authenticator (TOTP) — ฟรี เปิดอยู่แล้วใน Supabase ─────────

/** แอปยืนยันตัวตนที่ผูกไว้แล้ว (ยืนยันเรียบร้อย) */
export async function listTotp() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return { verified: data.totp || [], all: data.all || [] };
}

/** เริ่มผูกแอป → { id, qr (รูป QR), secret (รหัสพิมพ์เอง) } — ยังไม่เปิดใช้จนกว่าจะยืนยันรหัส 6 หลัก */
export async function startTotp() {
  const { all } = await listTotp();
  // ล้างอันที่เริ่มไว้แต่ยังไม่ยืนยัน (กดเปิดแล้วปิดหน้าไป)
  await Promise.all(all.filter((f) => f.factor_type === "totp" && f.status !== "verified")
    .map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `app-${Date.now().toString(36)}`,
    issuer: window.location.hostname || "website",
  });
  if (error) throw error;
  return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** ยืนยันรหัส 6 หลักจากแอป (ใช้ทั้งตอนเปิด 2FA และตอนเข้าสู่ระบบ) */
export async function verifyTotp(factorId, code) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
}

/** ปิด 2FA (ถอดแอปออก) */
export async function removeTotp(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  await supabase.auth.refreshSession();
}

/** เข้าสู่ระบบแล้วแต่ยังต้องกรอกรหัส 2FA อยู่ไหม */
export async function mfaNeeded() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

/** ข้อความภาษาไทยสำหรับข้อผิดพลาดที่พบบ่อย */
export function authErrorText(err) {
  const code = err?.code || "";
  const msg = String(err?.message || err || "").toLowerCase();
  if (msg.includes("bad_image")) return "ไฟล์นี้ไม่ใช่รูปภาพ หรือเปิดไม่ได้ ลองใช้ไฟล์ JPG / PNG";
  if (msg.includes("bucket not found")) {
    return "ฐานข้อมูลยังไม่รองรับ (ต้องรัน supabase/schema.sql ใหม่ใน Supabase)";
  }
  if (msg.includes("row-level security") || msg.includes("unauthorized")) return "ไม่มีสิทธิ์ทำรายการนี้";
  if (msg.includes("exceeded the maximum") || msg.includes("too large")) return "ไฟล์ใหญ่เกินไป";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (code === "weak_password" || msg.includes("password should")) return "รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข";
  if (code === "same_password" || msg.includes("different from the old")) return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  if (code === "reauthentication_needed" || msg.includes("reauthentication")) {
    return "เพื่อความปลอดภัย กรุณาออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยนรหัสผ่าน";
  }
  if (code === "mfa_verification_failed" || msg.includes("invalid totp")) return "รหัสไม่ถูกต้อง หรือหมดเวลาแล้ว ลองรหัสใหม่จากแอป";
  if (code.startsWith("mfa_") && code.includes("not_enabled") || msg.includes("mfa") && msg.includes("disabled")) {
    return "ระบบยืนยันตัวตน 2 ขั้นตอนยังไม่เปิดใน Supabase";
  }
  if (code === "insufficient_aal" || msg.includes("aal2")) return "กรุณายืนยันรหัส 2 ขั้นตอนก่อน แล้วลองใหม่";
  if (msg.includes("phone_taken")) return "เบอร์นี้ผูกกับบัญชีอื่นแล้ว กรุณาใช้เบอร์อื่น หรือเข้าสู่ระบบด้วยบัญชีเดิมที่ใช้เบอร์นี้";
  if (msg.includes("bad_phone")) return "กรุณาใส่เบอร์มือถือ (06 / 08 / 09) เช่น 0812345678";
  if (msg.includes("claim_phone") || (code === "PGRST202" && msg.includes("phone"))) {
    return "ระบบบันทึกเบอร์ยังไม่พร้อม (ต้องรัน supabase/schema.sql ใหม่ใน Supabase)";
  }
  if (code === "phone_exists" || msg.includes("already been registered") || msg.includes("already registered")) {
    return "เบอร์นี้ผูกกับบัญชีอื่นแล้ว กรุณาใช้เบอร์อื่น หรือเข้าสู่ระบบด้วยบัญชีเดิม";
  }
  if (code === "otp_expired" || msg.includes("expired") || msg.includes("invalid")) return "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่";
  if (code === "over_sms_send_rate_limit" || msg.includes("rate limit") || msg.includes("security purposes")) {
    return "ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (code === "sms_send_failed" || msg.includes("sms")) return "ส่ง SMS ไม่สำเร็จ ระบบส่งรหัสยังไม่พร้อม กรุณาติดต่อทีมงาน";
  if (code === "phone_provider_disabled" || msg.includes("phone") && msg.includes("disabled")) {
    return "ระบบยืนยันเบอร์ยังไม่เปิดใช้งาน กรุณาติดต่อทีมงาน";
  }
  if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) return "ช่องทางนี้ยังไม่เปิดใช้งาน";
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

/** ชื่อและรูปที่ได้จากบัญชี Google / LINE / Facebook */
export function profileOf(user) {
  const m = user?.user_metadata || {};
  return {
    name: m.display_name || m.full_name || m.name || user?.email || "สมาชิก", // display_name = ชื่อที่ผู้ใช้แก้เองในหน้าโปรไฟล์
    avatar: m.avatar_custom || m.avatar_url || m.picture || "", // avatar_custom = รูปที่อัปโหลดเองในหน้าโปรไฟล์
    email: user?.email || "",
    provider: user?.app_metadata?.provider || "",
  };
}

/** จำหน้าที่อยู่ก่อนกดเข้าสู่ระบบ → เสร็จแล้วพากลับไปหน้านั้น */
const NEXT_KEY = "authNext";
export const rememberNext = (hash) => { try { sessionStorage.setItem(NEXT_KEY, hash); } catch { /* ไม่จำก็ได้ */ } };
export const takeNext = () => {
  try {
    const v = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return v && !v.startsWith("#/login") ? v : "#/home";
  } catch {
    return "#/home";
  }
};
