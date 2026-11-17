import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import LineLink from "../../components/common/LineLink";
import { CheckCircleIcon } from "../../components/common/Icons";

/** คำอธิบายสี/สัญลักษณ์มุมล่างขวาของแผนที่ แยกตามแบบ */
function MapLegend({ mode }) {
  if (mode === "dtm") {
    return (
      <div className="sv-legend">
        <span>ต่ำ</span><i className="sv-scale" /><span>สูง</span>
      </div>
    );
  }
  const text = {
    ortho: "ภาพถ่ายจากโดรน ต่อกันทั้งแปลง",
    contour: "เส้นหนา = ทุก 5 ม. · เส้นถี่ = ชัน",
    shade: "แสงส่องจากมุมซ้ายบน",
  }[mode];
  return text ? <div className="sv-legend">{text}</div> : null;
}

/** สวิตช์เปิด/ปิดชั้นข้อมูลบนแผนที่ */
function LayerSwitch({ label, checked, disabled, onChange }) {
  return (
    <label className={`sv-switch${disabled ? " is-disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="sv-track" aria-hidden="true"><span className="sv-knob" /></span>
      <span>{label}</span>
    </label>
  );
}

/**
 * หน้าต่างดูตัวอย่างแผนที่แบบเต็มจอ (lightbox)
 *  items  = sampleMapTypes   index = ตัวที่เปิดอยู่   onChange(i) = เปลี่ยนตัว   onClose() = ปิด
 * - ซ้าย: แผนที่เต็มกรอบ + ปุ่ม ‹ › + สวิตช์เส้น Contour / ขอบแปลง + คำอธิบายสี
 * - ขวา: ชื่อ คำอธิบาย ดูอะไรได้ เหมาะกับ + รูปย่อทั้ง 4 แบบให้กดสลับ + ปุ่มขอรับทาง LINE
 * - ลูกศรคีย์บอร์ด / ปัดซ้าย-ขวา เพื่อเลื่อนดู, Esc หรือกดพื้นหลังเพื่อปิด
 */
export default function SampleViewer({ items, index, onChange, onClose }) {
  const item = items[index];
  const count = items.length;
  const [showLines, setShowLines] = useState(false);
  const [showParcel, setShowParcel] = useState(false);
  const closeRef = useRef(null);
  const swipeX = useRef(null);

  const go = (step) => onChange((index + step + count) % count);
  const isContour = item.mode === "contour"; // แผนที่ Contour มีเส้นอยู่แล้ว

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onPointerDown = (e) => { swipeX.current = e.clientX; };
  const onPointerUp = (e) => {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div className="sv" role="dialog" aria-modal="true" aria-labelledby="svTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sv-box">
        <div className="sv-media" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          {/* key เปลี่ยนตามแบบ → เล่นแอนิเมชันจางเข้าทุกครั้งที่สลับ */}
          <div className="sv-map" key={item.mode}>
            <ContourMapSvg mode={item.mode} lines={showLines && !isContour ? 1 : 0} parcel={showParcel ? 1 : 0} cover />
          </div>
          <div className="sv-media-top">
            <span className="sv-chip">{item.short}</span>
            <span className="sv-chip is-muted">ภาพจำลอง</span>
          </div>
          <button type="button" className="sv-nav prev" aria-label="แบบก่อนหน้า" onClick={() => go(-1)}>‹</button>
          <button type="button" className="sv-nav next" aria-label="แบบถัดไป" onClick={() => go(1)}>›</button>
          <div className="sv-media-bottom">
            <div className="sv-switches">
              <LayerSwitch label="เส้น Contour" checked={isContour || showLines} disabled={isContour} onChange={setShowLines} />
              <LayerSwitch label="ขอบแปลง" checked={showParcel} onChange={setShowParcel} />
            </div>
            <MapLegend mode={item.mode} />
          </div>
        </div>

        <div className="sv-info">
          <button ref={closeRef} type="button" className="sv-close" aria-label="ปิด" onClick={onClose}>×</button>
          <div className="sv-scroll">
            <p className="sv-eyebrow">ตัวอย่างภาพสำรวจ · แบบที่ {index + 1}/{count}</p>
            <h3 id="svTitle">{item.caption}</h3>
            <p className="sv-desc">{item.desc}</p>

            <div className="sv-block">
              <h4>ดูอะไรได้บ้าง</h4>
              <ul className="sv-points">
                {item.points.map((p) => <li key={p}><CheckCircleIcon />{p}</li>)}
              </ul>
            </div>

            <div className="sv-block">
              <h4>เหมาะกับ</h4>
              <div className="sv-tags">{item.goodFor.map((t) => <span key={t}>{t}</span>)}</div>
            </div>

            <div className="sv-block">
              <h4>แบบอื่น ๆ</h4>
              <div className="sv-thumbs">
                {items.map((it, i) => (
                  <button
                    key={it.mode}
                    type="button"
                    className={i === index ? "on" : undefined}
                    aria-label={`ดู ${it.caption}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => onChange(i)}
                  >
                    <span className="sv-thumb-img"><ContourMapSvg mode={it.mode} cover /></span>
                    <span className="sv-thumb-name">{it.short}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sv-cta">
            <LineLink style={{ width: "100%" }}>ขอรับแผนที่แบบนี้ของที่ดินคุณ</LineLink>
            <p className="note">* ภาพจำลองเพื่อประกอบการนำเสนอ ไม่ใช่ที่ดินจริง</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
