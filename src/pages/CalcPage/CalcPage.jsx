import PriceCalculator from "./PriceCalculator";

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

        <a className="cross-link" href="#/callback">
          <b>อยากรู้สภาพที่ดินจริง ระดับความสูง ทางน้ำ ก่อนตั้งราคา?</b>
          <span>ให้ทีมงานติดต่อกลับ →</span>
        </a>
      </div>
    </section>
  );
}
