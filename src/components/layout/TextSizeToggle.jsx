import { useCallback, useEffect, useRef, useState } from "react";

/** ระดับขนาดตัวอักษร (ค่าที่ใช้คูณอยู่ใน styles/components/text-size.css) */
const SIZES = [
  { value: "normal", label: "ปกติ" },
  { value: "lg", label: "ใหญ่" },
  { value: "xl", label: "ใหญ่มาก" },
];
const STORAGE_KEY = "textSize";
const PEEK_TAP_MS = 1600; // มือถือ: ค้างป้ายบอกระดับใหม่หลังแตะ (ms)

const isTouch = () => window.matchMedia("(hover: none)").matches;

/**
 * ปุ่มปรับขนาดตัวอักษร (มุมขวาบน ข้างปุ่มธีม) สำหรับผู้สูงอายุ/คนสายตาไม่ดี
 * กดวน: ปกติ → ใหญ่ → ใหญ่มาก → ปกติ  และจำค่าไว้ครั้งหน้า
 * (สคริปต์ใน index.html ตั้งค่าแรกไว้ก่อนหน้าเว็บแสดงผล)
 *
 * บอกให้รู้ว่าปุ่มนี้คืออะไร:
 * - คอมพิวเตอร์: เอาเมาส์ชี้ → ปุ่มยืดออกโชว์ "ขนาดตัวอักษร / ระดับ"
 * - มือถือ: ในปุ่มสลับ "ก" ↔ "ขนาดตัวอักษร" ให้อัตโนมัติ (CSS) และแตะแล้วยืดบอกระดับใหม่
 */
export default function TextSizeToggle() {
  const [size, setSize] = useState(() => document.documentElement.dataset.textSize || "normal");
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef(0);

  const showPeek = useCallback((ms) => {
    clearTimeout(peekTimer.current);
    setPeek(true);
    peekTimer.current = setTimeout(() => setPeek(false), ms);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (size === "normal") delete root.dataset.textSize;
    else root.dataset.textSize = size;
    try { localStorage.setItem(STORAGE_KEY, size); } catch { /* โหมดส่วนตัว: ไม่จำ แต่ยังเปลี่ยนได้ */ }
  }, [size]);

  useEffect(() => () => clearTimeout(peekTimer.current), []);

  const index = SIZES.findIndex((s) => s.value === size);
  const next = SIZES[(index + 1) % SIZES.length];

  const onClick = () => {
    setSize(next.value);
    if (isTouch()) showPeek(PEEK_TAP_MS); // มือถือ: ยืดออกบอกระดับใหม่
  };

  return (
    <button
      type="button"
      className={`text-size-toggle is-${size}${peek ? " is-peek" : ""}`}
      onClick={onClick}
      aria-label={`ขนาดตัวอักษร: ${SIZES[index].label} (กดเพื่อเปลี่ยนเป็น ${next.label})`}
    >
      <span className="tst-icon" aria-hidden="true">
        {/* หน้า A: ตัว ก + จุดบอกระดับ */}
        <span className="tst-face tst-face-a">
          <span className="tst-glyph">ก</span>
          <span className="tst-dots">
            {SIZES.map((s, i) => <i key={s.value} className={i <= index ? "on" : undefined} />)}
          </span>
        </span>
        {/* หน้า B (เฉพาะมือถือ): ข้อความ สลับกับหน้า A อัตโนมัติ */}
        <span className="tst-face tst-face-b">ขนาด<br />ตัวอักษร</span>
      </span>
      {/* ข้อความที่ยืดออกมาในปุ่ม (คอม: ตอนชี้ / มือถือ: หลังแตะ บอกระดับใหม่) */}
      <span className="tst-label" aria-hidden="true">
        <span className="tst-label-in">
          ขนาดตัวอักษร
          <small>{SIZES[index].label}</small>
        </span>
      </span>
    </button>
  );
}
