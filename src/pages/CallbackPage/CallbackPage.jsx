import { useState } from "react";
import CallbackForm from "./CallbackForm";
import { CalculatorIcon, CheckCircleIcon } from "../../components/common/Icons";

/** หน้า "ให้ทีมงานติดต่อกลับ" (#/callback): ทิ้งชื่อ-เบอร์ไว้ ทีมงานโทรกลับเพื่อสอบถามและนัดบินสำรวจพื้นที่ */
export default function CallbackPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
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
          </div>
        </div>
      </section>

      {/*
        แท็บลอยขอบขวากลางจอ พาไปหน้าลงประกาศขาย (มีคำนวณราคาในตัว)
        วางไว้นอก <section> เพราะ section มีแอนิเมชัน transform ที่ทำให้ position:fixed เพี้ยน
      */}
      <a className="side-tab" href="#/post" aria-label="ขายที่ดิน? ลงประกาศฟรี พร้อมคำนวณราคา">
        <span className="side-tab-ic"><CalculatorIcon /></span>
        <span className="side-tab-tx">
          <small>ขายที่ดิน? คำนวณราคาให้ด้วย</small>
          <b>ลงประกาศฟรี <i aria-hidden="true">→</i></b>
        </span>
        <span className="side-tab-short" aria-hidden="true">ลง<br />ประกาศ</span>
      </a>
    </>
  );
}
