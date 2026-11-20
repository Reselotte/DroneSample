/**
 * เบอร์โทรไทย: กรอกได้ทั้ง 2 แบบ
 *   • แบบในประเทศ   082-345-6789 / 02 123 4567
 *   • แบบสากล       +66 82 345 6789 / +66(0)82… / 66823456789
 * เก็บในฐานข้อมูลเป็นแบบขึ้นต้น 0 ตัวเลขล้วนเสมอ (ค้นหา/เช็กเบอร์ซ้ำได้ตรงกัน)
 */

/** แปลงเป็นแบบ 0xxxxxxxxx (ตัวเลขล้วน) — ถ้าแปลงไม่ได้คืนค่าที่ตัดช่องว่างแล้ว */
export function normalizeThaiPhone(input) {
  let d = String(input ?? "").trim().replace(/[\s\-().]/g, "");
  if (d.startsWith("+66")) d = `0${d.slice(3)}`;
  else if (/^66\d{8,10}$/.test(d)) d = `0${d.slice(2)}`;
  if (/^00\d{8,9}$/.test(d)) d = d.slice(1); // +66 0 82… → 0082… → 082…
  return d;
}

/** เบอร์ถูกต้อง (มือถือ 10 หลัก / บ้าน 9 หลัก ขึ้นต้น 0) */
export const isThaiPhone = (input) => /^0\d{8,9}$/.test(normalizeThaiPhone(input));

/** แสดงผลแบบอ่านง่าย: 0823456789 → 082-345-6789, 021234567 → 02-123-4567 */
export function formatThaiPhone(input) {
  const d = normalizeThaiPhone(input);
  if (/^0\d{9}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (/^0\d{8}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return d;
}

/** กรอกแบบ +66 อยู่ไหม (ใช้โชว์ว่า "จะบันทึกเป็น 08x…") */
export const isIntlFormat = (input) => /^\s*(\+|66)/.test(String(input ?? ""));

export const PHONE_PLACEHOLDER = "08x-xxx-xxxx หรือ +66 8x-xxx-xxxx";
export const PHONE_ERROR = "หมายเลขโทรศัพท์ไม่ถูกต้อง เช่น 0812345678 หรือ +66 81 234 5678";

/** เบอร์มือถือไทย (ใช้รับ OTP ได้): 06 / 08 / 09 ตามด้วย 8 หลัก */
export const isThaiMobile = (input) => /^0[689]\d{8}$/.test(normalizeThaiPhone(input));

/** 0812345678 → +66812345678 (รูปแบบสากลที่ระบบส่ง SMS ต้องใช้) */
export const toE164 = (input) => `+66${normalizeThaiPhone(input).slice(1)}`;

export const MOBILE_ERROR = "กรุณาใส่เบอร์มือถือ (06 / 08 / 09) เช่น 0812345678 หรือ +66 81 234 5678";
