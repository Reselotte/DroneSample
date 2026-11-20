import { useCallback, useEffect, useRef, useState } from "react";
import FitImage from "../../components/common/FitImage";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { fetchListing, isMyListing, photoUrl } from "../../lib/listingsApi";
import { useToast } from "../../hooks/useToast";
import { landTypeLabel } from "../../data/landListingOptions";
import { formatNumber } from "../../utils/formatNumber";
import {
  formatArea, formatBaht, formatThaiDate, listingCode, unitPrices,
} from "../../utils/listingFormat";
import { sendLineMessage } from "../../utils/sendLineMessage";
import SetupNotice from "./SetupNotice";
import ListingHighlights from "./ListingHighlights";
import PhotoGallery from "./PhotoGallery";
import { highlightList } from "../../data/landChecklist";

/** แท็กจุดเด่น (แบบแท็กร้านเกม) — กดแล้วเลื่อนไปที่หัวข้อจุดเด่น */
function HighlightTags({ highlights, max = 6 }) {
  const list = highlightList(highlights);
  if (!list.length) return null;
  const toSection = () => document.getElementById("ld-highlights")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <div className="ld-tags" aria-label="จุดเด่น">
      {list.slice(0, max).map((h) => (
        <button key={h.key} type="button" className="ld-tag" title={h.note || h.label} onClick={toSection}>{h.label}</button>
      ))}
      {list.length > max && (
        <button type="button" className="ld-tag is-more" onClick={toSection}>+{list.length - max}</button>
      )}
    </div>
  );
}

/** หน้ารายละเอียดประกาศ (/lands/<รหัส>) */
export default function LandDetailPage({ param }) {
  const [listing, setListing] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const toast = useToast();
  const id = Number(param);
  const [photoIndex, setPhotoIndex] = useState(0);
  const setIndex = useCallback((v) => setPhotoIndex(v), []);
  const mainPhoto = useRef(null);
  const [mine, setMine] = useState(false); // ประกาศนี้เป็นของบัญชีที่เข้าระบบอยู่ → โชว์ปุ่มแก้ไข
  useEffect(() => {
    if (isSupabaseConfigured && Number.isInteger(id) && id > 0) isMyListing(id).then(setMine);
  }, [id]);
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

  const back = <a className="ld-back" href="/lands">← กลับไปหน้ารายการ</a>;

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
  const photos = listing.photos || [];
  const cover = photos[photoIndex] || photos[0];
  const location = `${listing.district ? `${listing.district}, ` : ""}${listing.province}`;
  const shortDesc = (listing.description || "").replace(/\s+/g, " ").trim();

  const askAboutListing = () =>
    sendLineMessage(`สวัสดีครับ สนใจที่ดินรหัส ${code}\n${listing.title}\n${pageUrl}`, toast);
  const askForContour = () =>
    sendLineMessage(`สวัสดีครับ ขอ Contour ของที่ดินรหัส ${code}\n${listing.title}\n${pageUrl}`, toast);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast("คัดลอกลิงก์ประกาศแล้ว");
    } catch {
      toast("คัดลอกไม่สำเร็จ");
    }
  };
  const toGallery = () => mainPhoto.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <section className="alt lands ld" data-page="lands">
      <div className="wrap">
        {back}

        {/* หัวเรื่อง: ชื่อประกาศ + ประเภท + รหัส */}
        <div className="ld-head">
          <h1 className="ld-title">{listing.title}</h1>
          <div className="ld-head-meta">
            <span className="ld-type">{landTypeLabel(listing.land_type)}</span>
            <span>รหัส {code}</span>
          </div>
        </div>

        {/* บล็อกหลัก: แกลเลอรี (ซ้าย) | แผงข้อมูล (ขวา) */}
        <div className="ld-hero">
          <div className="ld-photo-wrap">
            <PhotoGallery photos={photos} title={listing.title} index={photoIndex} onIndex={setIndex} mainRef={mainPhoto} />
            {sold && <span className="ld-sold">ขายแล้ว</span>}
          </div>

          <div className="ld-info">
            {/* รูปหน้าปก (รูปแรกของประกาศ คงที่ ไม่เปลี่ยนตามแกลเลอรี) */}
            {photos[0] && (
              <button type="button" className="ld-cover" onClick={toGallery} aria-label="ดูรูปใหญ่">
                <FitImage src={photoUrl(photos[0])} />
              </button>
            )}
            {shortDesc && <p className="ld-short">{shortDesc}</p>}

            <dl className="ld-rows">
              <dt>ราคา</dt><dd className="ld-price">{formatBaht(listing.total_price)}</dd>
              {perRai != null && <><dt>ราคาต่อไร่</dt><dd>{formatNumber(perRai)} บาท</dd></>}
              {perWah != null && <><dt>ราคาต่อตร.วา</dt><dd>{formatNumber(perWah)} บาท</dd></>}
              <dt className="is-gap">ขนาด</dt><dd className="is-gap">{formatArea(listing.rai, listing.ngan, listing.wah)}</dd>
              <dt>ที่ตั้ง</dt><dd>{location}</dd>
              <dt>ลงประกาศ</dt><dd>{formatThaiDate(listing.created_at)}</dd>
            </dl>

            {highlightList(listing.highlights).length > 0 && (
              <div className="ld-tags-box">
                <span>จุดเด่นของที่ดินแปลงนี้:</span>
                <HighlightTags highlights={listing.highlights} />
              </div>
            )}
          </div>
        </div>

        {/* แถบปุ่ม: ติดต่อ (ซ้าย) | ดูแปลงอื่น (ขวา) */}
        <div className="ld-actions">
          <button type="button" className="btn btn-line" onClick={askAboutListing}>สนใจแปลงนี้ ติดต่อทาง LINE</button>
          <button type="button" className="btn btn-ghost" onClick={askForContour}>ขอ Contour ที่ดินแปลงนี้</button>
          <button type="button" className="btn btn-ghost" onClick={copyLink}>คัดลอกลิงก์</button>
          {mine && listing.status !== "sold" && <a className="btn ld-mine" href={`/mylistings/${listing.id}`}>✎ แก้ไขประกาศของฉัน</a>}
          <a className="btn btn-ghost ld-actions-next" href="/lands">ดูแปลงอื่น →</a>
        </div>
        {sold && <p className="ld-sold-note">ที่ดินแปลงนี้ขายแล้ว ทักทีมงานทาง LINE เพื่อหาแปลงใกล้เคียงได้</p>}

        {/* ด้านล่าง: รายละเอียด (ซ้าย) | กล่องติดต่อค้างจอ (ขวา) */}
        <div className="ld-grid">
          <div className="ld-left">
            {highlightList(listing.highlights).length > 0 && (
              <div className="card ld-section ld-highlights" id="ld-highlights">
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
                <dt>ที่ตั้ง</dt><dd>{location}</dd>
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
              {cover && (
                <button type="button" className="ld-side-photo" onClick={toGallery} aria-label="กลับไปดูรูปใหญ่">
                  <FitImage src={photoUrl(cover)} />
                  {photos.length > 1 && <em>{photoIndex + 1} / {photos.length}</em>}
                </button>
              )}
              <b className="ld-side-title">{listing.title}</b>
              <div className="ld-side-price">{formatBaht(listing.total_price)}</div>
              <button type="button" className="btn btn-line" onClick={askAboutListing}>สนใจแปลงนี้ ติดต่อทาง LINE</button>
              <p className="note">กดแล้วระบบจะคัดลอกรหัสประกาศให้ วางในแชท LINE ได้ทันที ทีมงานจะประสานกับผู้ขายให้</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
