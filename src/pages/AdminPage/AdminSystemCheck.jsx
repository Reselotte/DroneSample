import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { profileOf } from "../../lib/auth";
import { runSystemChecks } from "../../lib/systemCheck";
import { ROLES } from "../../data/roles";
import Avatar from "../../components/common/Avatar";
import { useConfirm } from "../../hooks/useConfirm";

/** เช็กลิสต์ทดสอบด้วยมือ (ติ๊กแล้วจำไว้ในเครื่องนี้) */
const MANUAL = [
  {
    title: "เข้าสู่ระบบ",
    items: [
      { id: "login-google", text: "เข้าสู่ระบบด้วย Google ได้ แล้วพากลับมาหน้าที่อยู่ก่อนกด", href: "/login" },
      { id: "login-phone", text: "บัญชีใหม่ถูกขอเบอร์มือถือก่อนใช้งาน" },
      { id: "login-phone-dup", text: "ใช้อีกบัญชีกรอกเบอร์ที่มีคนใช้แล้ว ต้องขึ้น \"เบอร์นี้ผูกกับบัญชีอื่นแล้ว\" (ทั้งตอนสมัครและในหน้าโปรไฟล์)" },
      { id: "login-gate", text: "ยังไม่เข้าระบบ เปิดหน้าลงประกาศ / ให้ติดต่อกลับ แล้วถูกขอให้เข้าสู่ระบบก่อน", href: "/post" },
      { id: "login-email", text: "เข้าสู่ระบบด้วยอีเมล + รหัสผ่านได้ (หลังตั้งรหัสผ่านแล้ว)", href: "/login" },
    ],
  },
  {
    title: "โปรไฟล์",
    items: [
      { id: "pf-save", text: "แก้ชื่อ-นามสกุล ชื่อที่แสดง เบอร์ LINE แล้วบันทึกได้", href: "/profile" },
      { id: "pf-photo", text: "อัปโหลดรูปโปรไฟล์ แล้วรูปเปลี่ยนที่ปุ่มบัญชีมุมขวาบนด้วย", href: "/profile" },
      { id: "pf-photo-back", text: "กด \"ใช้รูปจาก Google\" แล้วกลับเป็นรูปเดิม", href: "/profile" },
      { id: "pf-mobile", text: "บนมือถือ เมนู ☰ ในหน้าโปรไฟล์เป็นเมนูตั้งค่าบัญชี และแถบที่เลือกตรงกับหน้าที่อยู่", href: "/profile/security" },
    ],
  },
  {
    title: "ความปลอดภัย",
    items: [
      { id: "sec-pw", text: "ตั้งรหัสผ่านได้ (ป้ายเปลี่ยนเป็น \"ตั้งไว้แล้ว\")", href: "/profile/security" },
      { id: "sec-2fa-on", text: "เปิด 2FA: สแกน QR ด้วยแอป แล้วยืนยันรหัส 6 หลักได้", href: "/profile/security" },
      { id: "sec-2fa-login", text: "ออกจากระบบแล้วเข้าใหม่ ระบบขอรหัสจากแอปก่อนเข้าหน้าโปรไฟล์ / หลังบ้าน" },
      { id: "sec-2fa-off", text: "ปิด 2FA ได้", href: "/profile/security" },
    ],
  },
  {
    title: "ประกาศของฉัน",
    items: [
      { id: "ml-post", text: "ลงประกาศใหม่ แล้วเห็นในหน้า \"ประกาศของฉัน\"", href: "/post" },
      { id: "ml-edit", text: "แก้ไขประกาศตัวเอง แล้วสถานะกลับเป็น \"รอทีมงานตรวจ\"", href: "/mylistings" },
      { id: "ml-button", text: "หน้าประกาศขึ้นปุ่ม \"แก้ไขประกาศของฉัน\" เฉพาะเจ้าของ", href: "/lands" },
      { id: "ml-other", text: "ใช้อีกบัญชีเปิดลิงก์แก้ไขประกาศของคนอื่น ต้องขึ้น \"แก้ไขประกาศนี้ไม่ได้\"" },
    ],
  },
  {
    title: "ระดับสมาชิก",
    items: [
      { id: "role-dealer", text: "เปลี่ยนบัญชีทดสอบเป็นดีลเลอร์ได้", href: "/admin/members" },
      { id: "role-dealer-look", text: "บัญชีดีลเลอร์เห็นป้ายทองและเพชรชมพูที่รูปโปรไฟล์" },
      { id: "role-agent", text: "เปลี่ยนบัญชีทดสอบเป็นนายหน้า แล้วเห็นป้าย \"นายหน้า\" สีเขียว", href: "/admin/members" },
      { id: "role-staff", text: "บัญชีทีมงานเข้าหลังบ้านได้ แต่ลบประกาศไม่ได้ และไม่เห็นเมนูสมาชิก / ตรวจระบบ" },
      { id: "role-user", text: "บัญชีผู้ใช้งานทั่วไปเห็นป้าย \"ผู้ใช้งานทั่วไป\" และเข้า /admin ไม่ได้" },
    ],
  },
];
const TOTAL = MANUAL.reduce((n, g) => n + g.items.length, 0);
const STORE = "adminTestChecklist";
const loadDone = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };

const STATUS = {
  ok: { icon: "✓", label: "พร้อม" },
  fail: { icon: "✕", label: "ยังไม่พร้อม" },
  warn: { icon: "!", label: "ควรเช็ก" },
  info: { icon: "i", label: "ข้อมูล" },
};

/** หลังบ้าน → ตรวจระบบ (ผู้ดูแลระบบเท่านั้น) */
export default function AdminSystemCheck({ myId }) {
  const ask = useConfirm();
  const { user } = useAuth();
  const [checks, setChecks] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [done, setDone] = useState(loadDone);

  const run = useCallback(async () => {
    setChecks(null);
    setChecks(await runSystemChecks(myId));
    setCheckedAt(new Date());
  }, [myId]);
  useEffect(() => { run(); }, [run]);

  const toggle = (id) => setDone((d) => {
    const next = { ...d, [id]: !d[id] };
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ไม่จำก็ได้ */ }
    return next;
  });
  const reset = async () => {
    if (!(await ask({ title: "ล้างเครื่องหมายทดสอบทั้งหมด?", message: "ข้อที่ติ๊กไว้จะกลับเป็นยังไม่ได้ทดสอบ", confirmText: "ล้างทั้งหมด", tone: "warn" }))) return;
    setDone({});
    try { localStorage.removeItem(STORE); } catch { /* ไม่เป็นไร */ }
  };

  const doneCount = MANUAL.reduce((n, g) => n + g.items.filter((i) => done[i.id]).length, 0);
  const sum = (s) => checks?.filter((c) => c.status === s).length || 0;
  const groups = checks ? [...new Set(checks.map((c) => c.group))] : [];
  const prof = profileOf(user);

  return (
    <div className="stc">
      {/* 1) ตรวจอัตโนมัติ */}
      <div className="stc-card">
        <div className="stc-head">
          <div>
            <h3>ตรวจอัตโนมัติ</h3>
            <p>เช็กว่าฐานข้อมูลและการตั้งค่า Supabase รองรับฟีเจอร์ใหม่ครบไหม (อ่านอย่างเดียว ไม่เปลี่ยนข้อมูล)</p>
          </div>
          <button type="button" className="btn btn-ghost stc-btn" disabled={!checks} onClick={run}>{checks ? "ตรวจอีกครั้ง" : "กำลังตรวจ…"}</button>
        </div>
        {checks && (
          <div className="stc-sum">
            <span className="is-ok">✓ พร้อม {sum("ok")}</span>
            {sum("fail") > 0 && <span className="is-fail">✕ ยังไม่พร้อม {sum("fail")}</span>}
            {sum("warn") > 0 && <span className="is-warn">! ควรเช็ก {sum("warn")}</span>}
            {checkedAt && <small>ตรวจเมื่อ {checkedAt.toLocaleTimeString("th-TH")}</small>}
          </div>
        )}
        {!checks && <div className="stc-loading">กำลังตรวจ…</div>}
        {groups.map((g) => (
          <div key={g} className="stc-group">
            <b className="stc-group-h">{g}</b>
            <ul className="stc-list">
              {checks.filter((c) => c.group === g).map((c) => (
                <li key={c.key} className={`is-${c.status}`}>
                  <span className="stc-ic" title={STATUS[c.status].label}>{STATUS[c.status].icon}</span>
                  <div>
                    <b>{c.label}</b>
                    <small>{c.detail}</small>
                    {c.fix && c.status !== "ok" && <small className="stc-fix">วิธีแก้: {c.fix}</small>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 2) ทดสอบด้วยมือ */}
      <div className="stc-card">
        <div className="stc-head">
          <div>
            <h3>เช็กลิสต์ทดสอบด้วยมือ</h3>
            <p>ทำตามทีละข้อแล้วติ๊ก (จำไว้ในเครื่องนี้) · แนะนำใช้บัญชีทดสอบอีกบัญชีคู่กัน</p>
          </div>
          <button type="button" className="btn btn-ghost stc-btn" disabled={!doneCount} onClick={reset}>ล้างทั้งหมด</button>
        </div>
        <div className="stc-progress" aria-label={`ทดสอบแล้ว ${doneCount} จาก ${TOTAL}`}>
          <div className="stc-bar"><i style={{ width: `${(doneCount / TOTAL) * 100}%` }} /></div>
          <span>ทดสอบแล้ว <b>{doneCount}</b> / {TOTAL}</span>
        </div>
        {MANUAL.map((g) => {
          const n = g.items.filter((i) => done[i.id]).length;
          return (
            <div key={g.title} className="stc-group">
              <b className="stc-group-h">{g.title} <span>{n}/{g.items.length}</span></b>
              <ul className="stc-todo">
                {g.items.map((i) => (
                  <li key={i.id} className={done[i.id] ? "is-done" : undefined}>
                    <label>
                      <input type="checkbox" checked={Boolean(done[i.id])} onChange={() => toggle(i.id)} />
                      <span>{i.text}</span>
                    </label>
                    {i.href && <a href={i.href}>ไปทดสอบ →</a>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 3) ตัวอย่างหน้าตา */}
      <div className="stc-card">
        <div className="stc-head">
          <div>
            <h3>ตัวอย่างหน้าตาตามระดับ</h3>
            <p>รูปโปรไฟล์และป้ายระดับที่สมาชิกแต่ละระดับจะเห็น (ใช้รูปของคุณเป็นตัวอย่าง)</p>
          </div>
        </div>
        <div className="stc-roles">
          {ROLES.map((r) => (
            <div key={r.value} className="stc-role">
              <Avatar src={prof.avatar} name={prof.name} size={56} gem={r.value === "dealer"} />
              <div>
                <b>{prof.name}<em className={`adm-role is-${r.value}`}>{r.label}</em></b>
                <small>{r.note}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
