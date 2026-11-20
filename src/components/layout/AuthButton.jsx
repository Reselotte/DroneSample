import { useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import { canUseBackoffice, roleLabel } from "../../data/roles";
import Avatar from "../common/Avatar";
import { PHONE_MODE, isPhoneVerified, needsPhone, phoneOf, profileOf, rememberNext, signOutUser } from "../../lib/auth";
import { formatThaiPhone } from "../../utils/thaiPhone";
import { currentHref } from "../../lib/router";

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
);

/**
 * ปุ่มเข้าสู่ระบบ (มุมขวาบน ข้างปุ่มธีม)
 * - ยังไม่เข้าระบบ: "เข้าสู่ระบบ" → หน้า /login (จำหน้าปัจจุบันไว้ เสร็จแล้วพากลับ)
 * - เข้าระบบแล้ว: รูปโปรไฟล์ กดเปิดเมนู (ชื่อ, เบอร์, ออกจากระบบ) · จุดแดง = ยังไม่ยืนยันเบอร์
 */
export default function AuthButton({ currentPage }) {
  const { user, ready } = useAuth();
  const role = useRole();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => setOpen(false), [currentPage]);

  if (!ready) return <span className="auth-btn is-loading" aria-hidden="true" />;

  if (!user) {
    return (
      <a
        className={`auth-btn is-guest${currentPage === "login" ? " on" : ""}`}
        href="/login"
        onClick={() => { if (currentPage !== "login") rememberNext(currentHref() || "/"); }}
        aria-label="เข้าสู่ระบบ"
      >
        <UserIcon />
        <span className="auth-label">เข้าสู่ระบบ</span>
      </a>
    );
  }

  const prof = profileOf(user);
  const pending = needsPhone(user);
  return (
    <div className="auth-box" ref={box}>
      <button
        type="button"
        className={`auth-btn is-user${pending ? " is-pending" : ""}`}
        aria-label={`บัญชีของ ${prof.name}${pending ? " (ยังไม่มีเบอร์มือถือ)" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar src={prof.avatar} name={prof.name} size={40} gem={role === "dealer"} />
        {pending && <i className="auth-dot" />}
      </button>
      {open && (
        <div className="auth-menu" role="menu">
          <div className="auth-menu-head">
            <b>{prof.name}{role && role !== "guest" && <em className={`adm-role is-${role}`}>{roleLabel(role)}</em>}</b>
            {prof.email && <small>{prof.email}</small>}
            {!pending && phoneOf(user) && (
              <small className={isPhoneVerified(user) ? "auth-ok" : undefined}>
                {isPhoneVerified(user) ? "✓ " : "โทร "}{formatThaiPhone(phoneOf(user))}
              </small>
            )}
          </div>
          {pending && (
            <a role="menuitem" className="auth-warn" href="/login" onClick={() => setOpen(false)}>
              ⚠ {PHONE_MODE === "otp" ? "ยืนยันเบอร์มือถือ" : "กรอกเบอร์มือถือ"}
            </a>
          )}
          <a role="menuitem" href="/mylistings" onClick={() => setOpen(false)}>ประกาศของฉัน</a>
          <a role="menuitem" href="/profile" onClick={() => setOpen(false)}>แก้ไขโปรไฟล์</a>
          {canUseBackoffice(role) && <a role="menuitem" href="/admin" onClick={() => setOpen(false)}>หลังบ้าน</a>}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); signOutUser(); }}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  );
}
