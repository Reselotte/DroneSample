import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ConfirmContext = createContext(async (opts) => window.confirm(opts?.title || ""));

/** ไอคอนตามประเภท: danger = ลบ/อันตราย, warn = ควรระวัง, info = ทั่วไป */
const ICONS = {
  danger: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6" />,
  warn: <><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>,
};

/**
 * กล่องยืนยันของเว็บ (ใช้แทน window.confirm)
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "ลบประกาศ?", message: "กู้คืนไม่ได้", confirmText: "ลบ", tone: "danger" }))) return;
 * tone = "info" | "warn" | "danger" · body = เนื้อหาเพิ่ม (JSX) ใต้ข้อความ
 * กด Esc / คลิกนอกกล่อง = ยกเลิก · Enter = ยืนยัน
 */
export function ConfirmProvider({ children }) {
  const [dlg, setDlg] = useState(null); // { title, message, body, confirmText, cancelText, tone }
  const [closing, setClosing] = useState(false);
  const resolver = useRef(null);
  const okRef = useRef(null);
  const lastFocus = useRef(null);

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    resolver.current?.(false); // มีกล่องค้างอยู่ = ยกเลิกอันเก่า
    resolver.current = resolve;
    lastFocus.current = document.activeElement;
    setClosing(false);
    setDlg({ tone: "info", confirmText: "ยืนยัน", cancelText: "ยกเลิก", ...opts });
  }), []);

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setClosing(true);
    setTimeout(() => {
      setDlg(null);
      setClosing(false);
      lastFocus.current?.focus?.();
    }, 160);
  }, []);

  useEffect(() => {
    if (!dlg) return undefined;
    okRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [dlg, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dlg && (
        <div className={`cfm-backdrop${closing ? " is-closing" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className={`cfm is-${dlg.tone}`} role="alertdialog" aria-modal="true" aria-labelledby="cfm-title" aria-describedby="cfm-msg">
            <div className="cfm-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24">{ICONS[dlg.tone] || ICONS.info}</svg>
            </div>
            <h2 id="cfm-title" className="cfm-title">{dlg.title}</h2>
            {dlg.message && <p id="cfm-msg" className="cfm-msg">{dlg.message}</p>}
            {dlg.body && <div className="cfm-body">{dlg.body}</div>}
            <div className="cfm-actions">
              <button type="button" className="btn btn-ghost cfm-cancel" onClick={() => close(false)}>{dlg.cancelText}</button>
              <button type="button" ref={okRef} className="btn cfm-ok" onClick={() => close(true)}>{dlg.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
