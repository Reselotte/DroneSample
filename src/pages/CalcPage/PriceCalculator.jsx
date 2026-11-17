import { useState } from "react";
import { createPortal } from "react-dom";
import siteConfig from "../../config/siteConfig";
import LineLink from "../../components/common/LineLink";
import { useToast } from "../../hooks/useToast";
import { formatNumber } from "../../utils/formatNumber";
import { trackLineClick } from "../../utils/trackLineClick";
import PriceDisclaimerDialog from "./PriceDisclaimerDialog";
import { CalculatorIcon } from "../../components/common/Icons";

const DASH = "—";
const GREETING = "สวัสดีครับ สนใจให้ตรวจสอบที่ดิน";

/** คำนวณขนาดรวม ราคารวม และข้อความสรุปที่จะคัดลอกไปวางใน LINE */
function calculate({ rai, ngan, wah, price, unit }) {
  const area = (+rai || 0) * 400 + (+ngan || 0) * 100 + (+wah || 0); // หน่วย: ตารางวา
  const priceNum = +price || 0;
  const empty = { total: DASH, area: DASH, sqm: DASH, perRai: DASH, summary: GREETING };
  if (!area) return empty;

  const r = Math.floor(area / 400);
  const n = Math.floor((area % 400) / 100);
  const w = +(area % 100).toFixed(2);
  const areaText = `${r} ไร่ ${n} งาน ${formatNumber(w, 2)} ตร.วา`;
  const sqm = `${formatNumber(area * 4)} ตร.ม.`;

  if (!priceNum) return { ...empty, area: areaText, sqm, summary: `${GREETING}\nขนาด: ${areaText}` };

  const total = unit === "wah" ? area * priceNum : (area / 400) * priceNum;
  const perRai = unit === "rai" ? priceNum : priceNum * 400;
  const totalText = `${formatNumber(total)} บาท`;
  return {
    total: totalText,
    area: areaText,
    sqm,
    perRai: `${formatNumber(perRai)} บาท`,
    summary: `${GREETING}\nขนาด: ${areaText}\nราคา: ${formatNumber(priceNum)} ${unit === "wah" ? "บาท/ตร.วา" : "บาท/ไร่"}\nรวม: ${totalText}`,
  };
}

/** เครื่องมือคำนวณราคาที่ดิน (กรอกขนาด + ราคา → ได้ราคารวม) */
export default function PriceCalculator() {
  const [input, setInput] = useState({ rai: "", ngan: "", wah: "", price: "", unit: "wah" });
  const [showDialog, setShowDialog] = useState(false);
  const toast = useToast();
  const result = calculate(input);

  const bind = (field) => ({
    value: input[field],
    onChange: (e) => setInput((v) => ({ ...v, [field]: e.target.value })),
  });

  // กด "รับทราบ" ในป๊อปอัป → คัดลอกข้อความ แล้วเปิด LINE
  const confirmSend = () => {
    setShowDialog(false);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(result.summary).then(() => toast("คัดลอกข้อความแล้ว สามารถวางในแชท LINE ได้ทันที"));
    }
    trackLineClick();
    window.open(siteConfig.lineUrl, "_blank", "noopener");
  };

  return (
    <>
      <div className="card calcbox">
        <h3><CalculatorIcon /> คำนวณราคาที่ดิน</h3>
        <label>ขนาดที่ดิน</label>
        <div className="row3">
          <div><input id="rai" type="number" min="0" step="any" placeholder="0" {...bind("rai")} /><label style={{ marginTop: 4 }}>ไร่</label></div>
          <div><input id="ngan" type="number" min="0" step="any" placeholder="0" {...bind("ngan")} /><label style={{ marginTop: 4 }}>งาน</label></div>
          <div><input id="wah" type="number" min="0" step="any" placeholder="0" {...bind("wah")} /><label style={{ marginTop: 4 }}>ตร.วา</label></div>
        </div>
        <label style={{ marginTop: 12 }}>ราคาที่เสนอขาย</label>
        <div className="row2" style={{ gridTemplateColumns: "2fr 1.4fr" }}>
          <input id="price" type="number" min="0" step="any" placeholder="0" {...bind("price")} />
          <select id="unit" {...bind("unit")}>
            <option value="wah">บาท / ตร.วา</option>
            <option value="rai">บาท / ไร่</option>
          </select>
        </div>
      </div>

      <div className="result">
        <div style={{ color: "var(--mu)" }}>ราคารวม</div>
        <div className="big" id="o_total">{result.total}</div>
        <dl>
          <dt>ขนาดรวม</dt><dd id="o_area">{result.area}</dd>
          <dt>คิดเป็นตารางเมตร</dt><dd id="o_sqm">{result.sqm}</dd>
          <dt>ราคาต่อไร่</dt><dd id="o_prai">{result.perRai}</dd>
        </dl>
        <p className="note">ตัวเลขนี้คำนวณจากที่ท่านกรอกเท่านั้น <u>ไม่ใช่ราคาซื้อขายจริง</u>ของที่ดิน</p>
        <LineLink
          className="js-calc"
          style={{ marginTop: 12, width: "100%" }}
          onClick={(e) => { e.preventDefault(); setShowDialog(true); }}
        >
          ส่งข้อมูลนี้ให้ทีมงานตรวจสอบทาง LINE
        </LineLink>
      </div>

      {showDialog &&
        createPortal(<PriceDisclaimerDialog onConfirm={confirmSend} onCancel={() => setShowDialog(false)} />, document.body)}
    </>
  );
}
