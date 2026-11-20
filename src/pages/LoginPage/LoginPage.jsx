import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  LOGIN_PROVIDERS, PHONE_MODE, authErrorText, fetchAuthSettings, isPhoneVerified, isProviderEnabled, needsPhone, phoneOf, profileOf,
  savePhone, sendPhoneOtp, signInWith, signInWithEmail, signOutUser, takeNext, verifyPhoneOtp,
} from "../../lib/auth";
import useAuth from "../../hooks/useAuth";
import { MOBILE_ERROR, PHONE_PLACEHOLDER, formatThaiPhone, isThaiMobile, normalizeThaiPhone, toE164 } from "../../utils/thaiPhone";
import SetupNotice from "../LandsPage/SetupNotice";
import BRAND_ICONS from "../../components/common/BrandIcons";
import { navigate } from "../../lib/router";

const RESEND_SECONDS = 60;

/** ข้อความเมื่อกลับมาจาก Google / LINE / Facebook แบบไม่สำเร็จ (?error=...&error_description=...) */
function oauthErrorText(code, desc) {
  if (!desc && !code) return "";
  const d = String(desc || "").toLowerCase();
  if (code === "access_denied" || d.includes("cancel") || d.includes("denied")) return "ยกเลิกการเข้าสู่ระบบ ลองใหม่ได้เลย";
  if (d.includes("exchange external code")) {
    return "เชื่อมต่อกับบัญชีนี้ไม่สำเร็จ (ระบบเข้าสู่ระบบยังตั้งค่าไม่ถูกต้อง) กรุณาลองช่องทางอื่น หรือแจ้งทีมงาน";
  }
  if (d.includes("email")) return "บัญชีนี้ไม่ได้แชร์อีเมล ระบบยังไม่รองรับ กรุณาลองช่องทางอื่น หรือแจ้งทีมงาน";
  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

/** แถบขั้นตอน: 1 เลือกบัญชี → 2 ยืนยันเบอร์ */
function Steps({ step }) {
  return (
    <ol className="lg-steps" aria-label="ขั้นตอนเข้าสู่ระบบ">
      {["เลือกบัญชี", PHONE_MODE === "otp" ? "ยืนยันเบอร์มือถือ" : "เบอร์มือถือ"].map((t, i) => (
        <li key={t} className={step > i + 1 ? "is-done" : step === i + 1 ? "is-on" : undefined}>
          <span>{step > i + 1 ? "✓" : i + 1}</span>{t}
        </li>
      ))}
    </ol>
  );
}

/** เข้าด้วยอีเมล + รหัสผ่าน (สำหรับบัญชีที่ตั้งรหัสผ่านไว้ในหน้าโปรไฟล์ → ความปลอดภัย) */
function EmailLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !pw) { setErr("กรุณากรอกอีเมลและรหัสผ่าน"); return; }
    setBusy(true);
    setErr("");
    try {
      await signInWithEmail(email.trim(), pw);
    } catch (x) {
      setErr(authErrorText(x));
      setBusy(false);
    }
  };

  return (
    <div className="lg-pw">
      <button type="button" className="lg-link lg-pw-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน {open ? "▴" : "▾"}
      </button>
      {open && <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="lg_email">อีเมล</label>
          <input id="lg_email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
        </div>
        <div className="field">
          <label htmlFor="lg_pw">รหัสผ่าน</label>
          <input id="lg_pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
        </div>
        {err && <p className="lg-err">{err}</p>}
        <button type="submit" className="btn lg-main" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
        <small className="lg-pw-note">ใช้ได้เมื่อตั้งรหัสผ่านไว้แล้วในหน้าโปรไฟล์ → ความปลอดภัย</small>
      </form>}
    </div>
  );
}

/** ขั้นที่ 1: เลือก Google / LINE / Facebook */
function ChooseProvider({ error }) {
  const [settings, setSettings] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState(error || "");

  useEffect(() => {
    fetchAuthSettings().then(setSettings).catch(() => { setFailed(true); setSettings({}); });
  }, []);

  const go = async (p) => {
    setErr("");
    setBusy(p.key);
    const { error: e } = await signInWith(p.provider);
    if (e) { setErr(authErrorText(e)); setBusy(""); }
    // สำเร็จ = เบราว์เซอร์ไปหน้าของ Google / LINE / Facebook แล้วกลับมาที่ /login
  };

  return (
    <>
      <h1 className="lg-title">เข้าสู่ระบบ / สมัครสมาชิก</h1>
      <p className="lg-sub">ใช้บัญชีที่มีอยู่แล้ว ไม่ต้องตั้งรหัสผ่านใหม่</p>
      <div className="lg-providers">
        {LOGIN_PROVIDERS.map((p) => {
          const on = settings && isProviderEnabled(p, settings);
          return (
            <button
              key={p.key}
              type="button"
              className={`lg-btn is-${p.key}`}
              disabled={!on || Boolean(busy)}
              onClick={() => go(p)}
            >
              <span className="lg-ic">{BRAND_ICONS[p.key]}</span>
              <span className="lg-btn-tx">
                {busy === p.key ? "กำลังไปหน้าเข้าสู่ระบบ…" : `ดำเนินการต่อด้วย ${p.label}`}
                {settings && !on && <small>ยังไม่เปิดใช้งาน</small>}
              </span>
            </button>
          );
        })}
      </div>
      <EmailLogin />
      {failed && <p className="lg-err">เช็กช่องทางเข้าสู่ระบบไม่สำเร็จ กรุณาลองรีเฟรชหน้า</p>}
      {err && <p className="lg-err">{err}</p>}
      <p className="lg-note">
        {PHONE_MODE === "otp"
          ? <><b>ต้องยืนยันเบอร์มือถือ</b> ด้วยรหัส OTP ทาง SMS หนึ่งครั้งหลังเข้าสู่ระบบ</>
          : <><b>ต้องกรอกเบอร์มือถือ</b> หนึ่งครั้งหลังเข้าสู่ระบบ</>}
        <br />เราใช้ชื่อ อีเมล และเบอร์ เพื่อยืนยันตัวตนและติดต่อกลับเท่านั้น
      </p>
    </>
  );
}

/** ขั้นที่ 2 (โหมด collect, ฟรี): กรอกเบอร์มือถือแล้วบันทึก ไม่ส่ง SMS */
function CollectPhone({ user, onDone }) {
  const prof = profileOf(user);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    if (!isThaiMobile(phone)) { setErr(MOBILE_ERROR); return; }
    setErr("");
    setBusy(true);
    try {
      await savePhone(normalizeThaiPhone(phone));
      onDone();
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="lg-who">
        {prof.avatar ? <img src={prof.avatar} alt="" referrerPolicy="no-referrer" /> : <span>{prof.name.slice(0, 1)}</span>}
        <div><b>{prof.name}</b><small>{prof.email}</small></div>
      </div>
      <h1 className="lg-title">เบอร์มือถือของคุณ</h1>
      <form onSubmit={save} noValidate>
        <p className="lg-sub">ใช้สำหรับให้ทีมงานติดต่อกลับ ทีมงานอาจโทรยืนยันเบอร์นี้</p>
        <div className={`field${err ? " has-err" : ""}`}>
          <label htmlFor="lg_phone">เบอร์มือถือ</label>
          <input
            id="lg_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder={PHONE_PLACEHOLDER}
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErr(""); }}
            autoFocus
          />
          <div className="err">{err}</div>
        </div>
        <button type="submit" className="btn lg-main" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกและเริ่มใช้งาน"}</button>
      </form>
      <button type="button" className="lg-link lg-out" onClick={signOutUser}>ใช้บัญชีอื่น / ออกจากระบบ</button>
    </>
  );
}

/** ขั้นที่ 2 (โหมด otp): ใส่เบอร์มือถือ → รับ OTP → ยืนยัน */
function VerifyPhone({ user, onDone }) {
  const prof = profileOf(user);
  const [phone, setPhone] = useState(user.new_phone ? `0${user.new_phone.slice(2)}` : "");
  const [sentTo, setSentTo] = useState(""); // +66… ที่ส่งรหัสไปแล้ว
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (!wait) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e) => {
    e?.preventDefault();
    if (!isThaiMobile(phone)) { setErr(MOBILE_ERROR); return; }
    setErr("");
    setBusy(true);
    try {
      const e164 = toE164(phone);
      await sendPhoneOtp(e164);
      setSentTo(e164);
      setCode("");
      setWait(RESEND_SECONDS);
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setErr("กรุณาใส่รหัส 6 หลักจาก SMS"); return; }
    setErr("");
    setBusy(true);
    try {
      await verifyPhoneOtp(sentTo, code);
      onDone();
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="lg-who">
        {prof.avatar ? <img src={prof.avatar} alt="" referrerPolicy="no-referrer" /> : <span>{prof.name.slice(0, 1)}</span>}
        <div><b>{prof.name}</b><small>{prof.email}</small></div>
      </div>
      <h1 className="lg-title">ยืนยันเบอร์มือถือ</h1>

      {!sentTo ? (
        <form onSubmit={send} noValidate>
          <p className="lg-sub">เราจะส่งรหัส 6 หลักไปทาง SMS</p>
          <div className={`field${err ? " has-err" : ""}`}>
            <label htmlFor="lg_phone">เบอร์มือถือ</label>
            <input
              id="lg_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder={PHONE_PLACEHOLDER}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErr(""); }}
              autoFocus
            />
            <div className="err">{err}</div>
          </div>
          <button type="submit" className="btn lg-main" disabled={busy}>{busy ? "กำลังส่งรหัส…" : "ส่งรหัส OTP"}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <p className="lg-sub">
            ส่งรหัสไปที่ <b>{formatThaiPhone(sentTo)}</b> แล้ว{" "}
            <button type="button" className="lg-link" onClick={() => { setSentTo(""); setErr(""); }}>เปลี่ยนเบอร์</button>
          </p>
          <div className={`field${err ? " has-err" : ""}`}>
            <label htmlFor="lg_code">รหัส OTP 6 หลัก</label>
            <input
              id="lg_code"
              ref={codeRef}
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
          <p className="lg-resend">
            ไม่ได้รับรหัส?{" "}
            {wait > 0
              ? <span>ส่งใหม่ได้ใน {wait} วินาที</span>
              : <button type="button" className="lg-link" disabled={busy} onClick={send}>ส่งรหัสอีกครั้ง</button>}
          </p>
        </form>
      )}

      <button type="button" className="lg-link lg-out" onClick={signOutUser}>ใช้บัญชีอื่น / ออกจากระบบ</button>
    </>
  );
}

/** เข้าสู่ระบบครบแล้ว */
function SignedIn({ user }) {
  const prof = profileOf(user);
  const [next] = useState(takeNext); // อ่านครั้งเดียว (takeNext ลบค่าที่จำไว้ทิ้ง)
  return (
    <>
      <div className="lg-ok" aria-hidden="true">✓</div>
      <h1 className="lg-title">เข้าสู่ระบบแล้ว</h1>
      <div className="lg-who is-center">
        {prof.avatar ? <img src={prof.avatar} alt="" referrerPolicy="no-referrer" /> : <span>{prof.name.slice(0, 1)}</span>}
        <div>
          <b>{prof.name}</b>
          {phoneOf(user) && <small>เบอร์ {formatThaiPhone(phoneOf(user))}{isPhoneVerified(user) ? " ✓ ยืนยันแล้ว" : ""}</small>}
        </div>
      </div>
      <a className="btn lg-main" href={next}>ไปต่อ</a>
      <button type="button" className="lg-link lg-out" onClick={signOutUser}>ออกจากระบบ</button>
    </>
  );
}

/** หน้าเข้าสู่ระบบ (/login) */
export default function LoginPage() {
  const { user, ready } = useAuth();
  const [oauthError] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return oauthErrorText(q.get("error"), q.get("error_description"));
  });

  // กลับมาจาก Google / LINE / Facebook: ลบ ?code= / ?error= ออกจากที่อยู่เว็บ (ระบบใช้รหัสไปแล้ว)
  useEffect(() => {
    if (ready && window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, [ready]);

  // ยืนยันเบอร์เสร็จ → พากลับหน้าที่อยู่ก่อนกดเข้าสู่ระบบ
  const done = () => { navigate(takeNext()); };

  let body;
  let step = 1;
  if (!isSupabaseConfigured) body = <SetupNotice />;
  else if (!ready) body = <p className="lg-sub">กำลังตรวจสอบ…</p>;
  else if (!user) body = <ChooseProvider error={oauthError} />;
  else if (needsPhone(user)) {
    step = 2;
    body = PHONE_MODE === "otp" ? <VerifyPhone user={user} onDone={done} /> : <CollectPhone user={user} onDone={done} />;
  }
  else { step = 3; body = <SignedIn user={user} />; }

  return (
    <section className="alt lg" data-page="login">
      <div className="wrap">
        <div className="lg-card">
          {isSupabaseConfigured && ready && step < 3 && <Steps step={step} />}
          {body}
        </div>
      </div>
    </section>
  );
}
