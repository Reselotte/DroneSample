import { useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { authErrorText, listTotp, mfaNeeded, signOutUser, verifyTotp } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { LockIcon } from "./Icons";

/** หน้ากรอกรหัส 6 หลักจากแอปยืนยันตัวตน (บัญชีที่เปิด 2FA ไว้) */
function MfaChallenge() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { verified } = await listTotp();
      if (!verified[0]) throw new Error("no factor");
      await verifyTotp(verified[0].id, code);
      // สำเร็จ → session อัปเกรด → MfaGate แสดงหน้าเดิมให้เอง
    } catch (x) {
      setErr(authErrorText(x));
      setCode("");
      setBusy(false);
    }
  };

  return (
    <section className="alt lg" data-page="mfa">
      <div className="wrap">
        <form className="lg-card mfa-card" onSubmit={submit} noValidate>
          <div className="rl-ic"><LockIcon /></div>
          <h1 className="lg-title">ยืนยันตัวตน 2 ขั้นตอน</h1>
          <p className="lg-sub">เปิดแอปยืนยันตัวตน (เช่น Google Authenticator) แล้วกรอกรหัส 6 หลักของบัญชีนี้</p>
          <div className={`field${err ? " has-err" : ""}`}>
            <label htmlFor="mfa_code">รหัส 6 หลักจากแอป</label>
            <input
              id="mfa_code"
              ref={ref}
              className="lg-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
            />
            <div className="err">{err}</div>
          </div>
          <button type="submit" className="btn lg-main" disabled={busy || code.length !== 6}>{busy ? "กำลังตรวจสอบ…" : "ยืนยัน"}</button>
          <button type="button" className="lg-link lg-out" onClick={signOutUser}>ใช้บัญชีอื่น / ออกจากระบบ</button>
        </form>
      </div>
    </section>
  );
}

/**
 * ครอบหน้าที่ใช้บัญชี: ถ้าบัญชีเปิด 2FA ไว้แต่ยังไม่ได้กรอกรหัสรอบนี้ → ให้กรอกก่อน
 * (เช็กใหม่ทุกครั้งที่ session เปลี่ยน เช่น เข้าสู่ระบบ / ยืนยันรหัสเสร็จ)
 */
export default function MfaGate({ children }) {
  const { session, ready } = useAuth();
  const token = session?.access_token;
  const [needed, setNeeded] = useState(null); // null = กำลังเช็ก

  useEffect(() => {
    if (!token) { setNeeded(false); return undefined; }
    let live = true; // ไม่รีเซ็ตเป็น null ตอนต่ออายุ token (กันหน้าที่กรอกค้างอยู่ถูกล้าง)
    mfaNeeded().then((v) => { if (live) setNeeded(v); });
    return () => { live = false; };
  }, [token]);

  if (!isSupabaseConfigured || !ready || !session || needed === false) return children;
  if (needed === null) return <div className="lands-msg">กำลังตรวจสอบ…</div>;
  return <MfaChallenge />;
}
