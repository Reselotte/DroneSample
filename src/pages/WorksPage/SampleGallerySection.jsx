import { useState } from "react";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import LineLink from "../../components/common/LineLink";
import sampleMapTypes from "../../data/sampleMapTypes";
import landTypeTabs from "../../data/landTypeTabs";
import { LockIcon } from "../../components/common/Icons";
import SampleViewer from "./SampleViewer";
import Term from "../../components/common/Term";

/** "ตัวอย่างภาพสำรวจ" 4 แบบ (กดดูเต็มจอได้) + แท็บ "Contour สำหรับงานแต่ละประเภท" */
export default function SampleGallerySection() {
  const [activeTab, setActiveTab] = useState("re");
  const [viewing, setViewing] = useState(null); // index ของภาพที่เปิดดูอยู่ (null = ปิด)
  const tab = landTypeTabs[activeTab];

  return (
    <section className="alt" data-page="works">
      <div className="wrap">
        <p className="eyebrow">ตัวอย่างภาพสำรวจ</p>
        <h2 style={{ marginBottom: 6 }}>สิ่งที่ท่านจะได้รับเมื่อติดต่อผ่าน LINE</h2>
        <p className="sub" style={{ marginBottom: 20 }}>กดที่ภาพเพื่อดูตัวอย่างแบบเต็ม พร้อมคำอธิบาย</p>

        <div className="grid g4 gal" id="gal">
          {sampleMapTypes.map(({ mode, caption }, i) => (
            <figure key={mode}>
              <button type="button" className="gal-open" onClick={() => setViewing(i)} aria-label={`ดูตัวอย่าง ${caption}`}>
                <div className="map">
                  <ContourMapSvg mode={mode} />
                  <span className="stamp">ตัวอย่าง</span>
                  <span className="gal-hint" aria-hidden="true">ดูตัวอย่าง</span>
                </div>
                <figcaption>{caption}</figcaption>
              </button>
            </figure>
          ))}
        </div>

        {viewing !== null && (
          <SampleViewer items={sampleMapTypes} index={viewing} onChange={setViewing} onClose={() => setViewing(null)} />
        )}

        <h2 style={{ marginTop: 44 }}><Term id="contour">Contour</Term> สำหรับงานแต่ละประเภท</h2>

        <div className="tabs" id="tabs">
          {Object.entries(landTypeTabs).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              data-t={key}
              className={key === activeTab ? "on" : undefined}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="two">
          <div>
            <div className="map" id="mainMap">
              <ContourMapSvg {...tab.mapOptions} />
              <span className="stamp">ตัวอย่าง</span>
              <div className="lock"><LockIcon /> ขอรับข้อมูลจริงของที่ดินท่านได้ทาง LINE</div>
            </div>
            <div className="legend">
              <span><i style={{ background: "#4f9bd1" }} />พื้นที่ลุ่มต่ำ น้ำท่วมขังง่าย</span>
              <span><i style={{ background: "#8fc78a" }} />ระดับปานกลาง</span>
              <span><i style={{ background: "#d9c58b" }} />พื้นที่สูง</span>
              <span>เส้นหนา = ทุกช่วง 5 เมตร</span>
            </div>
          </div>
          <div className="card">
            <h3 id="tabTitle" style={{ marginBottom: 0 }}>{tab.label}</h3>
            <div className="stats">
              <div><b>5.9 ม.</b>ความต่างระดับ</div>
              <div><b>3.2%</b><Term id="slope">ความลาดชันเฉลี่ย</Term></div>
              <div><b>~12%</b>สัดส่วนพื้นที่ลุ่มต่ำ</div>
            </div>
            <ul className="ck" id="tabList">
              {tab.points.map((text) => <li key={text}>{text}</li>)}
            </ul>
            <p className="note">* เป็นข้อมูลตัวอย่างเพื่อประกอบการนำเสนอ ไม่ใช่ที่ดินจริง</p>
            <LineLink style={{ width: "100%", marginTop: 10 }}>ขอรับ Contour ที่ดินของท่าน</LineLink>
          </div>
        </div>
      </div>
    </section>
  );
}
