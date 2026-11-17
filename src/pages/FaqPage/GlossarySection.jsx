import { useRef, useState } from "react";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import { AreaIcon, BookIcon, BulbIcon, DroneIcon, SlopeIcon } from "../../components/common/Icons";
import glossary, { GLOSSARY_ORDER } from "../../data/glossary";
import { gentleScrollToElement } from "../../utils/gentleScroll";

/** ไอคอนของคำที่ไม่มีภาพแผนที่ประกอบ */
const ICONS = { slope: SlopeIcon, cutfill: AreaIcon, lidar: DroneIcon };

/**
 * "ศัพท์น่ารู้" ในหน้าคำถามที่พบบ่อย
 * หัวข้อ + ปุ่มลัดไปแต่ละคำ → การ์ดแต่ละคำ: ภาพ/ไอคอน, ชื่อไทย + ป้ายอังกฤษ, "จำง่าย ๆ", คำอธิบาย, ใช้ทำอะไร
 *
 * กดปุ่มลัด: ค่อย ๆ เลื่อนไปที่การ์ด (gentleScroll) → ถึงแล้วไฮไลต์ทั้งกล่อง (กรอบฟ้าหนา + พื้นฟ้าอ่อน + แสงกระเพื่อม)
 * แล้วค้างกรอบฟ้าไว้จนกว่าจะกดคำอื่น / ปุ่มลัดของคำนั้นเป็นสีเข้ม
 */
export default function GlossarySection() {
  const [active, setActive] = useState(null); // คำที่กดล่าสุด (ปุ่มลัดเป็นสีเข้มทันที)
  const [highlighted, setHighlighted] = useState(null); // การ์ดที่ไฮไลต์ (ตั้งหลังเลื่อนไปถึงแล้ว)
  const [flash, setFlash] = useState(0); // นับครั้ง → ใช้เป็น key ให้แอนิเมชันเล่นใหม่ทุกครั้ง (แม้กดคำเดิมซ้ำ)
  const jumpId = useRef(0);

  const jumpTo = (key) => async (e) => {
    e.preventDefault(); // ไม่เปลี่ยน # ใน URL (เว็บใช้ # เปลี่ยนหน้า)
    const id = ++jumpId.current;
    setActive(key);
    setHighlighted(null);
    // ค่อย ๆ ไหลไปหาการ์ด แล้วค่อยไฮไลต์ตอนถึง (ถ้าผู้ใช้เลื่อนเองระหว่างทาง ก็ยังไฮไลต์ให้เห็น)
    await gentleScrollToElement(document.getElementById(`term-${key}`));
    if (id !== jumpId.current) return; // มีการกดคำอื่นต่อระหว่างทาง
    setHighlighted(key);
    setFlash((n) => n + 1);
  };

  return (
    <div className="gloss" id="glossary">
      <div className="gloss-head">
        <span className="gloss-head-ic"><BookIcon /></span>
        <div>
          <h3 className="gloss-title">ศัพท์น่ารู้</h3>
          <p className="gloss-sub">คำที่เจอบ่อยบนเว็บนี้ อธิบายแบบเข้าใจง่ายใน 10 วินาที</p>
        </div>
      </div>

      <nav className="gloss-jump" aria-label="ไปยังคำศัพท์">
        {GLOSSARY_ORDER.map((key) => (
          <a
            key={key}
            href={`#term-${key}`}
            className={active === key ? "on" : undefined}
            aria-current={active === key ? "true" : undefined}
            onClick={jumpTo(key)}
          >
            {glossary[key].en || glossary[key].th}
          </a>
        ))}
      </nav>

      <div className="gloss-grid">
        {GLOSSARY_ORDER.map((key, i) => {
          const { th, en, tip, text, usedFor, visual } = glossary[key];
          const Icon = ICONS[key];
          const isActive = highlighted === key;
          return (
            <article
              className={`gloss-card${isActive ? " is-active" : ""}`}
              key={isActive ? `${key}-${flash}` : key}
              id={`term-${key}`}
              tabIndex={-1}
            >
              {isActive && <span className="gloss-flash" aria-hidden="true" />}
              <div className={`gloss-media${visual ? "" : " is-icon"}`}>
                {visual ? <ContourMapSvg mode={visual.mode} cover /> : Icon && <Icon />}
                <span className="gloss-no">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="gloss-body">
                <div className="gloss-name">
                  <h4>{th}</h4>
                  {en && en !== th && <span className="gloss-en">{en}</span>}
                </div>
                <p className="gloss-tip"><BulbIcon /><span><b>จำง่าย ๆ</b> {tip}</span></p>
                <p className="gloss-text">{text}</p>
                {usedFor?.length > 0 && (
                  <div className="gloss-uses">
                    {usedFor.map((u) => <span key={u}>{u}</span>)}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
