/**
 * ระดับสิทธิ์ของบัญชี (ตรงกับ profiles.role ใน supabase/schema.sql)
 * เพิ่ม/แก้ระดับ ต้องแก้ check ในตาราง profiles และฟังก์ชัน set_user_role ด้วย
 */
export const ROLES = [
  { value: "user", label: "ผู้ใช้งานทั่วไป", note: "ลงประกาศขาย และขอให้ทีมงานติดต่อกลับ" },
  { value: "agent", label: "นายหน้า", note: "นายหน้าที่ดิน (สิทธิ์เหมือนผู้ใช้งานทั่วไป ไม่เข้าหลังบ้าน)" },
  { value: "dealer", label: "ดีลเลอร์", note: "ตัวแทนขาย มีเพชรติดรูปโปรไฟล์ (สิทธิ์เหมือนผู้ใช้งานทั่วไป ไม่เข้าหลังบ้าน)" },
  { value: "staff", label: "ทีมงาน", note: "เข้าหลังบ้าน ดู อนุมัติ และแก้ไขประกาศ เห็นข้อมูลผู้ขาย (ลบไม่ได้)" },
  { value: "admin", label: "ผู้ดูแลระบบ", note: "ทำได้ทุกอย่าง ลบประกาศ และเปลี่ยนระดับสิทธิ์ของบัญชีอื่น" },
];

export const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value;


/** เข้าหลังบ้านได้ไหม */
export const canUseBackoffice = (role) => role === "staff" || role === "admin";
