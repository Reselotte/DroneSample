import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * หน้าต่างดูรูปเต็มจอ: รูปใหญ่ + ลูกศร ‹ › + รูปย่อด้านล่าง
 *  photos  = รายการ URL รูป
 *  index   = รูปที่เปิดอยู่, onIndex(i) = เปลี่ยนรูป, onClose() = ปิด
 * ใช้คีย์บอร์ดได้: ← → เปลี่ยนรูป, Esc ปิด · มือถือปัดซ้าย/ขวาได้
 */
export default function PhotoLightbox({ photos, index, onIndex, onClose, title }) {
  const count = photos.length;
  const closeRef = useRef(null);
  const thumbs = useRef(null);
  const touch = useRef(null);
  const go = (i) => onIndex((i + count) % count);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // ล็อกหน้าข้างหลังไม่ให้เลื่อน + โฟกัสปุ่มปิด
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  // รูปย่อที่เลือก เลื่อนเข้ามาในแถบเสมอ
  useEffect(() => {
    const bar = thumbs.current;
    const el = bar?.children[index];
    if (el) bar.scrollTo({ left: el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [index]);

  return createPortal(
    <div
      className="plb"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `รูปของ ${title}` : "ดูรูป"}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="plb-top">
        <span className="plb-count">{index + 1} / {count}</span>
        {title && <b className="plb-title">{title}</b>}
        <a className="plb-open" href={photos[index]} target="_blank" rel="noopener noreferrer">เปิดไฟล์เต็ม ↗</a>
        <button ref={closeRef} type="button" className="plb-x" aria-label="ปิด" onClick={onClose}>×</button>
      </div>

      <div
        className="plb-stage"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <img key={photos[index]} src={photos[index]} alt={`รูปที่ ${index + 1}`} />
        {count > 1 && (
          <>
            <button type="button" className="plb-arrow is-prev" aria-label="รูปก่อนหน้า" onClick={() => go(index - 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" className="plb-arrow is-next" aria-label="รูปถัดไป" onClick={() => go(index + 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="plb-thumbs" ref={thumbs}>
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === index ? "on" : undefined}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
