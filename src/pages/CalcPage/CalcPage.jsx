import PriceCalculator from "./PriceCalculator";
import { DroneIcon } from "../../components/common/Icons";

/** หน้าคำนวณราคาที่ดิน (#/calc): กรอกขนาด + ราคาต่อหน่วย → ได้ราคารวมทันที */
export default function CalcPage() {
  return (
    <section className="alt calcpage" data-page="calc">
      <div className="wrap">
        <h2>คำนวณราคาที่ดิน</h2>
        <p className="sub">กรอกขนาดที่ดินและราคาต่อหน่วย <span className="hl">ได้ราคารวมทันที</span> พร้อมส่งตัวเลขให้ทีมงานตรวจสอบทาง LINE</p>

        <div className="calc-grid">
          <PriceCalculator />
        </div>

        {/* แถบชวนไปหน้าติดต่อกลับ: ขอบแสงวิ่งรอบ + เรืองเป็นจังหวะ + แสงกวาด ให้สะดุดตา */}
        <a className="cross-link glow-cta" href="#/callback">
          <span className="glow-cta-ic"><DroneIcon /></span>
          <span className="glow-cta-tx">
            <b>อยากรู้สภาพที่ดินจริง ระดับความสูง ทางน้ำ ก่อนตั้งราคา?</b>
            <small>ให้ทีมงานบินโดรนสำรวจ ปรึกษาฟรี ไม่มีค่าใช้จ่าย</small>
          </span>
          <span className="glow-cta-btn">ให้ทีมงานติดต่อกลับ <i aria-hidden="true">→</i></span>
        </a>
      </div>
    </section>
  );
}
