import { formatNumber } from "./formatNumber";

/** รหัสประกาศ เช่น 12 → "L00012" (ใช้อ้างอิงเวลาคุยทาง LINE) */
export const listingCode = (id) => "L" + String(id).padStart(5, "0");

/** ขนาดที่ดิน เช่น "2 ไร่ 1 งาน 50 ตร.วา" (ไม่แสดงหน่วยที่เป็น 0) */
export function formatArea(rai, ngan, wah) {
  const parts = [];
  if (+rai) parts.push(`${formatNumber(rai, 2)} ไร่`);
  if (+ngan) parts.push(`${formatNumber(ngan, 2)} งาน`);
  if (+wah) parts.push(`${formatNumber(wah, 2)} ตร.วา`);
  return parts.join(" ") || "—";
}

/** ราคาแบบย่อ เช่น 2,500,000 → "2.5 ล้าน", 850,000 → "850,000" */
export function formatPriceShort(baht) {
  const n = Number(baht);
  if (n >= 1e6) return `${formatNumber(n / 1e6, 2)} ล้าน`;
  return formatNumber(n);
}

export const formatBaht = (baht) => `${formatNumber(baht)} บาท`;

/** ราคาต่อไร่ / ต่อตารางวา จากราคารวมและขนาด (ตร.วา) */
export function unitPrices(totalPrice, areaWah) {
  if (!areaWah) return { perRai: null, perWah: null };
  return { perRai: (totalPrice / areaWah) * 400, perWah: totalPrice / areaWah };
}

export const formatThaiDate = (iso) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

/**
 * อ่านพิกัดจากข้อความ: "13.7563, 100.5018" หรือลิงก์ Google Maps (…@13.75,100.50,17z / ?q=13.75,100.50)
 * คืน { lat, lng } หรือ null
 */
export function parseLatLng(text) {
  const m = String(text).match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** พิกัดอยู่ในกรอบประเทศไทยคร่าว ๆ หรือไม่ */
export const isInThailand = ({ lat, lng }) => lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106;

/** ตำบล + อำเภอ รวมเป็นข้อความเดียว (กรุงเทพฯ ใช้ แขวง/เขต) เช่น "ต.บางพลีใหญ่ อ.บางพลี" */
export function districtText(values) {
  const bkk = values.province === "กรุงเทพมหานคร";
  const strip = (v) => v.trim().replace(/^(ตำบล|ต\.|แขวง|อำเภอ|อ\.|เขต)\s*/, "");
  const sub = strip(values.subdistrict || "");
  const dist = strip(values.district || "");
  return [sub && `${bkk ? "แขวง" : "ต."}${sub}`, dist && `${bkk ? "เขต" : "อ."}${dist}`].filter(Boolean).join(" ");
}
