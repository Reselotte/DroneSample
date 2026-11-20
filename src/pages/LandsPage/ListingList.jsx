import ContourMapSvg from "../../components/common/ContourMapSvg";
import FitImage from "../../components/common/FitImage";
import { photoUrl } from "../../lib/listingsApi";
import { landTypeLabel } from "../../data/landListingOptions";
import { formatNumber } from "../../utils/formatNumber";
import { formatArea, formatPriceShort, formatThaiDate, listingCode, unitPrices } from "../../utils/listingFormat";

/** มุมมองแบบรายการ: เรียงเป็นแถว มีคอลัมน์ข้อมูล (กดทั้งแถวเพื่อดูรายละเอียด) */
export default function ListingList({ items }) {
  return (
    <div className="llist" role="table" aria-label="ที่ดินประกาศขาย">
      <div className="llist-row llist-head" role="row">
        <span role="columnheader" className="c-name">ประกาศ</span>
        <span role="columnheader">ที่ตั้ง</span>
        <span role="columnheader">ขนาด</span>
        <span role="columnheader" className="c-num">ราคารวม</span>
        <span role="columnheader" className="c-num">ราคา / ไร่</span>
        <span role="columnheader">ลงประกาศ</span>
      </div>
      {items.map((l) => {
        const cover = l.photos?.[0];
        const { perRai } = unitPrices(l.total_price, l.area_wah);
        return (
          <a key={l.id} className="llist-row" role="row" href={`/lands/${l.id}`}>
            <span role="cell" className="c-name">
              <span className="llist-thumb">
                {cover ? <FitImage src={photoUrl(cover)} /> : <ContourMapSvg mode="ortho" cover />}
              </span>
              <span className="llist-title">
                <b>{l.title}</b>
                <small>{landTypeLabel(l.land_type)} · รหัส {listingCode(l.id)}</small>
              </span>
            </span>
            <span role="cell" className="c-loc">{l.district ? `${l.district}, ` : ""}{l.province}</span>
            <span role="cell" className="c-area">{formatArea(l.rai, l.ngan, l.wah)}</span>
            <span role="cell" className="c-num c-price">฿ {formatPriceShort(l.total_price)}</span>
            <span role="cell" className="c-num c-perrai">{perRai != null ? `${formatNumber(Math.round(perRai))}` : "—"}</span>
            <span role="cell" className="c-date">{formatThaiDate(l.created_at)}</span>
          </a>
        );
      })}
    </div>
  );
}
