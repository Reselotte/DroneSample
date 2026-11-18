import { useEffect, useState } from "react";
import ContourMapSvg from "../../components/common/ContourMapSvg";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { fetchListing, photoUrl } from "../../lib/listingsApi";
import { useToast } from "../../hooks/useToast";
import { landTypeLabel } from "../../data/landListingOptions";
import { formatNumber } from "../../utils/formatNumber";
import {
  formatArea, formatBaht, formatThaiDate, listingCode, unitPrices,
} from "../../utils/listingFormat";
import { sendLineMessage } from "../../utils/sendLineMessage";
import SetupNotice from "./SetupNotice";
import ListingHighlights from "./ListingHighlights";
import { highlightList } from "../../data/landChecklist";

/** แกลเลอรีรูป: รูปใหญ่ + รูปย่อให้กดเลือก */
function PhotoGallery({ photos, title }) {
  const [index, setIndex] = useState(0);
  if (!photos.length) {
    return <div className="ldg-main"><ContourMapSvg mode="ortho" cover /></div>;
  }
  return (
    <div className="ldg">
      <div className="ldg-main">
        <img src={photoUrl(photos[index])} alt={`${title} รูปที่ ${index + 1}`} />
      </div>
      {photos.length > 1 && (
        <div className="ldg-thumbs">
          {photos.map((path, i) => (
            <button
              key={path}
              type="button"
              className={i === index ? "on" : undefined}
              aria-label={`ดูรูปที่ ${i + 1}`}
              onClick={() => setIndex(i)}
            >
              <img src={photoUrl(path)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** หน้ารายละเอียดประกาศ (#/lands/<รหัส>) */
export default function LandDetailPage({ param }) {
  const [listing, setListing] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const toast = useToast();
  const id = Number(param);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    if (!Number.isInteger(id) || id <= 0) {
      setStatus("notfound");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    fetchListing(id)
      .then((data) => {
        if (cancelled) return;
        setListing(data);
        setStatus(data ? "ready" : "notfound");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [id]);

  const back = <a className="ld-back" href="#/lands">← กลับไปหน้ารายการ</a>;

  if (!isSupabaseConfigured) {
    return <section className="alt lands" data-page="lands"><div className="wrap">{back}<SetupNotice /></div></section>;
  }

  if (status !== "ready") {
    const message = {
      loading: <span>กำลังโหลดประกาศ…</span>,
      notfound: <><b>ไม่พบประกาศนี้</b><span>ประกาศอาจถูกปิดไปแล้ว หรือยังรอการตรวจสอบจากทีมงาน</span></>,
      error: <><b>โหลดประกาศไม่สำเร็จ</b><span>กรุณาลองใหม่อีกครั้ง</span></>,
    }[status];
    return (
      <section className="alt lands" data-page="lands">
        <div className="wrap">{back}<div className="lands-msg">{message}</div></div>
      </section>
    );
  }

  const code = listingCode(listing.id);
  const sold = listing.status === "sold";
  const { perRai, perWah } = unitPrices(listing.total_price, listing.area_wah);
  const hasLocation = listing.lat != null && listing.lng != null;
  const pageUrl = window.location.href;

  const askAboutListing = () =>
    sendLineMessage(`สวัสดีครับ สนใจที่ดินรหัส ${code}\n${listing.title}\n${pageUrl}`, toast);
  const askForContour = () =>
    sendLineMessage(`สวัสดีครับ ขอ Contour ของที่ดินรหัส ${code}\n${listing.title}\n${pageUrl}`, toast);

  return (
    <section className="alt lands ld" data-page="lands">
      <div className="wrap">
        {back}

        <div className="ld-grid">
          <div className="ld-left">
            <div className="ld-photo-wrap">
              <PhotoGallery photos={listing.photos || []} title={listing.title} />
              {sold && <span className="ld-sold">ขายแล้ว</span>}
            </div>

            {highlightList(listing.highlights).length > 0 && (
              <div className="card ld-section ld-highlights">
                <h3>จุดเด่นของที่ดินแปลงนี้</h3>
                <ListingHighlights highlights={listing.highlights} />
              </div>
            )}

            <div className="card ld-section">
              <h3>รายละเอียด</h3>
              <dl className="ld-facts">
                <dt>ประเภท</dt><dd>{landTypeLabel(listing.land_type)}</dd>
                <dt>ขนาด</dt><dd>{formatArea(listing.rai, listing.ngan, listing.wah)}</dd>
                <dt>คิดเป็น</dt><dd>{formatNumber(listing.area_wah * 4)} ตร.ม.</dd>
                <dt>ที่ตั้ง</dt><dd>{listing.district ? `${listing.district}, ` : ""}{listing.province}</dd>
                <dt>ลงประกาศ</dt><dd>{formatThaiDate(listing.created_at)}</dd>
                <dt>รหัสประกาศ</dt><dd>{code}</dd>
              </dl>
              {listing.description && <p className="ld-desc">{listing.description}</p>}
            </div>

            {hasLocation && (
              <div className="card ld-section">
                <h3>ตำแหน่งที่ดิน</h3>
                <div className="ld-map">
                  <iframe
                    title="แผนที่ตำแหน่งที่ดิน"
                    src={`https://maps.google.com/maps?q=${listing.lat},${listing.lng}&z=15&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <a
                  className="ld-maplink"
                  href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  เปิดใน Google Maps ↗
                </a>
              </div>
            )}
          </div>

          <aside className="ld-side">
            <div className="card ld-pricebox">
              <span className="ld-type">{landTypeLabel(listing.land_type)}</span>
              <h1 className="ld-title">{listing.title}</h1>
              <div className="ld-price">{formatBaht(listing.total_price)}</div>
              <div className="ld-unit">
                {perRai != null && <span>{formatNumber(perRai)} บาท/ไร่</span>}
                {perWah != null && <span>{formatNumber(perWah)} บาท/ตร.วา</span>}
              </div>

              {sold && (
                <p className="ld-sold-note">ที่ดินแปลงนี้ขายแล้ว ทักทีมงานทาง LINE เพื่อหาแปลงใกล้เคียงได้</p>
              )}

              <button type="button" className="btn btn-line" onClick={askAboutListing}>
                สนใจแปลงนี้ ติดต่อทาง LINE
              </button>
              <button type="button" className="btn btn-ghost" onClick={askForContour}>
                ขอ Contour ที่ดินแปลงนี้
              </button>
              <p className="note">
                กดแล้วระบบจะคัดลอกรหัสประกาศให้ วางในแชท LINE ได้ทันที ทีมงานจะประสานกับผู้ขายให้
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
