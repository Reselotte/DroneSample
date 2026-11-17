import siteConfig from "../../config/siteConfig";
import { trackLineClick } from "../../utils/trackLineClick";

/**
 * ปุ่ม/ลิงก์ที่พาไปแอด LINE OA (เปิดแท็บใหม่)
 *  variant  "btn-line" = ปุ่มเขียว (ค่าเริ่มต้น) | "btn-w" = ปุ่มขาว | "plain" = ลิงก์ธรรมดา
 *  onClick  ถ้าส่งมาจะแทนพฤติกรรมปกติ (ใช้กับปุ่มคำนวณราคาที่ต้องขึ้นป๊อปอัปก่อน)
 */
export default function LineLink({ variant = "btn-line", className = "", children, onClick, ...rest }) {
  const base = variant === "plain" ? "js-line" : `btn ${variant} js-line`;
  return (
    <a
      className={`${base} ${className}`.trim()}
      href={siteConfig.lineUrl}
      target="_blank"
      rel="noopener"
      onClick={onClick || trackLineClick}
      {...rest}
    >
      {children}
    </a>
  );
}
