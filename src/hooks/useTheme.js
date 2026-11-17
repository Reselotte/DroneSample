import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

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
 */
export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");

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

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* โหมดส่วนตัว: ไม่จำ แต่ยังเปลี่ยนได้ */ }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
