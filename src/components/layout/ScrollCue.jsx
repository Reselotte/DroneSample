import { useEffect, useState } from "react";
import { ChevronDownIcon } from "../common/Icons";
import { gentleScrollTo } from "../../utils/gentleScroll";

const HEADER_OFFSET = 72; // ความสูงแถบเมนู (+ระยะเผื่อ) ตอนเลื่อนไปส่วนถัดไป
const BOTTOM_ZONE = 140; // เหลือระยะถึงท้ายหน้าไม่เกินนี้ (px) = ถือว่าถึงท้ายแล้ว ซ่อนปุ่ม

/** ส่วนถัดไปที่อยู่ต่ำกว่าจอปัจจุบัน (section หรือท้ายเว็บ) */
function findNextBlock() {
  const blocks = document.querySelectorAll("#root section[data-page], #root footer");
  for (const el of blocks) {
    if (el.getBoundingClientRect().top > HEADER_OFFSET + 24) return el;
  }
  return null;
}

/**
 * ปุ่ม "เลื่อนลง" ลอยค้างกลางล่างจอ
 * - กดแล้วเลื่อนไปส่วนถัดไปทีละส่วน
 * - บนสุดของหน้าแสดงป้าย "เลื่อนลงดูเพิ่มเติม" พอเริ่มเลื่อนเหลือแค่วงกลม
 * - ถึงท้ายหน้า (หรือหน้าสั้นจนไม่ต้องเลื่อน) ซ่อนเอง
 */
export default function ScrollCue({ showLabel = false }) {
  const [hidden, setHidden] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      setHidden(remaining < BOTTOM_ZONE);
      setCompact(window.scrollY > 80);
    };
    const onChange = () => { if (!raf) raf = requestAnimationFrame(update); };

    update();
    // เนื้อหาบางส่วนโหลดทีหลัง (รูป/ประกาศ) ความสูงหน้าเปลี่ยน → เช็กใหม่
    const ro = new ResizeObserver(onChange);
    ro.observe(document.body);
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  // ค่อย ๆ เลื่อนลงไปส่วนถัดไป (ออกตัวช้า → ไหล → ชะลอตอนถึง) ไม่พุ่งจนมึนหัว
  // ใช้ตัวเลื่อนเดียวกับปุ่มลัดในศัพท์น่ารู้ และทำงานเหมือนกันแม้เครื่องตั้งค่าลดการเคลื่อนไหว
  const goNext = () => {
    const next = findNextBlock();
    const top = next
      ? window.scrollY + next.getBoundingClientRect().top - HEADER_OFFSET
      : window.scrollY + window.innerHeight * 0.85;
    gentleScrollTo(top);
  };

  return (
    <button
      type="button"
      className={`scroll-cue${compact || !showLabel ? " is-compact" : ""}${hidden ? " is-hidden" : ""}`}
      aria-label="เลื่อนลงดูส่วนถัดไป"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      onClick={goNext}
    >
      <span className="scroll-cue-label">เลื่อนลงดูเพิ่มเติม</span>
      <span className="scroll-cue-circle"><ChevronDownIcon /></span>
    </button>
  );
}
