import { useEffect, useState } from "react";
import LineLink from "../common/LineLink";
import { ChatIcon } from "../common/Icons";

const PEEK_KEY = "lineTabPeeked"; // จำไว้ในรอบการเข้าเว็บนี้ ว่าโชว์ข้อความเต็มไปแล้ว
const PEEK_DELAY = 1500;
const PEEK_MS = 3200;

/**
 * แท็บแอด LINE ลอยขอบขวากลางจอ (ทุกหน้า)
 * - ปกติ: แท็บเขียวแคบ ๆ ไอคอนแชท + "Contour ฟรี"
 * - เอาเมาส์ชี้/โฟกัส: ยืดออกไปทางซ้าย โชว์ "แอด LINE / ขอรับ Contour ที่ดินฟรี"
 * - คอม: เข้าเว็บครั้งแรก (ต่อรอบ) ยืดออกโชว์เอง 3 วินาทีแล้วหดกลับ ให้รู้ว่าปุ่มนี้คืออะไร
 * - มือถือ: ในแท็บสลับ ไอคอน+"Contour ฟรี" ↔ "แอด LINE รับฟรี" อัตโนมัติ (เหมือนปุ่มขนาดตัวอักษร)
 */
export default function FloatingLineButton() {
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    // มือถือ (ไม่มีเมาส์) ไม่ยืดโชว์เอง: ใช้การสลับข้อความในแท็บแทน (ไม่บังเนื้อหา)
    if (!window.matchMedia("(hover: hover)").matches) return undefined;
    let seen = false;
    try { seen = sessionStorage.getItem(PEEK_KEY) === "1"; } catch { /* ไม่มี storage */ }
    if (seen) return undefined;
    let off = 0;
    const on = setTimeout(() => {
      setPeek(true);
      try { sessionStorage.setItem(PEEK_KEY, "1"); } catch { /* ไม่มี storage */ }
      off = setTimeout(() => setPeek(false), PEEK_MS);
    }, PEEK_DELAY);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, []);

  return (
    <LineLink variant="plain" className={`line-tab${peek ? " is-peek" : ""}`} aria-label="แอด LINE ขอรับ Contour ที่ดินฟรี">
      {/* ข้อความเต็ม (ยืดออกมาทางซ้าย) */}
      <span className="lt-full" aria-hidden="true">
        <span className="lt-full-in">
          <small>แอด LINE</small>
          <b>ขอรับ Contour ที่ดินฟรี</b>
        </span>
      </span>
      {/* ส่วนที่เห็นตลอด: หน้า A (ไอคอน + "Contour ฟรี") / หน้า B (มือถือ: "แอด LINE รับฟรี" สลับกับหน้า A อัตโนมัติ) */}
      <span className="lt-main" aria-hidden="true">
        <span className="lt-face lt-face-a">
          <span className="lt-ic"><ChatIcon /></span>
          <span className="lt-short">Contour<br />ฟรี</span>
        </span>
        <span className="lt-face lt-face-b">แอด<br />LINE<small>รับฟรี</small></span>
      </span>
    </LineLink>
  );
}
