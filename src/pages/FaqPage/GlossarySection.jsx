import ContourMapSvg from "../../components/common/ContourMapSvg";
import { AreaIcon, DroneIcon, SlopeIcon } from "../../components/common/Icons";
import glossary, { GLOSSARY_ORDER } from "../../data/glossary";

/** ไอคอนของคำที่ไม่มีภาพแผนที่ประกอบ */
const ICONS = { slope: SlopeIcon, cutfill: AreaIcon, lidar: DroneIcon };

/** "ศัพท์น่ารู้" ในหน้าคำถามที่พบบ่อย: รวมคำศัพท์ทั้งหมดพร้อมภาพประกอบ */
export default function GlossarySection() {
  return (
    <div className="gloss" id="glossary">
      <h3 className="gloss-title">ศัพท์น่ารู้</h3>
      <p className="gloss-sub">คำที่เจอบ่อยบนเว็บนี้ อธิบายแบบเข้าใจง่าย</p>
      <div className="gloss-grid">
        {GLOSSARY_ORDER.map((key) => {
          const { title, text, visual } = glossary[key];
          const Icon = ICONS[key];
          return (
            <article className="card gloss-item" key={key}>
              {visual && <div className="gloss-vis"><ContourMapSvg mode={visual.mode} cover /></div>}
              <div className="gloss-tx">
                {!visual && Icon && <span className="gloss-ic"><Icon /></span>}
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
