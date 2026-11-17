import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const REVEAL_MS = 650; // เวลาวงกลมขยายเต็มจอ
const EASE = "cubic-bezier(.4,0,.2,1)";

const readSaved = () => {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
};

/**
 * ธีมสว่าง/มืดของเว็บ (เขียนไว้ที่ <html data-theme="...">)
 * - ค่าเริ่มต้นตามเครื่องผู้ใช้ ถ้าผู้ใช้กดเลือกเองจะจำไว้
 * - สคริปต์ใน index.html ตั้งค่าแรกไว้ก่อนแล้ว hook นี้แค่อ่านต่อ
 *
 * แอนิเมชันตอนกดเปลี่ยน (View Transitions API):
 * - ธีมใหม่แผ่เป็นวงกลมออกจากปุ่มที่กดจนเต็มจอ
 * - เครื่องที่ตั้งค่าลดการเคลื่อนไหว: จางเข้า-ออกนุ่ม ๆ แทน
 * - เบราว์เซอร์ที่ไม่รองรับ: เปลี่ยนทันทีแบบเดิม
 */
export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // ถ้าผู้ใช้ยังไม่เคยเลือกเอง ให้เปลี่ยนตามเครื่องเมื่อเครื่องเปลี่ยนโหมด
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => { if (!readSaved()) setTheme(mq.matches ? "dark" : "light"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** event = คลิกจากปุ่ม (ใช้ตำแหน่งเป็นจุดเริ่มวงกลม) */
  const toggleTheme = useCallback((event) => {
    const next = themeRef.current === "dark" ? "light" : "dark";
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* โหมดส่วนตัว: ไม่จำ แต่ยังเปลี่ยนได้ */ }

    const root = document.documentElement;
    // เปลี่ยนให้เสร็จทันที (ทั้ง state และ <html>) เพื่อให้ View Transition ถ่ายภาพ "หลังเปลี่ยน" ได้ถูก
    const apply = () => {
      flushSync(() => setTheme(next));
      root.dataset.theme = next;
    };

    if (!document.startViewTransition) { apply(); return; }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.themeAnim = reduceMotion ? "fade" : "reveal";
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => { delete root.dataset.themeAnim; });

    if (reduceMotion) return; // จางเข้า-ออกด้วย CSS (theme-transition.css)

    // วงกลมขยายจากจุดที่กด (กดด้วยคีย์บอร์ด = กลางปุ่ม)
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const x = event?.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth - 40);
    const y = event?.clientY || (rect ? rect.top + rect.height / 2 : 32);
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: EASE, pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => { /* ถูกยกเลิก (เช่นกดรัว ๆ) ไม่เป็นไร */ });
  }, []);

  return { theme, toggleTheme };
}
