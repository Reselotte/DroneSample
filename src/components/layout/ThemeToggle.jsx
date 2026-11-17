import useTheme from "../../hooks/useTheme";
import { MoonIcon, SunIcon } from "../common/Icons";

/** ปุ่มสลับธีมสว่าง/มืด (มุมขวาบน) — ธีมสว่างแสดงพระจันทร์, ธีมมืดแสดงพระอาทิตย์ */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      title={dark ? "ธีมสว่าง" : "ธีมมืด"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
