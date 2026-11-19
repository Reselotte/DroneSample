import { useEffect, useRef, useState } from "react";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import FitImage from "../../components/common/FitImage";
import { photoUrl } from "../../lib/listingsApi";

const AUTOPLAY_MS = 4500;

/**
 * แกลเลอรีรูป: รูปใหญ่เลื่อนเป็นสไลด์ + ลูกศร ‹ › + เลื่อนเองอัตโนมัติ + รูปย่อให้กดเลือก
 * index / onIndex มาจากหน้า (กล่องราคาใช้โชว์รูปเดียวกันตอนเลื่อนจอลง)
 * เลื่อนเองหยุดชั่วคราวเมื่อ: เอาเมาส์ชี้ / กำลังกด Tab อยู่ในแกลเลอรี / ผู้ใช้กดเปลี่ยนรูปเอง / แท็บถูกซ่อน
 */
export default function PhotoGallery({ photos, title, index, onIndex, mainRef }) {
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(true); // ปุ่มหยุด/เล่น
  const [resumeAt, setResumeAt] = useState(0); // ผู้ใช้กดเอง → รอสักพักค่อยเลื่อนต่อ
  const touch = useRef(null);
  const thumbs = useRef(null);
  const count = photos.length;

  const go = (i, byUser = true) => {
    onIndex((i + count) % count);
    if (byUser) setResumeAt(Date.now() + AUTOPLAY_MS * 2);
  };

  // เลื่อนเองอัตโนมัติ
  useEffect(() => {
    if (count < 2 || !playing || paused) return undefined;
    const t = setInterval(() => {
      if (document.hidden || Date.now() < resumeAt) return;
      onIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, playing, paused, resumeAt, onIndex]);

  // รูปย่อที่เลือกอยู่ เลื่อนเข้ามาในแถบเสมอ (เลื่อนเฉพาะแถบ ไม่ดึงทั้งหน้ากลับขึ้นไป)
  useEffect(() => {
    const bar = thumbs.current;
    const el = bar?.children[index];
    if (!el) return;
    const left = el.offsetLeft - bar.offsetLeft;
    if (left < bar.scrollLeft || left + el.offsetWidth > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: left - (bar.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [index]);

  if (!count) {
    return <div className="ldg-main" ref={mainRef}><ContourMapSvg mode="ortho" cover /></div>;
  }

  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  };

  return (
    <div
      className="ldg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="ldg-main"
        ref={mainRef}
        role="region"
        aria-roledescription="สไลด์รูปภาพ"
        aria-label={`รูปที่ดิน ${index + 1} จาก ${count}`}
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={count > 1 ? onKey : undefined}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1)); // ปัดซ้าย = รูปถัดไป
        }}
      >
        <div className="ldg-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {photos.map((path, i) => (
            <div key={path} className="ldg-slide" aria-hidden={i !== index}>
              <FitImage src={photoUrl(path)} alt={`${title} รูปที่ ${i + 1}`} eager={i === 0} />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" className="ldg-arrow is-prev" aria-label="รูปก่อนหน้า" onClick={() => go(index - 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" className="ldg-arrow is-next" aria-label="รูปถัดไป" onClick={() => go(index + 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="ldg-bar">
              <button
                type="button"
                className="ldg-play"
                aria-label={playing ? "หยุดเลื่อนรูปอัตโนมัติ" : "เลื่อนรูปอัตโนมัติ"}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing
                  ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
                  : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>}
              </button>
              <span>{index + 1} / {count}</span>
            </div>
            {/* แถบเวลาเลื่อนเอง (เริ่มใหม่ทุกครั้งที่เปลี่ยนรูป) */}
            {playing && !paused && <i key={index} className="ldg-timer" style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
          </>
        )}
      </div>

      {count > 1 && (
        <div className="ldg-thumbs" ref={thumbs}>
          {photos.map((path, i) => (
            <button
              key={path}
              type="button"
              className={i === index ? "on" : undefined}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
            >
              <img src={photoUrl(path)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
