import { NOTE_MAX } from "../../data/landChecklist";
import Accordion, { useAccordionSteps } from "./Accordion";

/**
 * เลือกจุดเด่นในฟอร์มแก้ไขประกาศ: แต่ละหมวดพับเก็บไว้ กดหัวข้อเพื่อเปิด กดชิปเพื่อเลือก แล้วกด "ถัดไป"
 * value = { key: "รายละเอียด" } (มี key = เลือกแล้ว) · onChange(nextValue)
 */
export default function ChecklistFields({ groups, value, onChange, tone }) {
  const steps = groups.map((g) => ({ key: g.key, title: g.title }));
  const { props } = useAccordionSteps(steps);

  const toggle = (key) => {
    const next = { ...value };
    if (key in next) delete next[key];
    else next[key] = "";
    onChange(next);
  };
  const setNote = (key, note) => onChange({ ...value, [key]: note });

  return (
    <div className="acc-list">
      {groups.map((group) => {
        const picked = group.items.filter((it) => it.key in value);
        return (
          <Accordion
            key={group.key}
            title={group.title}
            tone={tone}
            meta={picked.length ? `เลือก ${picked.length}: ${picked.map((it) => it.label).join(", ")}` : ""}
            {...props(group.key)}
          >
            <div className="ckl-chips">
              {group.items.map((it) => {
                const on = it.key in value;
                return (
                  <button
                    key={it.key}
                    type="button"
                    className={`ckl-chip${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    title={`ถาม: ${it.ask}`}
                    onClick={() => toggle(it.key)}
                  >
                    <span className="ckl-chip-mark" aria-hidden="true">{on ? "✓" : "+"}</span>
                    {it.label}
                  </button>
                );
              })}
            </div>
            {picked.length > 0 && (
              <div className="ckl-notes">
                {picked.map((it) => (
                  <label key={it.key} className="ckl-note-row">
                    <span>{it.label}</span>
                    <input
                      value={value[it.key]}
                      maxLength={NOTE_MAX}
                      placeholder={it.hint ? `เช่น ${it.hint}` : "รายละเอียด (ไม่ใส่ก็ได้)"}
                      onChange={(e) => setNote(it.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </Accordion>
        );
      })}
    </div>
  );
}

/** ตัดช่องว่างของรายละเอียดก่อนบันทึก */
export const cleanChecklist = (value) =>
  Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v).trim()]));
