import ContourMapSvg from "../../components/common/ContourMapSvg";
import FitImage from "../../components/common/FitImage";
import { AreaIcon, CameraIcon, PinIcon } from "../../components/common/Icons";
import { photoUrl } from "../../lib/listingsApi";
import ListingHighlights from "./ListingHighlights";
import { landTypeLabel } from "../../data/landListingOptions";
import { formatArea, formatPriceShort, listingCode } from "../../utils/listingFormat";

/** การ์ดประกาศหนึ่งรายการ (กดแล้วไปหน้ารายละเอียด) */
export default function ListingCard({ listing }) {
  const cover = listing.photos?.[0];

  return (
    <a className="lcard" href={`#/lands/${listing.id}`}>
      <div className="lcard-im">
        {cover ? (
          <FitImage src={photoUrl(cover)} alt={listing.title} />
        ) : (
          <ContourMapSvg mode="ortho" cover />
        )}
        <span className="lcard-type">{landTypeLabel(listing.land_type)}</span>
        {listing.photos?.length > 1 && <span className="lcard-count"><CameraIcon /> {listing.photos.length}</span>}
      </div>
      <div className="lcard-tx">
        <h3>{listing.title}</h3>
        <div className="lcard-price">฿ {formatPriceShort(listing.total_price)}</div>
        <div className="lcard-meta">
          <span><AreaIcon /> {formatArea(listing.rai, listing.ngan, listing.wah)}</span>
          <span><PinIcon /> {listing.district ? `${listing.district}, ` : ""}{listing.province}</span>
        </div>
        <ListingHighlights highlights={listing.highlights} compact max={2} />
        <div className="lcard-code">รหัส {listingCode(listing.id)}</div>
      </div>
    </a>
  );
}
