import siteConfig from "../config/siteConfig";
import { trackLineClick } from "./trackLineClick";

/**
 * คัดลอกข้อความ แล้วเปิด LINE OA ของทีมงาน ให้ผู้ใช้วางข้อความในแชทได้ทันที
 * toast = ฟังก์ชันจาก useToast()
 * เรียกจาก onClick โดยตรง (ไม่มี await ก่อน window.open) เพื่อไม่ให้เบราว์เซอร์บล็อกหน้าต่างใหม่
 */
export function sendLineMessage(message, toast) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(message)
      .then(() => toast("คัดลอกข้อความแล้ว วางในแชท LINE ได้ทันที"))
      .catch(() => {});
  }
  trackLineClick();
  window.open(siteConfig.lineUrl, "_blank", "noopener");
}
