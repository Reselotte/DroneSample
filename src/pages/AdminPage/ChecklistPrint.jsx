import { AREA_FIELDS, CHECKLIST_GROUPS, DEED_FIELDS, OWNER_FIELDS, REQUIRED_ITEMS } from "../../data/landChecklist";

/**
 * กรอบเอกสาร: ตั้งขอบกระดาษเป็น 0 (เบราว์เซอร์จะไม่พิมพ์วันที่/ชื่อเว็บ/URL ที่หัว-ท้ายกระดาษ)
 * แล้วใช้ thead/tfoot ว่าง ๆ ที่พิมพ์ซ้ำทุกหน้า ทำหน้าที่เป็นขอบบน-ล่างแทน
 */
export function PrintDoc({ children, className }) {
  return (
    <table className={`ckl-print-doc${className ? ` ${className}` : ""}`}>
      <thead><tr><td className="pd-gap-top" /></tr></thead>
      <tfoot><tr><td className="pd-gap-bottom" /></tr></tfoot>
      <tbody><tr><td className="pd-body">{children}</td></tr></tbody>
    </table>
  );
}

/** เอกสารสำหรับพิมพ์ (ซ่อนบนจอ แสดงเฉพาะตอนพิมพ์) — mode: "blank" แบบฟอร์มเปล่า | "summary" สรุปผล */
export default function ChecklistPrint({ mode, owner, required, answers }) {
  const today = new Date().toLocaleDateString("th-TH", { dateStyle: "long" });
  const val = (key) => owner[key]?.trim() || "";
  const isSummary = mode === "summary";

  const head = (
    <div className="pd-head">
      <div className="pd-brand">
        <b>DroneSample</b>
        <span>สำรวจที่ดินจากมุมสูง</span>
      </div>
      <div className="pd-title">
        <h1>{isSummary ? "สรุปข้อมูลที่ดิน" : "แบบสอบถามข้อมูลที่ดิน"}</h1>
        <span>{isSummary ? `จัดทำวันที่ ${today}` : "สำหรับฝ่ายขาย · ใช้ถามเจ้าของที่ดิน"}</span>
      </div>
    </div>
  );

  const cell = (f) => (
    <td key={f.key}>
      <small>{f.label}</small>
      <span>{val(f.key)}</span>
    </td>
  );

  // เจ้าของ 1 แถว + ที่ดินแบบหน้าโฉนดฉบับย่อ (เลขโฉนด / ที่ตั้ง / เนื้อที่)
  const ownerTable = (
    <>
      <table className="pd-owner is-4">
        <tbody><tr>{OWNER_FIELDS.map(cell)}</tr></tbody>
      </table>
      <table className="pd-owner pd-deed">
        <caption>ข้อมูลที่ดิน (ตามโฉนด)</caption>
        <tbody>
          <tr>{DEED_FIELDS.slice(0, 3).map(cell)}</tr>
          <tr>{DEED_FIELDS.slice(3).map(cell)}</tr>
          <tr>
            <td colSpan={3}>
              <small>เนื้อที่</small>
              <span className="pd-area">
                {AREA_FIELDS.map((f) => (
                  <span key={f.key}><b>{val(f.key)}</b>{f.label}</span>
                ))}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );

  // หัวตารางแบบฟอร์ม: ลำดับ | คำถาม | ใช่ | ไม่ใช่ | รายละเอียด
  const gridHead = (ask, yes, no, detail) => (
    <thead>
      <tr>
        <th className="pd-g-no">ลำดับ</th>
        <th className="pd-g-ask">{ask}</th>
        <th className="pd-g-tick">{yes}</th>
        <th className="pd-g-tick">{no}</th>
        <th className="pd-g-fill">{detail}</th>
      </tr>
    </thead>
  );

  const signatures = (
    <div className="pd-sign">
      {[
        { name: val("name"), role: "เจ้าของที่ดิน" },
        { name: val("staff"), role: "เซลล์" },
        // เจ้าของไม่อยู่ ให้ตัวแทนเซ็นแทน
        { name: "", role: "ตัวแทนเจ้าของที่ดิน" },
        { name: "", role: "ตัวแทนเจ้าของที่ดิน" },
      ].map((p, i) => (
        <div key={i} className="pd-sign-box">
          <div className="pd-sign-row"><span className="pd-dots" /><span className="pd-sign-role">{p.role}</span></div>
          <div className="pd-paren">(<span>{p.name}</span>)</div>
          <div className="pd-date"><span className="pd-dots is-d" />/<span className="pd-dots is-m" />/<span className="pd-dots is-y" /></div>
        </div>
      ))}
    </div>
  );

  if (!isSummary) {
    return (
      <PrintDoc>
        {head}
        {ownerTable}
        <div className="pd-sec">
          <h2>ส่วนที่ 1 เอกสาร / ข้อมูลที่ต้องมีก่อนลงประกาศ</h2>
          <table className="pd-grid">
            {gridHead("รายการ", "มี", "ไม่มี", "หมายเหตุ")}
            <tbody>
              {REQUIRED_ITEMS.map((it, i) => (
                <tr key={it.label}>
                  <td className="pd-g-no">1.{i + 1}</td>
                  <td className="pd-g-ask">{it.label}</td>
                  <td className="pd-g-tick" />
                  <td className="pd-g-tick" />
                  <td className="pd-g-fill" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {CHECKLIST_GROUPS.map((g, gi) => (
          <div key={g.key} className={`pd-sec${g.private ? " is-private" : ""}`}>
            <h2>
              ส่วนที่ {gi + 2} {g.title}
              {g.private && <em>ข้อมูลภายใน ห้ามเผยแพร่</em>}
            </h2>
            <table className="pd-grid">
              {gridHead("คำถาม", "ใช่", "ไม่ใช่", "รายละเอียด")}
              <tbody>
                {g.items.map((it, i) => (
                  <tr key={it.key}>
                    <td className="pd-g-no">{gi + 2}.{i + 1}</td>
                    <td className="pd-g-ask">{it.ask}</td>
                    <td className="pd-g-tick" />
                    <td className="pd-g-tick" />
                    <td className="pd-g-fill" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="pd-sec pd-note">
          <h2>หมายเหตุเพิ่มเติม</h2>
          <div className="pd-lines"><span /><span /><span /></div>
        </div>
        {signatures}
      </PrintDoc>
    );
  }

  const groups = CHECKLIST_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => it.key in answers) }))
    .filter((g) => g.items.length);
  const publicGroups = groups.filter((g) => !g.private);
  const privateGroups = groups.filter((g) => g.private);
  const rows = (list, showGroup = true) => list.map((g) => (
    <tbody key={g.key}>
      {showGroup && <tr className="pd-grp"><th colSpan={2}>{g.title}</th></tr>}
      {g.items.map((it) => (
        <tr key={it.key}>
          <td className="pd-s-label"><b>✓</b> {it.label}</td>
          <td className="pd-s-note">{answers[it.key].trim() || "—"}</td>
        </tr>
      ))}
    </tbody>
  ));

  return (
    <PrintDoc>
      {head}
      {ownerTable}

      <div className="pd-sec">
        <h2>เอกสาร / ข้อมูลที่ต้องมีก่อนลงประกาศ</h2>
        <div className="pd-req">
          {REQUIRED_ITEMS.map((it) => (
            <div key={it.label} className={required[it.label] ? "is-ok" : "is-miss"}>
              <span className="pd-mark">{required[it.label] ? "✓" : "✗"}</span>
              {it.label}
            </div>
          ))}
        </div>
      </div>

      {publicGroups.length > 0 && (
        <div className="pd-sec">
          <h2>จุดเด่นของที่ดิน <em>{publicGroups.reduce((n, g) => n + g.items.length, 0)} ข้อ</em></h2>
          <table className="pd-sum">
            <thead><tr><th>จุดเด่น</th><th>รายละเอียด</th></tr></thead>
            {rows(publicGroups)}
          </table>
        </div>
      )}

      {privateGroups.length > 0 && (
        <div className="pd-sec is-private">
          <h2>ข้อมูลภายใน <em>ห้ามเผยแพร่ / ห้ามแจ้งผู้ซื้อ</em></h2>
          <table className="pd-sum">
            <thead><tr><th>หัวข้อ</th><th>รายละเอียด</th></tr></thead>
            {rows(privateGroups, false)}
          </table>
        </div>
      )}

      {signatures}
    </PrintDoc>
  );
}
