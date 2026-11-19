import siteConfig from "../../config/siteConfig";
import LineQrCode from "../common/LineQrCode";
import LineLink from "../common/LineLink";
import { SERVICE_LINKS } from "../../data/navigationMenu";

/** ส่วนท้ายเว็บ: ลิงก์ลัด ข้อมูลติดต่อ และ QR Code */
export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="fg">
          <div>
            <h4 id="brand2">{siteConfig.brand}</h4>
            <p style={{ color: "var(--c-x-gray-82)", margin: "0 0 10px" }}>สำรวจที่ดินจากมุมสูง เพื่อการซื้อขายอย่างมั่นใจ</p>
            <div className="qr" id="qrBox"><LineQrCode size={120} /></div>
          </div>
          <div>
            <h4>บริการของเรา</h4>
            {SERVICE_LINKS.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
          </div>
          <div>
            <h4>เกี่ยวกับเรา</h4>
            <a href="#/works">ตัวอย่างผลงาน</a>
            <a href="#/steps">ขั้นตอนการทำงาน</a>
            <a href="#/faq">คำถามที่พบบ่อย</a>
          </div>
          <div>
            <h4>ติดต่อเรา</h4>
            <a id="tel" href={siteConfig.phoneHref}>{siteConfig.phone}</a>
            <a id="mail" href={siteConfig.emailHref}>{siteConfig.email}</a>
            <LineLink variant="plain" id="lineLink">LINE: {siteConfig.lineId}</LineLink>
            <div style={{ color: "var(--c-x-gray-63)", fontSize: 13, marginTop: 6 }} id="replyNote">{siteConfig.replyText}</div>
          </div>
        </div>
        <div className="copy">ข้อมูลเป็นแนวทางประกอบการตัดสินใจ ไม่ใช่คำแนะนำทางกฎหมายหรือการเงิน</div>
      </div>
    </footer>
  );
}
