import { AREA_RANGES, LAND_TYPES, PRICE_RANGES, PROVINCES, SORT_OPTIONS } from "../../data/landListingOptions";

export const EMPTY_FILTERS = { province: "", landType: "", priceRange: "", minArea: "", sort: "newest" };

/** แปลงค่าจากตัวกรอง → เงื่อนไขที่ส่งให้ fetchListings */
export function toQuery(filters) {
  const [min, max] = filters.priceRange ? filters.priceRange.split("-") : ["", ""];
  return {
    province: filters.province,
    landType: filters.landType,
    minPrice: min ? Number(min) : 0,
    maxPrice: max ? Number(max) : 0,
    minAreaWah: filters.minArea ? Number(filters.minArea) : 0,
    sort: filters.sort,
  };
}

/** แถบตัวกรอง: จังหวัด ประเภท ราคา ขนาด และการเรียง (เปลี่ยนแล้วค้นหาทันที) */
export default function ListingFilters({ filters, onChange }) {
  const bind = (field) => ({
    value: filters[field],
    onChange: (e) => onChange({ ...filters, [field]: e.target.value }),
  });
  const isFiltered = Object.keys(EMPTY_FILTERS).some((k) => k !== "sort" && filters[k]);

  return (
    <div className="lfilters">
      <div>
        <label htmlFor="lf_prov">จังหวัด</label>
        <select id="lf_prov" {...bind("province")}>
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf_type">ประเภท</label>
        <select id="lf_type" {...bind("landType")}>
          <option value="">ทุกประเภท</option>
          {LAND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf_price">ราคารวม</label>
        <select id="lf_price" {...bind("priceRange")}>
          {PRICE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf_area">ขนาด</label>
        <select id="lf_area" {...bind("minArea")}>
          {AREA_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf_sort">เรียงตาม</label>
        <select id="lf_sort" {...bind("sort")}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {isFiltered && (
        <button type="button" className="lfilters-reset" onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
