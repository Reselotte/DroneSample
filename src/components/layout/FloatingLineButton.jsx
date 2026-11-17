import LineLink from "../common/LineLink";

/** ปุ่มแอด LINE ที่ลอยติดด้านล่างจอทุกหน้า */
export default function FloatingLineButton() {
  return (
    <div className="float">
      <LineLink>ขอรับ Contour ที่ดินฟรีผ่าน LINE</LineLink>
    </div>
  );
}
