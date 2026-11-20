import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  PHONE_MODE, authErrorText, hasPassword, isPhoneVerified, listTotp, phoneOf, profileOf, providerAvatarOf, rememberNext, removeAvatar,
  removeTotp, savePhone, setPassword, signOutEverywhere, signOutUser, startTotp, updateProfile, uploadAvatar, verifyTotp,
} from "../../lib/auth";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import { roleLabel } from "../../data/roles";
import Avatar from "../../components/common/Avatar";
import { useToast } from "../../hooks/useToast";
import { MOBILE_ERROR, PHONE_PLACEHOLDER, formatThaiPhone, isThaiMobile, normalizeThaiPhone } from "../../utils/thaiPhone";
import { formatThaiDate } from "../../utils/listingFormat";
import BRAND_ICONS from "../../components/common/BrandIcons";
import SetupNotice from "../LandsPage/SetupNotice";
import { useConfirm } from "../../hooks/useConfirm";
import { currentHref, navigate } from "../../lib/router";

/** เมนูซ้าย: /profile = ข้อมูลส่วนตัว, /profile/security = ความปลอดภัย */
const TABS = [
  { key: "", label: "ข้อมูลส่วนตัว", href: "/profile", title: "ข้อมูลส่วนตัว", sub: "จัดการชื่อ ช่องทางติดต่อ และบัญชีที่ใช้เข้าสู่ระบบ" },
  { key: "security", label: "ความปลอดภัย", href: "/profile/security", title: "ความปลอดภัย", sub: "รหัสผ่าน การยืนยันตัวตน 2 ขั้นตอน และการออกจากระบบ" },
];

/** ชื่อช่องทางเข้าสู่ระบบ: google / facebook / custom:line → { key, label } */
function providerInfo(provider = "") {
  const name = provider.replace(/^custom:/, "");
  if (name === "google") return { key: "google", label: "Google" };
  if (name === "facebook") return { key: "facebook", label: "Facebook" };
  if (name.includes("line")) return { key: "line", label: "LINE" };
  if (name === "email") return { key: "email", label: "อีเมล" };
  return { key: name, label: name.toUpperCase() };
}

/** แถวในการ์ด: ซ้าย = ชื่อหัวข้อ + คำอธิบาย, ขวา = ช่องกรอก */
function Row({ label, hint, htmlFor, children, err }) {
  return (
    <div className={`pf-row${err ? " has-err" : ""}`}>
      <div className="pf-row-l">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <b>{label}</b>}
        {hint && <small>{hint}</small>}
      </div>
      <div className="pf-row-r">
        {children}
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );
}

// ── รูปโปรไฟล์ ───────────────────────────────────────────────────────

const MAX_PHOTO_MB = 15;

function PhotoBox({ user, role }) {
  const toast = useToast();
  const prof = profileOf(user);
  const custom = Boolean(user.user_metadata?.avatar_custom);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(""); // "upload" | "remove"
  const [err, setErr] = useState("");

  const run = async (key, job, done) => {
    setBusy(key);
    setErr("");
    try {
      await job();
      toast(done);
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
    }
    setBusy("");
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setErr(`ไฟล์ใหญ่เกินไป (ไม่เกิน ${MAX_PHOTO_MB} MB)`); return; }
    run("upload", () => uploadAvatar(user, file), "เปลี่ยนรูปโปรไฟล์แล้ว");
  };

  return (
    <div className="pf-sec">
      <h2 className="pf-h">รูปโปรไฟล์</h2>
      <div className="pf-box">
        <Row label="รูปโปรไฟล์" hint="JPG หรือ PNG ระบบตัดเป็นสี่เหลี่ยมจัตุรัสตรงกลางและย่อให้อัตโนมัติ">
          <div className="pf-photo">
            <Avatar src={prof.avatar} name={prof.name} size={88} gem={role === "dealer"} />
            <div className="pf-photo-btns">
              <button type="button" className="btn pf-save pf-sm" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}>
                {busy === "upload" ? "กำลังอัปโหลด…" : "อัปโหลดรูปใหม่"}
              </button>
              {custom && (
                <button type="button" className="btn btn-ghost pf-sm" disabled={Boolean(busy)} onClick={() => run("remove", () => removeAvatar(user), "เปลี่ยนรูปโปรไฟล์แล้ว")}>
                  {busy === "remove" ? "กำลังเปลี่ยน…" : providerAvatarOf(user) ? `ใช้รูปจาก ${providerInfo(prof.provider).label}` : "ลบรูป"}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={onFile} />
          </div>
        </Row>
        {err && <div className="pf-foot"><span className="pf-state is-dirty">{err}</span></div>}
      </div>
    </div>
  );
}

// ── ข้อมูลส่วนตัว ────────────────────────────────────────────────────────────

/** ค่าเริ่มต้นของฟอร์มจากบัญชี (ชื่อ-นามสกุลยังไม่เคยกรอก → แยกจากชื่อเต็มของ Google / Facebook ให้ก่อน) */
function toForm(user) {
  const m = user.user_metadata || {};
  const [first = "", ...rest] = String(m.full_name || m.name || "").trim().split(/\s+/);
  const display = profileOf(user).name;
  return {
    firstName: m.first_name ?? first,
    lastName: m.last_name ?? rest.join(" "),
    name: display === user.email ? "" : display,
    phone: phoneOf(user) ? formatThaiPhone(phoneOf(user)) : "",
    lineId: m.line_id || "",
  };
}

function PreferencesTab({ user, role }) {
  const toast = useToast();
  const prof = profileOf(user);
  const initial = useMemo(() => toForm(user), [user]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const phoneLocked = PHONE_MODE === "otp" && isPhoneVerified(user); // โหมด OTP: เบอร์ที่ยืนยันแล้วเปลี่ยนผ่านทีมงานเท่านั้น
  const loginWith = providerInfo(prof.provider).label;
  const identities = user.identities || [];

  useEffect(() => setForm(initial), [initial]);

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((er) => (er[field] ? { ...er, [field]: undefined } : er));
    },
  });

  const save = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร";
    if (!phoneLocked && !isThaiMobile(form.phone)) next.phone = MOBILE_ERROR;
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      // เปลี่ยนเบอร์ → ฐานข้อมูลเช็กก่อนว่าไม่ซ้ำกับบัญชีอื่น (ซ้ำ = ไม่บันทึกอะไรเลย)
      const phone = normalizeThaiPhone(form.phone);
      if (!phoneLocked && phone !== phoneOf(user)) await savePhone(phone);
      await updateProfile({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        display_name: form.name.trim(),
        line_id: form.lineId.trim(),
      });
      toast("บันทึกข้อมูลส่วนตัวแล้ว");
    } catch (x) {
      console.error(x);
      setErrors({ save: authErrorText(x) });
    }
    setBusy(false);
  };

  return (
    <>
      <PhotoBox user={user} role={role} />
      <div className="pf-sec">
        <h2 className="pf-h">ข้อมูลโปรไฟล์</h2>
        <form className="pf-box" onSubmit={save} noValidate>
          <Row label="ชื่อ-นามสกุล" hint="ชื่อจริง ใช้ในเอกสารซื้อขาย ไม่แสดงบนเว็บ" htmlFor="pf_first">
            <div className="pf-two">
              <input id="pf_first" maxLength={60} autoComplete="given-name" placeholder="ชื่อ" aria-label="ชื่อ" {...bind("firstName")} />
              <input id="pf_last" maxLength={60} autoComplete="family-name" placeholder="นามสกุล" aria-label="นามสกุล" {...bind("lastName")} />
            </div>
          </Row>
          <Row label="ชื่อที่แสดง" hint="ชื่อที่เห็นบนเว็บและในเมนูบัญชี" htmlFor="pf_name" err={errors.name}>
            <input id="pf_name" maxLength={60} autoComplete="nickname" {...bind("name")} />
          </Row>
          <Row
            label={<>เบอร์มือถือ <span className="req">*</span>{isPhoneVerified(user) && <span className="pf-verified">✓ ยืนยันแล้ว</span>}</>}
            hint={phoneLocked ? "เบอร์นี้ยืนยันด้วย OTP แล้ว ต้องการเปลี่ยนกรุณาติดต่อทีมงาน" : "ทีมงานใช้เบอร์นี้ติดต่อกลับ และอาจโทรยืนยัน"}
            htmlFor="pf_phone"
            err={errors.phone}
          >
            <input id="pf_phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder={PHONE_PLACEHOLDER} readOnly={phoneLocked} {...bind("phone")} />
          </Row>
          <Row label={<>LINE ID <span className="opt">(ไม่บังคับ)</span></>} hint="ให้ทีมงานทักทาง LINE ได้" htmlFor="pf_line">
            <input id="pf_line" maxLength={50} placeholder="เช่น somchai123" {...bind("lineId")} />
          </Row>
          <Row label="อีเมล" hint={`มาจากบัญชี ${loginWith || "ที่ใช้เข้าสู่ระบบ"} เปลี่ยนที่นี่ไม่ได้`} htmlFor="pf_email">
            <input id="pf_email" value={prof.email || "— (บัญชีนี้ไม่ได้แชร์อีเมล)"} readOnly />
          </Row>
          <div className="pf-foot">
            <span className={`pf-state${dirty ? " is-dirty" : ""}`}>{errors.save || (dirty ? "● มีการแก้ไขที่ยังไม่บันทึก" : "")}</span>
            <button type="button" className="btn btn-ghost" disabled={!dirty || busy} onClick={() => { setForm(initial); setErrors({}); }}>ยกเลิก</button>
            <button type="submit" className="btn pf-save" disabled={!dirty || busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
          </div>
        </form>
      </div>

      <div className="pf-sec">
        <h2 className="pf-h">บัญชีที่เชื่อมต่อ</h2>
        <p className="pf-sec-sub">บัญชีที่ใช้เข้าสู่ระบบเว็บนี้ได้</p>
        <div className="pf-box">
          {identities.length === 0 && <div className="pf-row"><small className="pf-muted">ไม่พบข้อมูล</small></div>}
          {identities.map((idn) => {
            const p = providerInfo(idn.provider);
            return (
              <div className="pf-conn" key={idn.id || idn.identity_id || idn.provider}>
                <span className={`pf-conn-ic is-${p.key}`}>{BRAND_ICONS[p.key] || p.label.slice(0, 1)}</span>
                <div className="pf-conn-tx">
                  <b>{p.label} <span className="pf-tag is-on">เชื่อมต่อแล้ว</span></b>
                  <small>{idn.identity_data?.email || idn.identity_data?.name || "—"} · ตั้งแต่ {formatThaiDate(idn.created_at)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── ความปลอดภัย ─────────────────────────────────────────────────────────────

const PW_RULES = [
  { test: (v) => v.length >= 8, label: "อย่างน้อย 8 ตัว" },
  { test: (v) => /[A-Za-z]/.test(v), label: "มีตัวอักษรภาษาอังกฤษ" },
  { test: (v) => /\d/.test(v), label: "มีตัวเลข" },
];

function PasswordBox({ user }) {
  const toast = useToast();
  const has = hasPassword(user);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = PW_RULES.every((r) => r.test(pw));

  const close = () => { setOpen(false); setPw(""); setPw2(""); setErr(""); };
  const save = async (e) => {
    e.preventDefault();
    if (!ok) { setErr("รหัสผ่านยังไม่ตรงเงื่อนไข"); return; }
    if (pw !== pw2) { setErr("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    setBusy(true);
    try {
      await setPassword(pw);
      toast(has ? "เปลี่ยนรหัสผ่านแล้ว" : "ตั้งรหัสผ่านแล้ว");
      close();
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
    }
    setBusy(false);
  };

  if (!user.email) {
    return (
      <div className="pf-box">
        <Row label="รหัสผ่าน" hint="บัญชีนี้ไม่ได้แชร์อีเมล จึงตั้งรหัสผ่านไม่ได้ เข้าสู่ระบบด้วยช่องทางเดิมได้ตามปกติ">
          <span className="pf-tag">ใช้ไม่ได้</span>
        </Row>
      </div>
    );
  }

  return (
    <form className="pf-box" onSubmit={save} noValidate>
      <Row
        label="รหัสผ่าน"
        hint={<>ใช้เข้าสู่ระบบด้วยอีเมล <b>{user.email}</b> + รหัสผ่าน ได้อีกทาง นอกจาก Google / LINE / Facebook</>}
      >
        <div className="pf-inline">
          <span className={`pf-tag${has ? " is-on" : ""}`}>{has ? "ตั้งไว้แล้ว" : "ยังไม่ได้ตั้ง"}</span>
          {!open && <button type="button" className="btn btn-ghost pf-sm" onClick={() => setOpen(true)}>{has ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}</button>}
        </div>
      </Row>
      {open && (
        <>
          <Row label="รหัสผ่านใหม่" htmlFor="pf_pw">
            <input id="pf_pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
            <ul className="pf-rules">
              {PW_RULES.map((r) => <li key={r.label} className={r.test(pw) ? "is-ok" : undefined}>{r.test(pw) ? "✓" : "•"} {r.label}</li>)}
            </ul>
          </Row>
          <Row label="ยืนยันรหัสผ่านใหม่" htmlFor="pf_pw2">
            <input id="pf_pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(""); }} />
          </Row>
          <div className="pf-foot">
            <span className="pf-state is-dirty">{err}</span>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>ยกเลิก</button>
            <button type="submit" className="btn pf-save" disabled={busy || !pw || !pw2}>{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่าน"}</button>
          </div>
        </>
      )}
    </form>
  );
}

/** QR จาก Supabase เป็น SVG ดิบ ("data:image/svg+xml;utf-8,<svg…") ซึ่งมีอักขระอย่าง # ที่ทำให้รูปเสีย → เข้ารหัสใหม่ให้ถูก */
function qrSrc(qr = "") {
  const m = /^data:image\/svg\+xml;(?:utf-8|charset=utf-8),/i.exec(qr);
  if (!m) return qr;
  const raw = qr.slice(m[0].length);
  return `data:image/svg+xml;charset=utf-8,${raw.trimStart().startsWith("<") ? encodeURIComponent(raw) : raw}`;
}

function TwoFactorBox() {
  const ask = useConfirm();
  const toast = useToast();
  const [factors, setFactors] = useState(null); // null = กำลังโหลด
  const [setup, setSetup] = useState(null); // { id, qr, secret } ระหว่างผูกแอป
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const on = Boolean(factors?.length);

  const load = () => listTotp().then(({ verified }) => setFactors(verified)).catch((x) => { console.error(x); setFactors([]); setErr(authErrorText(x)); });
  useEffect(() => { load(); }, []);

  const begin = async () => {
    setBusy(true);
    setErr("");
    try { setSetup(await startTotp()); } catch (x) { console.error(x); setErr(authErrorText(x)); }
    setBusy(false);
  };
  const cancel = async () => {
    const id = setup?.id;
    setSetup(null); setCode(""); setErr("");
    if (id) removeTotp(id).catch(() => {});
  };
  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await verifyTotp(setup.id, code);
      setSetup(null); setCode("");
      toast("เปิดการยืนยันตัวตน 2 ขั้นตอนแล้ว");
      await load();
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
      setCode("");
    }
    setBusy(false);
  };
  const turnOff = async () => {
    if (!(await ask({ title: "ปิดการยืนยันตัวตน 2 ขั้นตอน?", message: "หลังปิด เข้าสู่ระบบได้โดยไม่ต้องใช้รหัสจากแอป บัญชีจะปลอดภัยน้อยลง", confirmText: "ปิด 2FA", tone: "danger" }))) return;
    setBusy(true);
    setErr("");
    try {
      await Promise.all(factors.map((f) => removeTotp(f.id)));
      toast("ปิดการยืนยันตัวตน 2 ขั้นตอนแล้ว");
      await load();
    } catch (x) {
      console.error(x);
      setErr(authErrorText(x));
    }
    setBusy(false);
  };
  const copySecret = () => {
    navigator.clipboard?.writeText(setup.secret).then(() => toast("คัดลอกรหัสแล้ว"), () => {});
  };

  return (
    <div className="pf-box">
      <Row label="แอปยืนยันตัวตน (Authenticator)" hint="ทุกครั้งที่เข้าสู่ระบบ ต้องกรอกรหัส 6 หลักจากแอปในมือถือเพิ่ม ถึงมีคนรู้รหัสผ่านหรือเข้าบัญชีโซเชียลของคุณได้ ก็เข้าเว็บนี้แทนคุณไม่ได้">
        <div className="pf-inline">
          {factors === null
            ? <span className="pf-muted">กำลังโหลด…</span>
            : <span className={`pf-tag${on ? " is-on" : ""}`}>{on ? "เปิดอยู่" : "ปิดอยู่"}</span>}
          {factors && !on && !setup && <button type="button" className="btn pf-save pf-sm" disabled={busy} onClick={begin}>{busy ? "กำลังเตรียม…" : "เปิดใช้งาน"}</button>}
          {on && <button type="button" className="btn btn-ghost pf-sm pf-danger-btn" disabled={busy} onClick={turnOff}>ปิดใช้งาน</button>}
        </div>
        {on && <small className="pf-muted">เปิดเมื่อ {formatThaiDate(factors[0].created_at)}</small>}
      </Row>

      {setup && (
        <form className="pf-2fa" onSubmit={confirm} noValidate>
          <ol className="pf-2fa-steps">
            <li>
              <b>ติดตั้งแอปยืนยันตัวตนในมือถือ</b>
              <small>เช่น Google Authenticator หรือ Microsoft Authenticator (ฟรี)</small>
            </li>
            <li>
              <b>เปิดแอป → เพิ่มบัญชี → สแกน QR นี้</b>
              <div className="pf-qr"><img src={qrSrc(setup.qr)} alt="QR สำหรับสแกนด้วยแอปยืนยันตัวตน" /></div>
              <small>สแกนไม่ได้? พิมพ์รหัสนี้ในแอปแทน</small>
              <div className="pf-secret">
                <code>{setup.secret}</code>
                <button type="button" className="btn btn-ghost pf-sm" onClick={copySecret}>คัดลอก</button>
              </div>
            </li>
            <li>
              <b>กรอกรหัส 6 หลักที่แอปแสดง</b>
              <input
                className="lg-code pf-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                aria-label="รหัส 6 หลักจากแอป"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }}
              />
            </li>
          </ol>
          <div className="pf-foot">
            <span className="pf-state is-dirty">{err}</span>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={cancel}>ยกเลิก</button>
            <button type="submit" className="btn pf-save" disabled={busy || code.length !== 6}>{busy ? "กำลังตรวจสอบ…" : "ยืนยันและเปิดใช้งาน"}</button>
          </div>
        </form>
      )}
      {!setup && err && <div className="pf-foot"><span className="pf-state is-dirty">{err}</span></div>}
    </div>
  );
}

function SecurityTab({ user }) {
  const ask = useConfirm();
  const logoutAll = async () => {
    if (!(await ask({ title: "ออกจากระบบทุกอุปกรณ์?", message: "รวมถึงเครื่องนี้ด้วย ต้องเข้าสู่ระบบใหม่ทุกเครื่อง", confirmText: "ออกจากระบบ", tone: "warn" }))) return;
    await signOutEverywhere();
    navigate("/");
  };
  return (
    <>
      <div className="pf-sec">
        <h2 className="pf-h">รหัสผ่าน</h2>
        <PasswordBox user={user} />
      </div>
      <div className="pf-sec">
        <h2 className="pf-h">ยืนยันตัวตน 2 ขั้นตอน (2FA)</h2>
        <p className="pf-sec-sub">เพิ่มความปลอดภัยให้บัญชีอีกชั้น</p>
        <TwoFactorBox />
      </div>
      <div className="pf-sec">
        <h2 className="pf-h">การเข้าสู่ระบบ</h2>
        <div className="pf-box">
          <Row label="ออกจากระบบทุกอุปกรณ์" hint="ใช้เมื่อลืมออกจากระบบในเครื่องอื่น หรือสงสัยว่ามีคนใช้บัญชีของคุณ">
            <div className="pf-inline">
              <button type="button" className="btn btn-ghost pf-sm pf-danger-btn" onClick={logoutAll}>ออกจากระบบทุกอุปกรณ์</button>
            </div>
          </Row>
        </div>
      </div>
    </>
  );
}

// ── โครงหน้า ────────────────────────────────────────────────────────────────

function ProfileLayout({ user, tab }) {
  const role = useRole();
  const prof = profileOf(user);
  const cur = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className="pf-layout">
      <aside className="pf-side">
        <a className="pf-back" href="/">← กลับหน้าแรก</a>
        <div className="pf-me">
          <Avatar src={prof.avatar} name={prof.name} size={72} gem={role === "dealer"} />
          <div className="pf-me-tx">
            <b>{prof.name}</b>
            {prof.email && <small>{prof.email}</small>}
            <div className="pf-badges">
              {role && role !== "guest" && <span className={`pf-badge adm-role is-${role}`}>{roleLabel(role)}</span>}
              <span className="pf-badge">สมาชิกตั้งแต่ {formatThaiDate(user.created_at)}</span>
            </div>
          </div>
        </div>
        <nav className="pf-nav" aria-label="ตั้งค่าบัญชี">
          <div className="pf-nav-h">ตั้งค่าบัญชี</div>
          {TABS.map((t) => (
            <a key={t.key} href={t.href} className={t.key === cur.key ? "is-on" : undefined} aria-current={t.key === cur.key ? "page" : undefined}>{t.label}</a>
          ))}
          <div className="pf-nav-h">อื่น ๆ</div>
          <a href="/mylistings">ประกาศของฉัน</a>
          <button type="button" onClick={async () => { await signOutUser(); navigate("/"); }}>ออกจากระบบ</button>
        </nav>
      </aside>

      <div className="pf-main">
        <div className="pf-top">
          <h1>{cur.title}</h1>
          <p>{cur.sub}</p>
        </div>
        {cur.key === "security" ? <SecurityTab user={user} /> : <PreferencesTab user={user} role={role} />}
      </div>
    </div>
  );
}

/** หน้าโปรไฟล์ (/profile, /profile/security) — ต้องเข้าสู่ระบบก่อน */
export default function ProfilePage({ param }) {
  const { user, ready } = useAuth();

  let body;
  if (!isSupabaseConfigured) body = <SetupNotice />;
  else if (!ready) body = <div className="lands-msg">กำลังโหลด…</div>;
  else if (!user) {
    body = (
      <div className="lands-msg">
        <b>กรุณาเข้าสู่ระบบก่อน</b>
        <a className="btn" href="/login" onClick={() => rememberNext(currentHref() || "/profile")}>เข้าสู่ระบบ</a>
      </div>
    );
  } else body = <ProfileLayout user={user} tab={param || ""} />;

  return (
    <section className="alt pf-page" data-page="profile">
      <div className="wrap">{body}</div>
    </section>
  );
}
