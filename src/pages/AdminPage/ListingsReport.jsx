import { LISTING_STATUSES, landTypeLabel } from "../../data/landListingOptions";
import { formatArea, formatBaht, formatThaiDate, listingCode } from "../../utils/listingFormat";
import { PrintDoc } from "./ChecklistPrint";

const statusLabel = (value) => LISTING_STATUSES.find((s) => s.value === value)?.label || value;

/**
 * ใบสรุปผลประกาศ (ซ่อนบนจอ แสดงเฉพาะตอนพิมพ์ · A4 แนวนอน)
 * items = ประกาศชุดที่กำลังดูอยู่ทั้งหมด (ทุกหน้า) · scope = ข้อความบอกว่าเป็นชุดไหน
 */
export default function ListingsReport({ items, counts, scope, email }) {
  const now = new Date();
  const today = now.toLocaleDateString("th-TH", { dateStyle: "long" });
  const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const rows = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totalValue = rows.reduce((n, l) => n + Number(l.total_price || 0), 0);
  const totalCount = LISTING_STATUSES.reduce((n, s) => n + (counts[s.value] || 0), 0);

  return (
    <PrintDoc className="adm-report">
      <div className="pd-head">
        <div className="pd-brand">
          <b>DroneSample</b>
          <span>สำรวจที่ดินจากมุมสูง</span>
        </div>
        <div className="pd-title">
          <h1>ใบสรุปผลประกาศขายที่ดิน</h1>
          <span>พิมพ์วันที่ {today} เวลา {time} น.</span>
        </div>
      </div>

      <table className="pd-grid rp-stats">
        <thead>
          <tr>
            {LISTING_STATUSES.map((s) => <th key={s.value}>{s.label}</th>)}
            <th>รวมทั้งระบบ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {LISTING_STATUSES.map((s) => <td key={s.value}>{counts[s.value] ?? "–"}</td>)}
            <td>{totalCount}</td>
          </tr>
        </tbody>
      </table>

      <div className="pd-sec">
        <h2>
          รายการ: {scope}
          <em>{rows.length} รายการ · มูลค่ารวม {formatBaht(totalValue)}</em>
        </h2>
        <table className="pd-grid rp-table">
          <thead>
            <tr>
              <th className="rp-no">ลำดับ</th>
              <th className="rp-code">รหัส</th>
              <th>ประกาศ</th>
              <th className="rp-loc">ที่ตั้ง</th>
              <th className="rp-area">ขนาด</th>
              <th className="rp-price">ราคา</th>
              <th className="rp-seller">ผู้ขาย</th>
              <th className="rp-date">วันที่ลง</th>
              <th className="rp-status">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => {
              const seller = l.listing_private || {};
              return (
                <tr key={l.id}>
                  <td className="rp-no">{i + 1}</td>
                  <td className="rp-code">{listingCode(l.id)}</td>
                  <td>
                    <b>{l.title}</b>
                    <small>{landTypeLabel(l.land_type)}</small>
                  </td>
                  <td className="rp-loc">{l.district ? `${l.district}, ` : ""}{l.province}</td>
                  <td className="rp-area">{formatArea(l.rai, l.ngan, l.wah)}</td>
                  <td className="rp-price">{formatBaht(l.total_price)}</td>
                  <td className="rp-seller">
                    {seller.seller_name || "–"}
                    {seller.phone && <small>{seller.phone}</small>}
                  </td>
                  <td className="rp-date">{formatThaiDate(l.created_at)}</td>
                  <td className="rp-status">{statusLabel(l.status)}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={9} className="rp-empty">ไม่มีรายการ</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="rp-foot">เอกสารภายใน มีข้อมูลผู้ขาย ห้ามเผยแพร่ · พิมพ์โดย {email}</p>
    </PrintDoc>
  );
}
