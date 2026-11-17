import { useCallback, useEffect, useRef, useState } from "react";

/** ระดับขนาดตัวอักษร (ค่าที่ใช้คูณอยู่ใน styles/components/text-size.css) */
const SIZES = [
  { value: "normal", label: "ปกติ" },
  { value: "lg", label: "ใหญ่" },
  { value: "xl", label: "ใหญ่มาก" },
];
const STORAGE_KEY = "textSize";
const PEEK_KEY = "textSizePeek"; // นับว่าโชว์ป้ายตอนเข้าเว็บไปแล้วกี่ครั้ง (มือถือ)
const PEEK_TIMES = 2; // โชว์ป้ายตอนเข้าเว็บแค่ 2 ครั้งแรก
const PEEK_DELAY = 1200; // รอหลังเปิดเว็บก่อนโชว์ (ms)
const PEEK_INTRO_MS = 3000; // ค้างป้ายตอนเข้าเว็บ (ms)
const PEEK_TAP_MS = 1600; // ค้างป้ายหลังแตะเปลี่ยนขนาด (ms)

const isTouch = () => window.matchMedia("(hover: none)").matches;

/**
 * ปุ่มปรับขนาดตัวอักษร (มุมขวาบน ข้างปุ่มธีม) สำหรับผู้สูงอายุ/คนสายตาไม่ดี
 * กดวน: ปกติ → ใหญ่ → ใหญ่มาก → ปกติ  และจำค่าไว้ครั้งหน้า
 * (สคริปต์ใน index.html ตั้งค่าแรกไว้ก่อนหน้าเว็บแสดงผล)
 *
 * ป้าย "ขนาดตัวอักษร" ยืดออกมาในปุ่ม:
 * - คอมพิวเตอร์: ตอนเอาเมาส์ชี้ (CSS :hover)
 * - มือถือ (ไม่มีเมาส์): โชว์เองตอนเข้าเว็บ 2 ครั้งแรก และทุกครั้งที่แตะเปลี่ยนขนาด (บอกระดับใหม่)
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

  // มือถือ: โชว์ป้ายตอนเข้าเว็บ (แค่ 2 ครั้งแรก) ให้คนรู้ว่าปุ่ม ก คืออะไร
  useEffect(() => {
    if (!isTouch()) return undefined;
    let shown = 0;
    try { shown = Number(localStorage.getItem(PEEK_KEY)) || 0; } catch { /* ไม่มี storage */ }
    if (shown >= PEEK_TIMES) return undefined;
    const t = setTimeout(() => {
      showPeek(PEEK_INTRO_MS);
      try { localStorage.setItem(PEEK_KEY, String(shown + 1)); } catch { /* ไม่มี storage */ }
    }, PEEK_DELAY);
    return () => clearTimeout(t);
  }, [showPeek]);

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
        <span className="tst-glyph">ก</span>
        <span className="tst-dots">
          {SIZES.map((s, i) => <i key={s.value} className={i <= index ? "on" : undefined} />)}
        </span>
      </span>
      {/* ข้อความที่เลื่อนออกมาในปุ่ม (คอม: ตอนชี้ / มือถือ: ตอนเข้าเว็บและหลังแตะ) */}
      <span className="tst-label" aria-hidden="true">
        <span className="tst-label-in">
          ขนาดตัวอักษร
          <small>{SIZES[index].label}</small>
        </span>
      </span>
    </button>
  );
}
