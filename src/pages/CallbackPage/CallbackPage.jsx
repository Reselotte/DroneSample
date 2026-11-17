import { useState } from "react";
import CallbackForm from "./CallbackForm";
import { CheckCircleIcon } from "../../components/common/Icons";

/** หน้า "ให้ทีมงานติดต่อกลับ" (#/callback): ทิ้งชื่อ-เบอร์ไว้ ทีมงานโทรกลับเพื่อสอบถามและนัดบินสำรวจพื้นที่ */
export default function CallbackPage() {
  const [sent, setSent] = useState(false);

  return (
    <section className="alt callback" data-page="callback">
      <div className="wrap">
        <h2>ให้ทีมงานติดต่อกลับ</h2>
        <p className="sub">
          ทิ้งชื่อและเบอร์โทรไว้ <span className="hl">ทีมงานจะโทรกลับ</span> เพื่อสอบถามและนัดบินโดรนสำรวจพื้นที่ ปรึกษาฟรี
        </p>

        <div className="callback-body">
          <CallbackForm hidden={sent} onSent={() => { setSent(true); window.scrollTo(0, 0); }} />

          {sent && (
            <div className="ok callback-ok">
              <div className="ico ico-ok"><CheckCircleIcon /></div>
              <h3>ได้รับข้อมูลแล้ว ขอบคุณครับ</h3>
              <p>ทีมงานจะโทรกลับตามหมายเลขที่ให้ไว้ ภายในเวลาทำการ เพื่อสอบถามรายละเอียดและนัดวันบินสำรวจครับ</p>
            </div>
          )}

          <a className="cross-link" href="#/calc">
            <b>อยากรู้ราคาที่ดินคร่าว ๆ ก่อน?</b>
            <span>ลองใช้เครื่องคำนวณราคา →</span>
          </a>
        </div>
      </div>
    </section>
  );
}
