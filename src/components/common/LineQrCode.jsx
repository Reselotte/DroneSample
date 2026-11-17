import { QRCodeCanvas } from "qrcode.react";
import siteConfig from "../../config/siteConfig";

/** QR Code สำหรับแอด LINE (ถ้าตั้ง qrImage ใน siteConfig จะใช้รูปนั้นแทน) */
export default function LineQrCode({ size = 120 }) {
  if (siteConfig.qrImage) return <img src={siteConfig.qrImage} alt="LINE QR" />;
  return <QRCodeCanvas value={siteConfig.lineUrl} size={size} level="H" />;
}
