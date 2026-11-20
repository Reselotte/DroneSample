import useAuth from "../../hooks/useAuth";
import { PHONE_MODE, needsPhone, rememberNext } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { LockIcon } from "./Icons";
import { currentHref } from "../../lib/router";

/** ข้อความของแต่ละหน้าที่ต้องเข้าสู่ระบบก่อนใช้ */
const COPY = {
  post: { title: "ลงประกาศขายที่ดินฟรี", what: "ลงประกาศขาย" },
  callback: { title: "ให้ทีมงานติดต่อกลับ", what: "ขอให้ทีมงานติดต่อกลับ" },
  mylistings: { title: "ประกาศของฉัน", what: "ดูและแก้ไขประกาศของคุณ" },
};

/**
 * ครอบหน้าที่ต้องเข้าสู่ระบบก่อน (ลงประกาศ / ให้ติดต่อกลับ)
 * - ยังไม่เข้าระบบ → การ์ดชวนเข้าสู่ระบบ (เสร็จแล้วพากลับมาหน้านี้)
 * - เข้าระบบแล้วแต่ยังไม่มีเบอร์มือถือ → ให้ไปกรอกเบอร์ก่อน
 * - ครบแล้ว → แสดงหน้าตามปกติ
 * ฐานข้อมูลบังคับซ้ำอีกชั้น: submit_listing() / update_my_listing() ไม่รับคนที่ไม่เข้าระบบ (ดู supabase/schema.sql)
 */
export default function RequireLogin({ page, children }) {
  const { user, ready } = useAuth();
  if (!isSupabaseConfigured) return children;

  const copy = COPY[page] || { title: "เข้าสู่ระบบ", what: "ใช้งานส่วนนี้" };
  const here = currentHref() || `/${page}`; // จำที่อยู่เต็ม (เช่น /mylistings/12) ไว้พากลับ

  let card = null;
  if (!ready) {
    card = <div className="lands-msg">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  } else if (!user) {
    card = (
      <div className="rl-card">
        <div className="rl-ic"><LockIcon /></div>
        <h3>เข้าสู่ระบบก่อน{copy.what}</h3>
        <p>ใช้บัญชี Google, LINE หรือ Facebook ที่มีอยู่ ไม่ต้องตั้งรหัสผ่าน ใช้เวลาไม่ถึง 1 นาที</p>
        <ul className="rl-list">
          <li>กรอกชื่อและเบอร์ให้อัตโนมัติ ไม่ต้องพิมพ์ซ้ำ</li>
          <li>ทีมงานติดต่อกลับตามเบอร์ในบัญชีของคุณ</li>
          <li>ช่วยกันประกาศปลอมและสแปม</li>
        </ul>
        <a className="btn rl-btn" href="/login" onClick={() => rememberNext(here)}>เข้าสู่ระบบ / สมัครสมาชิก</a>
      </div>
    );
  } else if (needsPhone(user)) {
    card = (
      <div className="rl-card">
        <div className="rl-ic"><LockIcon /></div>
        <h3>{PHONE_MODE === "otp" ? "ยืนยันเบอร์มือถือก่อน" : "กรอกเบอร์มือถือก่อน"}{copy.what}</h3>
        <p>ทีมงานต้องใช้เบอร์มือถือเพื่อติดต่อกลับ กรอกครั้งเดียวใช้ได้ตลอด</p>
        <a className="btn rl-btn" href="/login" onClick={() => rememberNext(here)}>
          {PHONE_MODE === "otp" ? "ยืนยันเบอร์มือถือ" : "กรอกเบอร์มือถือ"}
        </a>
      </div>
    );
  }

  if (!card) return children;
  return (
    <section className="alt rl" data-page={page}>
      <div className="wrap">
        <h2>{copy.title}</h2>
        {card}
      </div>
    </section>
  );
}
