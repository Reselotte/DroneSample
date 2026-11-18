import { useState } from "react";
import { flushSync } from "react-dom";
import {
  AREA_FIELDS, CHECKLIST_GROUPS, DEED_FIELDS, NOTE_MAX, OWNER_FIELDS, REQUIRED_ITEMS, SALES_TIPS, areaText,
} from "../../data/landChecklist";
import { PROVINCES } from "../../data/landListingOptions";
import { useToast } from "../../hooks/useToast";
import Accordion, { useAccordionSteps } from "./Accordion";
import ChecklistPrint from "./ChecklistPrint";

/** ข้อมูลเจ้าของ + ที่ดินที่กรอกแล้ว [{ label, value }] (เนื้อที่รวมเป็นบรรทัดเดียว) */
function infoList(info) {
  const v = (k) => String(info[k] || "").trim();
  return [
    ...OWNER_FIELDS.map((f) => ({ label: f.label, value: v(f.key) })),
    ...DEED_FIELDS.map((f) => ({ label: f.label, value: v(f.key) })),
    { label: "เนื้อที่", value: areaText(info) },
  ].filter((r) => r.value);
}

/** ลำดับหัวข้อ (กด "ถัดไป" ไล่ตามนี้) */
const STEPS = [
  { key: "owner", title: "ข้อมูลเจ้าของและที่ดิน" },
  { key: "required", title: "ต้องมีก่อนลงประกาศ" },
  ...CHECKLIST_GROUPS.map((g) => ({ key: g.key, title: g.title })),
  { key: "summary", title: "สรุป" },
];

/** ข้อความสรุป (ใช้คัดลอกไปวางใน LINE / โน้ต) — เฉพาะข้อที่ติ๊ก */
function summaryText(owner, required, answers) {
  const lines = ["สรุปข้อมูลที่ดิน"];
  infoList(owner).forEach((r) => lines.push(`${r.label}: ${r.value}`));
  const missing = REQUIRED_ITEMS.filter((it) => !required[it.label]).map((it) => it.label);
  if (missing.length) lines.push("", `ยังขาด: ${missing.join(", ")}`);
  CHECKLIST_GROUPS.forEach((g) => {
    const picked = g.items.filter((it) => it.key in answers);
    if (!picked.length) return;
    lines.push("", `${g.title}`);
    picked.forEach((it) => lines.push(`✓ ${it.label}${answers[it.key].trim() ? ` · ${answers[it.key].trim()}` : ""}`));
  });
  return lines.join("\n");
}

/** เช็กลิสต์ฝ่ายขาย (#/admin/checklist): ถามเจ้าของทีละหัวข้อ ติ๊กเฉพาะข้อที่ "ใช่" แล้วดูสรุป */
export default function AdminSalesChecklist() {
  const toast = useToast();
  const [owner, setOwner] = useState({});
  const [required, setRequired] = useState({}); // { label: true }
  const [answers, setAnswers] = useState({}); // { key: "รายละเอียด" }
  const { props, goTo } = useAccordionSteps(STEPS, "owner");
  const [printMode, setPrintMode] = useState(null); // null = เลือกเอง (ติ๊กแล้ว → สรุป, ยังไม่ติ๊ก → ฟอร์มเปล่า)

  const print = (mode) => {
    flushSync(() => setPrintMode(mode));
    window.print();
    setPrintMode(null);
  };

  const picked = Object.keys(answers).length;
  const requiredDone = REQUIRED_ITEMS.filter((it) => required[it.label]).length;

  const setInfo = (key) => (e) => setOwner((o) => ({ ...o, [key]: e.target.value }));

  const toggle = (key) => setAnswers((a) => {
    const next = { ...a };
    if (key in next) delete next[key];
    else next[key] = "";
    return next;
  });

  const clear = () => {
    if (!window.confirm("ล้างคำตอบทั้งหมด เพื่อเริ่มถามเจ้าของคนใหม่?")) return;
    setOwner({});
    setRequired({});
    setAnswers({});
    goTo("owner");
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(owner, required, answers));
      toast("คัดลอกสรุปแล้ว วางใน LINE ได้เลย");
    } catch {
      toast("คัดลอกไม่สำเร็จ");
    }
  };

  const pickedGroups = CHECKLIST_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => it.key in answers) }))
    .filter((g) => g.items.length);
  const missing = REQUIRED_ITEMS.filter((it) => !required[it.label]);

  return (
    <div className={`ckl-sheet${picked ? " has-picks" : ""}`}>
      <p className="ckl-howto">
        ถามทีละหัวข้อ ติ๊กเฉพาะข้อที่ "ใช่" (ข้อที่ไม่ติ๊กจะไม่ขึ้นในสรุป) แล้วกด <b>ถัดไป</b> ·
        เสร็จแล้วไปที่ <a href="#/admin">จัดการประกาศ</a> → <b>แก้ไข</b> → เลือกจุดเด่นตามสรุป
      </p>

      <div className="acc-list">
        <Accordion
          title="ข้อมูลเจ้าของและที่ดิน"
          meta={[owner.name, owner.province].filter((x) => x?.trim()).join(" · ")}
          {...props("owner")}
        >
          <div className="ckl-subhead">เจ้าของ</div>
          <div className="ckl-blanks">
            {OWNER_FIELDS.map((f) => (
              <label key={f.key}>
                <span>{f.label}</span>
                <input value={owner[f.key] || ""} onChange={setInfo(f.key)} />
              </label>
            ))}
          </div>
          <div className="ckl-subhead">ที่ดิน (ดูจากโฉนด)</div>
          <div className="ckl-blanks">
            {DEED_FIELDS.map((f) => (
              <label key={f.key}>
                <span>{f.label}</span>
                <input
                  value={owner[f.key] || ""}
                  onChange={setInfo(f.key)}
                  list={f.key === "province" ? "ckl-provinces" : undefined}
                />
              </label>
            ))}
            <div className="ckl-area">
              <span>เนื้อที่</span>
              <div>
                {AREA_FIELDS.map((f) => (
                  <label key={f.key}>
                    <input inputMode="decimal" value={owner[f.key] || ""} onChange={setInfo(f.key)} aria-label={f.label} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <datalist id="ckl-provinces">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>
        </Accordion>

        <Accordion title="ต้องมีก่อนลงประกาศ" meta={`${requiredDone}/${REQUIRED_ITEMS.length}`} {...props("required")}>
          <ul className="ckl-rows">
            {REQUIRED_ITEMS.map((it) => (
              <li key={it.label} className={required[it.label] ? "is-on" : undefined}>
                <label className="ckl-row">
                  <input
                    type="checkbox"
                    checked={Boolean(required[it.label])}
                    onChange={() => setRequired((r) => ({ ...r, [it.label]: !r[it.label] }))}
                  />
                  <span><b>{it.label}</b><small>{it.ask}</small></span>
                </label>
              </li>
            ))}
          </ul>
        </Accordion>

        {CHECKLIST_GROUPS.map((group) => {
          const count = group.items.filter((it) => it.key in answers).length;
          return (
            <Accordion
              key={group.key}
              title={group.title}
              tone={group.private ? "private" : undefined}
              meta={count ? `ติ๊กแล้ว ${count}` : ""}
              {...props(group.key)}
            >
              <ul className="ckl-rows">
                {group.items.map((it) => {
                  const on = it.key in answers;
                  return (
                    <li key={it.key} className={on ? "is-on" : undefined}>
                      <label className="ckl-row">
                        <input type="checkbox" checked={on} onChange={() => toggle(it.key)} />
                        <span><b>{it.ask}</b><small>→ {it.label}</small></span>
                      </label>
                      <input
                        className={`ckl-line${on ? "" : " is-hidden"}`}
                        value={answers[it.key] || ""}
                        maxLength={NOTE_MAX}
                        aria-label={`รายละเอียด ${it.label}`}
                        placeholder={it.hint ? `เช่น ${it.hint}` : "รายละเอียด"}
                        onChange={(e) => setAnswers((a) => ({ ...a, [it.key]: e.target.value }))}
                      />
                    </li>
                  );
                })}
              </ul>
            </Accordion>
          );
        })}

        <Accordion title="สรุป" className="ckl-summary" meta={picked ? `${picked} ข้อ` : ""} {...props("summary")} onNext={undefined}>
          {infoList(owner).length > 0 && (
            <dl className="ckl-sum-owner">
              {infoList(owner).map((r) => (
                <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
              ))}
            </dl>
          )}
          {missing.length > 0 && (
            <p className="ckl-sum-missing">ยังขาด: {missing.map((it) => it.label).join(", ")}</p>
          )}
          {pickedGroups.length === 0 ? (
            <p className="ckl-sum-empty">ยังไม่ได้ติ๊กข้อไหน</p>
          ) : (
            pickedGroups.map((g) => (
              <div key={g.key} className={`ckl-sum-group${g.private ? " is-private" : ""}`}>
                <b>{g.title}</b>
                <ul>
                  {g.items.map((it) => (
                    <li key={it.key}>
                      {it.label}
                      {answers[it.key].trim() && <span> · {answers[it.key].trim()}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <div className="ckl-sum-actions">
            <button type="button" className="btn btn-ghost" onClick={copySummary}>คัดลอกสรุป</button>
            <button type="button" className="btn btn-ghost" onClick={() => print("summary")}>พิมพ์สรุป</button>
          </div>
        </Accordion>

        <Accordion title="เคล็ดลับ">
          <ul className="ckl-tips">{SALES_TIPS.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        </Accordion>
      </div>

      <div className="ckl-footer">
        <span>ติ๊กแล้ว <b>{picked}</b> ข้อ</span>
        <button type="button" className="btn btn-ghost" onClick={() => goTo("summary")}>ดูสรุป</button>
        <button type="button" className="btn btn-ghost" onClick={() => print("blank")}>พิมพ์ฟอร์มเปล่า</button>
        <button type="button" className="btn btn-ghost" onClick={clear}>ล้าง</button>
      </div>

      <ChecklistPrint
        mode={printMode || (picked ? "summary" : "blank")}
        owner={owner}
        required={required}
        answers={answers}
      />
    </div>
  );
}
