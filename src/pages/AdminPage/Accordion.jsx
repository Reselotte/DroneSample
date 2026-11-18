import { useId, useState } from "react";

/**
 * หัวข้อพับเก็บได้: กดหัวข้อ (ลูกศรลง) เพื่อเปิดดูตัวเลือก
 * meta = ข้อความสรุปด้านขวาหัวข้อ เช่น "ติ๊กแล้ว 2" · tone = "private" (กล่องเหลือง)
 * ควบคุมจากข้างนอกได้ด้วย open + onToggle (ใช้คู่กับ useAccordionSteps)
 * onNext = แสดงปุ่ม "ถัดไป" ท้ายหัวข้อ · nextLabel = ข้อความบนปุ่ม
 * เนื้อหายังอยู่ในหน้า (แค่ซ่อน) → ตอนพิมพ์แสดงได้
 */
export default function Accordion({
  title, meta, tone, className, domId, defaultOpen = false, open: openProp, onToggle, onNext, nextLabel, children,
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const toggle = () => (controlled ? onToggle?.() : setOpenState((o) => !o));
  const bodyId = useId();

  return (
    <div id={domId} className={`acc${open ? " is-open" : ""}${tone ? ` is-${tone}` : ""}${className ? ` ${className}` : ""}`}>
      <button type="button" className="acc-head" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
        <span className="acc-title">{title}</span>
        {meta != null && meta !== "" && <span className="acc-meta">{meta}</span>}
        <svg className="acc-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div id={bodyId} className="acc-body" {...(!open && { inert: "" })}>
        <div className="acc-inner">
          {children}
          {onNext && (
            <div className="acc-next">
              <button type="button" className="btn acc-next-btn" onClick={onNext}>{nextLabel || "ถัดไป"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * เปิดทีละหัวข้อ + ปุ่ม "ถัดไป": ปิดหัวข้อปัจจุบัน เปิดหัวข้อถัดไป แล้วเลื่อนจอไปหา
 * steps = [{ key, title }] เรียงตามลำดับ
 * คืน { props(key) } → กระจายใส่ <Accordion {...props(key)} />
 */
export function useAccordionSteps(steps, initialKey = null) {
  const [openKey, setOpenKey] = useState(initialKey);
  const uid = useId().replace(/:/g, "");
  const domId = (key) => `acc-${uid}-${key}`;

  const goTo = (key) => {
    setOpenKey(key);
    if (!key) return;
    // รอหัวข้อเดิมพับเสร็จ (0.3 วิ) ตำแหน่งจะได้นิ่งก่อนเลื่อน
    setTimeout(() => {
      const el = document.getElementById(domId(key));
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: "smooth" });
    }, 320);
  };

  const props = (key) => {
    const i = steps.findIndex((s) => s.key === key);
    const next = steps[i + 1];
    return {
      domId: domId(key),
      open: openKey === key,
      onToggle: () => setOpenKey((cur) => (cur === key ? null : key)),
      onNext: () => goTo(next ? next.key : null),
      nextLabel: next ? `ถัดไป: ${next.title} →` : "เสร็จแล้ว ✓",
    };
  };

  return { props, goTo };
}
