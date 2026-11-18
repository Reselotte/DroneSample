/**
 * รูปที่แสดงเต็มทั้งรูปในกรอบ (ไม่ครอปส่วนไหนทิ้ง) — ที่ว่างข้าง ๆ เติมด้วยรูปเดียวกันแบบเบลอ
 * ใช้ในกรอบที่มีขนาดตายตัว (กรอบต้องเป็น position: relative)
 */
export default function FitImage({ src, alt = "", eager = false }) {
  return (
    <span className="fit-img">
      <span className="fit-img-bg" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" />
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} />
    </span>
  );
}
