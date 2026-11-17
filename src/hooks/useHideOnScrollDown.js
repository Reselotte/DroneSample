import { useEffect, useState } from "react";

const TOP_ZONE = 80; // ใกล้บนสุดของหน้า (px) แสดงแถบเสมอ
const MIN_MOVE = 8; // ขยับน้อยกว่านี้ไม่นับ กันแถบกะพริบตอนเลื่อนนิดเดียว

/**
 * คืนค่า true เมื่อควรซ่อนแถบ: ซ่อนตอนเลื่อนลง แสดงตอนเลื่อนขึ้น
 * keepVisible = true จะบังคับให้แสดงไว้ (เช่น ตอนเมนูมือถือเปิดอยู่)
 */
export default function useHideOnScrollDown(keepVisible = false) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY); // iOS เด้งเกินขอบบนจะได้ค่าติดลบ
      if (y < TOP_ZONE) {
        setHidden(false);
      } else if (Math.abs(y - lastY) >= MIN_MOVE) {
        setHidden(y > lastY);
      } else {
        return; // ยังขยับไม่ถึงเกณฑ์ ไม่อัปเดตตำแหน่งอ้างอิง
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden && !keepVisible;
}
