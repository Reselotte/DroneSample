import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import glossary from "../../data/glossary";
import ContourMapSvg from "./ContourMapSvg";

const GAP = 10; // ระยะห่างกล่องจากคำ (px)
const EDGE = 12; // ระยะห่างจากขอบจอขั้นต่ำ (px)

/**
 * คำศัพท์ที่ชี้/แตะแล้วขึ้นกล่องอธิบาย (ข้อมูลจาก data/glossary.js)
 *   <Term id="contour">Contour</Term>
 * - คอมพิวเตอร์: เอาเมาส์ชี้ = เปิด, เอาออก = ปิด, คลิก = ปักค้างไว้
 * - มือถือ: แตะ = เปิด/ปิด, แตะที่อื่นหรือเลื่อนจอ = ปิด
 * กล่องวางผ่าน portal ที่ <body> และจัดตำแหน่งให้อยู่ในจอเสมอ (ใต้คำ ถ้าที่ไม่พอจะขึ้นด้านบน)
 */
export default function Term({ id, children }) {
  const entry = glossary[id];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const hoverOpened = useRef(false);
  const closeTimer = useRef(0);
  const popId = useId();

  const canHover = () => window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => { if (hoverOpened.current) setOpen(false); }, 160);
  };

  // วางตำแหน่งกล่องหลังแสดงผล (ต้องรู้ความสูงจริงก่อน)
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = popRef.current.offsetWidth;
    const h = popRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, EDGE), vw - w - EDGE);
    const below = r.bottom + GAP;
    const top = below + h > vh - EDGE && r.top - GAP - h > EDGE ? r.top - GAP - h : below;
    setPos({ left, top, above: top < r.top });
  }, [open]);

  // ปิดเมื่อ: กด Esc / แตะที่อื่น / เลื่อนจอ / ปรับขนาดจอ
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onKey = (e) => { if (e.key === "Escape") { close(); btnRef.current?.focus(); } };
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => { if (!open) setPos(null); }, [open]);

  if (!entry) return children;

  const onClick = () => {
    cancelClose();
    if (open && hoverOpened.current) { hoverOpened.current = false; return; } // เปิดจาก hover อยู่ → คลิก = ปักค้าง
    hoverOpened.current = false;
    setOpen((v) => !v);
  };
  const onEnter = () => {
    if (!canHover()) return;
    cancelClose();
    if (!open) { hoverOpened.current = true; setOpen(true); }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`term${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-describedby={open ? popId : undefined}
        onClick={onClick}
        onMouseEnter={onEnter}
        onMouseLeave={() => { if (hoverOpened.current) scheduleClose(); }}
      >
        {children}
        <span className="term-q" aria-hidden="true">?</span>
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          id={popId}
          role="tooltip"
          className={`term-pop${pos?.above ? " is-above" : ""}`}
          style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden", left: 0, top: 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={() => { if (hoverOpened.current) scheduleClose(); }}
        >
          {entry.visual && (
            <div className="term-pop-vis"><ContourMapSvg mode={entry.visual.mode} cover /></div>
          )}
          <b>{entry.title}</b>
          <p>{entry.text}</p>
        </div>,
        document.body
      )}
    </>
  );
}
