/** "ลูกค้าที่ไว้วางใจเรา" (ช่องโลโก้ ใส่รูปโลโก้จริงแทนข้อความได้) */
const CUSTOMER_LOGOS = ["โลโก้ลูกค้า 1", "โลโก้ลูกค้า 2", "โลโก้ลูกค้า 3", "โลโก้ลูกค้า 4"];

export default function CustomersSection() {
  return (
    <section data-page="works">
      <div className="wrap">
        <p className="eyebrow">ลูกค้าของเรา</p>
        <h2>ลูกค้าที่ไว้วางใจเรา</h2>
        <div className="logos">
          {CUSTOMER_LOGOS.map((text) => <div key={text}>{text}</div>)}
        </div>
      </div>
    </section>
  );
}
