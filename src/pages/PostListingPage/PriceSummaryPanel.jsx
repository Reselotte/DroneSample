import { useState } from "react";
import { createPortal } from "react-dom";
import siteConfig from "../../config/siteConfig";
import LineLink from "../../components/common/LineLink";
import { CalculatorIcon } from "../../components/common/Icons";
import { useToast } from "../../hooks/useToast";
import { formatNumber } from "../../utils/formatNumber";
import { districtText } from "../../utils/listingFormat";
import { trackLineClick } from "../../utils/trackLineClick";
import PriceDisclaimerDialog from "./PriceDisclaimerDialog";

/** ขนาด + ราคาจากฟอร์ม → ตัวเลขที่แสดง (unit: total = ราคารวม / rai = ต่อไร่ / wah = ต่อตร.วา) */
export function calcPrice({ rai, ngan, wah, price, unit }) {
  const areaWah = (+rai || 0) * 400 + (+ngan || 0) * 100 + (+wah || 0);
  const p = +price || 0;
  if (!areaWah) return { areaWah: 0 };
  const total = !p ? 0 : unit === "total" ? p : unit === "rai" ? (p * areaWah) / 400 : p * areaWah;
  return {
    areaWah,
    total,
    perRai: total ? (total / areaWah) * 400 : 0,
    perWah: total ? total / areaWah : 0,
  };
}

/** "2 ไร่ 1 งาน 50 ตร.วา" จากตารางวารวม */
export function areaText(areaWah) {
  const r = Math.floor(areaWah / 400);
  const n = Math.floor((areaWah % 400) / 100);
  const w = +(areaWah % 100).toFixed(2);
  return [r && `${formatNumber(r)} ไร่`, n && `${n} งาน`, w && `${formatNumber(w, 2)} ตร.วา`].filter(Boolean).join(" ") || "—";
}

const baht = (n) => `${formatNumber(Math.round(n))} บาท`;

/** กล่องคำนวณราคา (ข้างฟอร์มลงประกาศ) — คิดจากขนาดและราคาที่กรอกในขั้นที่ 2 ทันที */
export default function PriceSummaryPanel({ values, onEdit }) {
  const [showDialog, setShowDialog] = useState(false);
  const toast = useToast();
  const r = calcPrice({ rai: values.rai, ngan: values.ngan, wah: values.wah, price: values.price, unit: values.priceUnit });
  const ready = r.areaWah > 0 && r.total > 0;

  const summary = [
    "สวัสดีครับ ขอคำแนะนำราคาที่ดิน",
    values.province && `จังหวัด: ${values.province}${districtText(values) ? ` (${districtText(values)})` : ""}`,
    r.areaWah && `ขนาด: ${areaText(r.areaWah)}`,
    ready && `ราคาที่ตั้งไว้: ${baht(r.total)} (ไร่ละ ${baht(r.perRai)})`,
  ].filter(Boolean).join("\n");

  const confirmSend = () => {
    setShowDialog(false);
    navigator.clipboard?.writeText(summary).then(() => toast("คัดลอกข้อความแล้ว วางในแชท LINE ได้ทันที"));
    trackLineClick();
    window.open(siteConfig.lineUrl, "_blank", "noopener");
  };

  return (
    <div className="card post-calc-card">
      <h3><CalculatorIcon /> คำนวณราคา</h3>

      <div className="post-calc-total">
        <span>ราคารวม</span>
        <b>{ready ? baht(r.total) : "—"}</b>
      </div>

      <dl className="post-calc-dl">
        <dt>ขนาดรวม</dt><dd>{r.areaWah ? areaText(r.areaWah) : "—"}</dd>
        <dt>คิดเป็น</dt><dd>{r.areaWah ? `${formatNumber(r.areaWah * 4)} ตร.ม.` : "—"}</dd>
        <dt>ราคาต่อไร่</dt><dd>{ready ? baht(r.perRai) : "—"}</dd>
        <dt>ราคาต่อตร.วา</dt><dd>{ready ? baht(r.perWah) : "—"}</dd>
      </dl>

      {!ready && (
        <p className="post-calc-hint">
          กรอก <b>ขนาดที่ดิน</b> และ <b>ราคาขาย</b> ในขั้นที่ 2 แล้วตัวเลขจะขึ้นที่นี่ทันที
          {onEdit && <> · <button type="button" className="post-calc-link" onClick={onEdit}>ไปกรอก</button></>}
        </p>
      )}
      <p className="post-calc-note">คำนวณจากตัวเลขที่ท่านกรอกเท่านั้น <u>ไม่ใช่ราคาประเมินหรือราคาตลาด</u></p>

      {ready && (
        <LineLink className="post-calc-line" onClick={(e) => { e.preventDefault(); setShowDialog(true); }}>
          ขอคำแนะนำราคาจากทีมงาน
        </LineLink>
      )}

      {showDialog && createPortal(
        <PriceDisclaimerDialog onConfirm={confirmSend} onCancel={() => setShowDialog(false)} />,
        document.body,
      )}
    </div>
  );
}
