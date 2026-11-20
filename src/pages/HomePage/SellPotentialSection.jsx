import ContourMapSvg from "../../components/common/ContourMapSvg";
import { CheckCircleIcon, DropIcon, SlopeIcon } from "../../components/common/Icons";

/** จุดเด่นสั้น ๆ ใต้หัวข้อ (ลดความกังวลก่อนกด) */
const POINTS = ["ปรึกษาฟรี ไม่มีค่าใช้จ่าย", "แค่ทิ้งชื่อกับเบอร์โทร", "ทีมงานโทรกลับในเวลาทำการ"];

/**
 * แบนเนอร์ชวนเจ้าของที่ดิน "อยากรู้ไหมว่าที่ดินขายได้ดีแค่ไหน?" (วางต่อจาก Hero ในหน้าแรก)
 * กดแล้วไปหน้าให้ทีมงานติดต่อกลับ (/callback)
 */
export default function SellPotentialSection() {
  return (
    <section className="sellpot" data-page="home">
      <div className="wrap">
        <a className="sellpot-card" href="/callback">
          <div className="sellpot-tx">
            <span className="sellpot-badge">สำหรับเจ้าของที่ดิน</span>
            <h2>
              อยากรู้ไหมว่าที่ดินของคุณ<br />
              <span>ขายได้ดีแค่ไหน?</span>
            </h2>
            <p>
              ให้ทีมงานบินโดรนสำรวจ ดูระดับความสูง ทางน้ำ และศักยภาพการใช้งานจริง
              ข้อมูลที่ผู้ซื้ออยากเห็น ช่วยให้ตัดสินใจซื้อได้ง่ายขึ้น
            </p>
            <ul>
              {POINTS.map((text) => <li key={text}>{text}</li>)}
            </ul>
            <span className="btn btn-w sellpot-btn">
              คลิกเลย ให้ทีมงานติดต่อกลับ <i aria-hidden="true">→</i>
            </span>
          </div>

          <div className="sellpot-vis" aria-hidden="true">
            <div className="sellpot-map">
              <ContourMapSvg mode="contour" parcel={1} pond={1} cover />
            </div>
            <span className="sellpot-chip c1"><SlopeIcon /> ความลาดชัน 3.2%</span>
            <span className="sellpot-chip c2"><DropIcon /> จุดน้ำขัง</span>
            <span className="sellpot-chip c3"><CheckCircleIcon /> เหมาะปลูกสร้าง</span>
          </div>
        </a>
      </div>
    </section>
  );
}
