import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import LineLink from "../../components/common/LineLink";
import sampleMapTypes from "../../data/sampleMapTypes";
import landTypeTabs from "../../data/landTypeTabs";
import { LockIcon } from "../../components/common/Icons";
import SampleViewer from "./SampleViewer";
import Term from "../../components/common/Term";

const TAB_KEYS = Object.keys(landTypeTabs);
const AUTO_MS = 5000; // สลับแท็บอัตโนมัติทุก 5 วินาที
const MANUAL_HOLD_MS = 12000; // กดเลือกแท็บเอง → ค้างไว้ให้อ่าน 12 วินาทีก่อนสลับต่อ
const FADE_OUT_MS = 280; // เนื้อหาเดิมจางออกก่อน แล้วเนื้อหาใหม่จึงจางเข้า

/**
 * "ตัวอย่างภาพสำรวจ" 4 แบบ (กดดูเต็มจอได้) + แท็บ "Contour สำหรับงานแต่ละประเภท"
 * แท็บสลับเองทีละงาน (มีแถบความคืบหน้าที่แท็บ) หยุดชั่วคราวเมื่อ: เอาเมาส์/โฟกัสอยู่บนส่วนนี้,
 * ส่วนนี้ไม่อยู่บนจอ, หรือเปิดหน้าต่างดูตัวอย่างอยู่
 */
export default function SampleGallerySection() {
  const [activeTab, setActiveTab] = useState("re");
  const [viewing, setViewing] = useState(null); // index ของภาพที่เปิดดูอยู่ (null = ปิด)
  const [hovering, setHovering] = useState(false);
  const [inView, setInView] = useState(false);
  const [manual, setManual] = useState(false); // แท็บปัจจุบันถูกกดเลือกเอง
  const [shownTab, setShownTab] = useState("re"); // แท็บที่เนื้อหากำลังแสดง (ตามหลัง activeTab ระหว่างจางออก)
  const [fadingOut, setFadingOut] = useState(false);
  const [pill, setPill] = useState(null); // ตำแหน่งแถบไฮไลต์ที่เลื่อนไปหาแท็บที่เลือก
  const rotatorRef = useRef(null);
  const tabsRef = useRef(null);
  const tab = landTypeTabs[shownTab];

  // สลับเนื้อหาแบบนุ่ม: จางเนื้อหาเดิมออก → เปลี่ยน → จางเข้า (ผ่าน CSS transition)
  useEffect(() => {
    if (activeTab === shownTab) return undefined;
    setFadingOut(true);
    const t = setTimeout(() => { setShownTab(activeTab); setFadingOut(false); }, FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [activeTab, shownTab]);

  // วัดตำแหน่งแท็บที่เลือก ให้แถบไฮไลต์เลื่อนไปหา (วัดใหม่เมื่อขนาดเปลี่ยน เช่น ปรับขนาดตัวอักษร)
  useLayoutEffect(() => {
    const box = tabsRef.current;
    if (!box) return undefined;
    const measure = () => {
      const btn = box.querySelector(`button[data-t="${activeTab}"]`);
      if (btn) setPill({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [activeTab]);

  const running = !hovering && inView && viewing === null;
  const delay = manual ? MANUAL_HOLD_MS : AUTO_MS;

  // ส่วนนี้อยู่บนจอหรือไม่ (ไม่อยู่ = ไม่ต้องสลับ)
  useEffect(() => {
    const el = rotatorRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ตั้งเวลาสลับไปแท็บถัดไป (เริ่มนับใหม่ทุกครั้งที่แท็บเปลี่ยน/กลับมาเล่นต่อ)
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => {
      const i = TAB_KEYS.indexOf(activeTab);
      setActiveTab(TAB_KEYS[(i + 1) % TAB_KEYS.length]);
      setManual(false);
    }, delay);
    return () => clearTimeout(t);
  }, [activeTab, running, delay]);

  const pickTab = (key) => { setActiveTab(key); setManual(true); };

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

        <div
          className="type-rotator"
          ref={rotatorRef}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovering(false); }}
        >
        <div className="tabs" id="tabs" ref={tabsRef}>
          {pill && (
            <span
              className="tab-pill"
              aria-hidden="true"
              style={{ width: pill.width, height: pill.height, transform: `translate(${pill.left}px, ${pill.top}px)` }}
            />
          )}
          {Object.entries(landTypeTabs).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              data-t={key}
              className={key === activeTab ? "on" : undefined}
              aria-pressed={key === activeTab}
              onClick={() => pickTab(key)}
            >
              {label}
              {/* แถบความคืบหน้า: เริ่มใหม่ทุกครั้งที่ตัวนับเริ่มใหม่ (key) และหยุดตามตัวนับ */}
              {key === activeTab && running && (
                <span className="tab-progress" key={`${activeTab}-${delay}`} style={{ animationDuration: `${delay}ms` }} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {/* จางออก/เข้าแบบนุ่มทุกครั้งที่สลับแท็บ */}
        <div className={`two type-panel${fadingOut ? " is-out" : ""}`}>
          <div>
            <div className="map" id="mainMap">
              <ContourMapSvg {...tab.mapOptions} />
              <span className="stamp">ตัวอย่าง</span>
              <div className="lock"><LockIcon /> ขอรับข้อมูลจริงของที่ดินท่านได้ทาง LINE</div>
            </div>
            <div className="legend">
              <span><i style={{ background: "var(--c-map-low)" }} />พื้นที่ลุ่มต่ำ น้ำท่วมขังง่าย</span>
              <span><i style={{ background: "var(--c-map-mid)" }} />ระดับปานกลาง</span>
              <span><i style={{ background: "var(--c-map-high)" }} />พื้นที่สูง</span>
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
      </div>
    </section>
  );
}
