import { AREA_CUSTOM, AREA_RANGES, LAND_TYPES, PRICE_RANGES, PROVINCES, SORT_GROUPS } from "../../data/landListingOptions";

export const EMPTY_FILTERS = {
  province: "", landType: "", priceRange: "",
  area: "", minRai: "", maxRai: "", // area = ช่วงที่เลือก หรือ "custom" (ใช้ minRai/maxRai ที่พิมพ์เอง)
  sort: "newest",
};

const RAI_TO_WAH = 400;
const toNum = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? 0 : Math.max(0, Number(v)));

/** แปลงค่าจากตัวกรอง → เงื่อนไขที่ส่งให้ fetchListings (ขนาดเป็นตารางวา) */
export function toQuery(filters) {
  const [minP, maxP] = filters.priceRange ? filters.priceRange.split("-") : ["", ""];
  let minRai = 0;
  let maxRai = 0;
  if (filters.area === AREA_CUSTOM) {
    minRai = toNum(filters.minRai);
    maxRai = toNum(filters.maxRai);
  } else if (filters.area) {
    const [a, b] = filters.area.split("-");
    minRai = toNum(a);
    maxRai = toNum(b);
  }
  return {
    province: filters.province,
    landType: filters.landType,
    minPrice: minP ? Number(minP) : 0,
    maxPrice: maxP ? Number(maxP) : 0,
    minAreaWah: minRai * RAI_TO_WAH,
    maxAreaWah: maxRai * RAI_TO_WAH,
    sort: filters.sort,
  };
}

/** แถบตัวกรอง: จังหวัด ประเภท ราคา ขนาด (เลือกช่วง หรือพิมพ์เอง) และการเรียง (เปลี่ยนแล้วค้นหาทันที) */
export default function ListingFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const bind = (field) => ({
    value: filters[field],
    onChange: (e) => set({ [field]: e.target.value }),
  });
  const isCustomArea = filters.area === AREA_CUSTOM;
  const isFiltered = ["province", "landType", "priceRange", "area"].some((k) => filters[k]);
  const maxLessThanMin = isCustomArea && filters.minRai !== "" && filters.maxRai !== "" && Number(filters.maxRai) < Number(filters.minRai);

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
        <select id="lf_area" {...bind("area")}>
          {AREA_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf_sort">เรียงตาม</label>
        <select id="lf_sort" {...bind("sort")}>
          {SORT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {isFiltered && (
        <button type="button" className="lfilters-reset" onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
          ล้างตัวกรอง
        </button>
      )}

      {/* ขนาดกำหนดเอง: พิมพ์ขั้นต่ำ/สูงสุดเป็นไร่ (เว้นว่าง = ไม่จำกัด) */}
      {isCustomArea && (
        <div className="lfilters-custom">
          <span className="lfilters-custom-label">ขนาดที่ต้องการ</span>
          <div className="lfilters-range">
            <input type="number" min="0" step="any" inputMode="decimal" placeholder="ขั้นต่ำ" aria-label="ขนาดขั้นต่ำ (ไร่)" {...bind("minRai")} />
            <span aria-hidden="true">–</span>
            <input type="number" min="0" step="any" inputMode="decimal" placeholder="สูงสุด" aria-label="ขนาดสูงสุด (ไร่)" {...bind("maxRai")} />
            <span className="lfilters-unit">ไร่</span>
          </div>
          {maxLessThanMin && <span className="lfilters-warn">ขนาดสูงสุดน้อยกว่าขั้นต่ำ</span>}
        </div>
      )}
    </div>
  );
}
