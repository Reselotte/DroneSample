/** เมนูด้านบน (page = ชื่อหน้าใน URL เช่น /home) */
export const NAV_ITEMS = [
  { page: "home", label: "หน้าแรก" },
  { page: "lands", label: "ซื้อขายที่ดิน" },
  { page: "works", label: "ตัวอย่างผลงาน" },
  { page: "steps", label: "ขั้นตอนการทำงาน" },
  { page: "callback", label: "ให้ติดต่อกลับ" },
  { page: "faq", label: "คำถามที่พบบ่อย" },
];

export const CONTACT_PAGE = "contact";

/** ลิงก์ "บริการของเรา" (ส่วนท้ายเว็บ + ท้ายแผงเมนูบนมือถือ) */
export const SERVICE_LINKS = [
  { href: "/", label: "เกษตรกรรม" },
  { href: "/", label: "โรงงานและอุตสาหกรรม" },
  { href: "/", label: "อสังหา / จัดสรร" },
  { href: "/callback", label: "นัดบินสำรวจพื้นที่" },
  { href: "/post", label: "ลงประกาศขาย + คำนวณราคา" },
  { href: "/lands", label: "ประกาศซื้อขายที่ดิน" },
];

/**
 * ทุกหน้าที่มีในเว็บ
 * lands = รายการที่ดิน (/lands/<รหัส> = หน้ารายละเอียด), post = ลงประกาศ, admin = แอดมิน (ไม่อยู่ในเมนู)
 */
export const PAGES = ["home", "lands", "post", "works", "steps", "callback", "faq", "contact", "admin", "login", "profile", "mylistings"];

/** ลิงก์เก่าที่ยังต้องใช้ได้ → หน้าใหม่ */
export const PAGE_ALIASES = { sell: "callback", calc: "post" }; // คำนวณราคาย้ายไปอยู่ในหน้าลงประกาศ
