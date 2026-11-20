/**
 * เมนูหลังบ้าน: แต่ละเมนูมีที่อยู่ของตัวเอง (/admin, /admin/colors)
 * ใช้ทั้งเมนูซ้ายในหน้าหลังบ้าน (คอม) และแผงเมนู ☰ (มือถือ, SiteHeader)
 * adminOnly = เห็นเฉพาะผู้ดูแลระบบ
 */
export const ADMIN_SECTIONS = [
  { key: "listings", href: "/admin", label: "จัดการประกาศ", title: "จัดการประกาศ", sub: "ตรวจ อนุมัติ และแก้ไขประกาศขายที่ดิน" },
  { key: "checklist", href: "/admin/checklist", label: "เช็กลิสต์ฝ่ายขาย", title: "เช็กลิสต์ฝ่ายขาย", sub: "ถามเจ้าของที่ดินทีละหัวข้อ สรุปและพิมพ์ได้" },
  { key: "colors", href: "/admin/colors", label: "คู่มือสีเว็บ", title: "คู่มือสีเว็บ", sub: "ชุดสีทั้งหมดของเว็บ ดาวน์โหลดไปใช้ต่อได้" },
  { key: "members", href: "/admin/members", label: "สมาชิก", title: "สมาชิก", sub: "บัญชีทั้งหมดในระบบ และระดับสิทธิ์ (ผู้ดูแลระบบเท่านั้น)", adminOnly: true },
  { key: "system", href: "/admin/system", label: "ตรวจระบบ", title: "ตรวจระบบ", sub: "เช็กความพร้อมของฐานข้อมูล และเช็กลิสต์ทดสอบฟีเจอร์ (ผู้ดูแลระบบเท่านั้น)", adminOnly: true },
];
