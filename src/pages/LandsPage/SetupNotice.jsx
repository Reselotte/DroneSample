/** แสดงเมื่อยังไม่ได้ตั้งค่า Supabase (.env) */
export default function SetupNotice() {
  return (
    <div className="lands-msg">
      <b>ระบบประกาศขายที่ดินยังไม่เปิดใช้งาน</b>
      <span>ผู้ดูแลเว็บ: ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env (ดู README)</span>
    </div>
  );
}
