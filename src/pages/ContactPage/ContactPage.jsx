import siteConfig from "../../config/siteConfig";
import BackgroundVideo from "../../components/common/BackgroundVideo";
import LineLink from "../../components/common/LineLink";
import LineQrCode from "../../components/common/LineQrCode";

const ICON_PROPS = {
  viewBox: "0 0 24 24", width: 22, height: 22, fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true",
};

const PhoneIcon = () => (
  <svg {...ICON_PROPS}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
);
const MailIcon = () => (
  <svg {...ICON_PROPS}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const ClockIcon = () => (
  <svg {...ICON_PROPS}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

/** ทำให้ช่วงเวลา เช่น "09:00–18:00 น." ไม่ขึ้นบรรทัดใหม่กลางตัวเลข */
function ReplyText({ text }) {
  const match = text.match(/(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\s*น\.?)/);
  if (!match) return text;
  const [time] = match;
  const at = text.indexOf(time);
  return (
    <>
      {text.slice(0, at)}
      <span style={{ whiteSpace: "nowrap" }}>{time}</span>
      {text.slice(at + time.length)}
    </>
  );
}

/** หน้าติดต่อเรา (/contact) */
export default function ContactPage() {
  return (
    <section data-page="contact" className="ct">
      <div className="wrap">
        <div className="ct-head">
          <p className="eyebrow">ติดต่อเรา</p>
          <h2>ปรึกษาทีมงานได้ทันที</h2>
          <p className="sub">ส่งพิกัดที่ดินมา ทีมงานจะตรวจสอบให้</p>
        </div>
        <div className="ct-grid">
          <div className="ct-main">
            <BackgroundVideo className="rv bv" />
            <div className="ct-in">
              <span className="ct-badge">ตอบกลับไว ผ่าน LINE</span>
              <h3>แอด LINE รับคำปรึกษาฟรี</h3>
              <p>ส่งพิกัดหรือรูปแปลงที่ดิน ทีมงานตรวจสอบ แล้วส่งแผนที่ Contour กลับให้ทาง LINE</p>
              <div className="ct-act">
                <div>
                  <LineLink>เพิ่มเพื่อน LINE รับคำปรึกษาฟรี</LineLink>
                  <div className="note" id="lineIdText">LINE ID: {siteConfig.lineId}</div>
                </div>
                <div className="ct-qr" id="qrBox2" aria-label="QR Code LINE"><LineQrCode size={132} /></div>
              </div>
              <ul className="ct-ck">
                <li>ไม่มีค่าใช้จ่าย</li>
                <li>ไม่ต้องสำรวจเอง</li>
                <li>รับผลผ่าน LINE</li>
              </ul>
            </div>
          </div>
          <div className="ct-side">
            <div className="ct-card">
              <span className="ic"><PhoneIcon /></span>
              <div><small>โทรศัพท์</small><a id="tel2" href={siteConfig.phoneHref}>{siteConfig.phone}</a></div>
            </div>
            <div className="ct-card">
              <span className="ic"><MailIcon /></span>
              <div><small>อีเมล</small><a id="mail2" href={siteConfig.emailHref}>{siteConfig.email}</a></div>
            </div>
            <div className="ct-card ct-time">
              <span className="ic"><ClockIcon /></span>
              <div><small>เวลาทำการ</small><span id="replyNote2"><ReplyText text={siteConfig.replyText} /></span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
