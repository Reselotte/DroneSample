/**
 * ===== แก้ค่าตรงนี้ที่เดียว =====
 * ข้อมูลติดต่อและการตั้งค่าของเว็บไซต์ทั้งหมดอยู่ที่ไฟล์นี้
 */
const siteConfig = {
  brand: "DroneSample",
  lineId: "@dronesample",
  qrImage: "", // ใส่ path รูป QR ของ LINE OA จริง (ถ้าว่างจะสร้าง QR ให้อัตโนมัติ)
  phone: "099-999-9999",
  email: "info@example.com",
  replyText: "ตอบกลับทาง LINE ในเวลาทำการ 09:00–18:00 น.",
  // URL ที่รับข้อมูลฟอร์ม "ให้ทีมงานติดต่อกลับ" (POST JSON) เช่น Google Apps Script / Make / n8n / Formspree
  formEndpoint: "",
};

siteConfig.lineUrl = "https://line.me/R/ti/p/" + encodeURIComponent(siteConfig.lineId);
siteConfig.phoneHref = "tel:" + siteConfig.phone.replace(/\D/g, "");
siteConfig.emailHref = "mailto:" + siteConfig.email;

export default siteConfig;
