import LineLink from "../../components/common/LineLink";
import faqItems from "../../data/faqItems";
import GlossarySection from "./GlossarySection";

/** หน้าคำถามที่พบบ่อย (/faq) */
export default function FaqPage() {
  return (
    <section className="alt" data-page="faq">
      <div className="wrap">
        <h2>คำถามที่พบบ่อย</h2>
        <p className="sub">ค่าบริการ ข้อมูลที่ต้องเตรียม การนัดบินสำรวจ และการลงประกาศขายที่ดิน · <a href="#glossary" onClick={(e) => { e.preventDefault(); document.getElementById("glossary")?.scrollIntoView({ behavior: "smooth" }); }}>ดูศัพท์น่ารู้</a></p>
        <div id="faqList" style={{ marginTop: 18 }}>
          {faqItems.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <div className="faqcta">
          <div>
            <b>ยังไม่เจอคำตอบที่ต้องการ?</b>
            <span>ส่งคำถามหรือพิกัดที่ดินให้ทีมงานทาง LINE ได้เลย</span>
          </div>
          <LineLink>ถามทีมงานทาง LINE</LineLink>
        </div>
        <GlossarySection />
      </div>
    </section>
  );
}
