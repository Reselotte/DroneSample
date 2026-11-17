import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PinIcon } from "./Icons";

/** จุดกึ่งกลางประเทศไทย (ใช้ตอนยังไม่มีพิกัด) */
const TH_CENTER = [13.2, 101.0];
const TH_ZOOM = 6;
const PICK_ZOOM = 17;

/** ชั้นแผนที่: ภาพดาวเทียม (Esri) + ชื่อสถานที่ทับ / แผนที่ถนน (OpenStreetMap) */
const LAYERS = {
  satellite: () => L.layerGroup([
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "ภาพดาวเทียม © Esri",
    }),
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }),
  ]),
  street: () => L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap",
  }),
};

/** ค้นหาสถานที่ในไทย (OpenStreetMap Nominatim — ใช้ตอนกดค้นหาเท่านั้น ไม่ยิงทุกตัวอักษร) */
async function searchPlaces(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=th&accept-language=th&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("search failed");
  return (await res.json()).map((r) => ({ name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}

/**
 * หน้าต่างเลือกตำแหน่งบนแผนที่ (หมุดอยู่กลางจอ → เลื่อนแผนที่ให้หมุดตรงที่ดิน แล้วกด "ใช้ตำแหน่งนี้")
 *  initial  = { lat, lng } หรือ null    onPick({ lat, lng })    onClose()
 * โหลดแบบ lazy จาก LocationField (Leaflet ไม่ถูกโหลดจนกว่าจะเปิดหน้าต่างนี้)
 */
export default function LocationPicker({ initial, onPick, onClose }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [center, setCenter] = useState(initial || { lat: TH_CENTER[0], lng: TH_CENTER[1] });
  const [layer, setLayer] = useState("satellite");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = ยังไม่ค้น, [] = ไม่พบ
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    const map = L.map(mapEl.current, {
      center: initial ? [initial.lat, initial.lng] : TH_CENTER,
      zoom: initial ? PICK_ZOOM : TH_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.attributionControl.setPrefix(false);
    const update = () => { const c = map.getCenter(); setCenter({ lat: c.lat, lng: c.lng }); };
    map.on("move", update);
    mapRef.current = map;
    // หน้าต่างเพิ่งแสดง ขนาดอาจยังไม่นิ่ง → ให้ Leaflet วัดใหม่
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // สลับชั้นแผนที่
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    layerRef.current = LAYERS[layer]().addTo(map);
  }, [layer]);

  // Esc ปิด + ล็อกการเลื่อนหน้าข้างหลัง
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const flyTo = (lat, lng, zoom = PICK_ZOOM) => mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.8 });

  const onSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy("search"); setError("");
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (found.length === 1) { flyTo(found[0].lat, found[0].lng, 15); setResults(null); }
    } catch {
      setError("ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง หรือเลื่อนแผนที่หาเอง");
    }
    setBusy("");
  };

  const locateMe = () => {
    if (!navigator.geolocation) { setError("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง"); return; }
    setBusy("gps"); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setBusy(""); flyTo(coords.latitude, coords.longitude); },
      () => { setBusy(""); setError("หาตำแหน่งไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่ง"); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const zoomedIn = (mapRef.current?.getZoom() ?? 0) >= 14;

  return createPortal(
    <div className="lp" role="dialog" aria-modal="true" aria-labelledby="lpTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lp-box">
        <div className="lp-head">
          <h3 id="lpTitle"><PinIcon /> เลือกตำแหน่งที่ดิน</h3>
          <button type="button" className="lp-close" aria-label="ปิด" onClick={onClose}>×</button>
        </div>

        <form className="lp-search" onSubmit={onSearch}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา เช่น ตำบล อำเภอ จังหวัด หรือชื่อสถานที่ใกล้เคียง"
            aria-label="ค้นหาสถานที่"
          />
          <button type="submit" className="btn btn-ghost" disabled={busy === "search"}>{busy === "search" ? "กำลังค้น…" : "ค้นหา"}</button>
        </form>
        {results && (
          <ul className="lp-results">
            {results.length === 0 && <li className="lp-empty">ไม่พบสถานที่ ลองพิมพ์ชื่ออำเภอหรือจังหวัด</li>}
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" onClick={() => { flyTo(r.lat, r.lng, 15); setResults(null); }}>{r.name}</button>
              </li>
            ))}
          </ul>
        )}

        <div className="lp-map-wrap">
          <div ref={mapEl} className="lp-map" />
          {/* หมุดค้างกลางแผนที่: เลื่อนแผนที่ให้ปลายหมุดตรงที่ดิน */}
          <div className="lp-pin" aria-hidden="true"><PinIcon /></div>
          <div className="lp-hint">{zoomedIn ? "เลื่อนแผนที่ให้ปลายหมุดตรงที่ดิน" : "ซูมเข้าไปใกล้ ๆ แล้วเลื่อนให้หมุดตรงที่ดิน"}</div>
          <div className="lp-tools">
            <div className="lp-layers" role="group" aria-label="รูปแบบแผนที่">
              <button type="button" className={layer === "satellite" ? "on" : undefined} onClick={() => setLayer("satellite")}>ดาวเทียม</button>
              <button type="button" className={layer === "street" ? "on" : undefined} onClick={() => setLayer("street")}>แผนที่</button>
            </div>
            <button type="button" className="lp-gps" onClick={locateMe} disabled={busy === "gps"}>
              <PinIcon /> {busy === "gps" ? "กำลังหา…" : "ตำแหน่งของฉัน"}
            </button>
          </div>
        </div>

        {error && <p className="lp-error">{error}</p>}

        <div className="lp-foot">
          <div className="lp-coords">
            <small>พิกัดที่เลือก</small>
            <b>{center.lat.toFixed(6)}, {center.lng.toFixed(6)}</b>
          </div>
          <div className="lp-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="button" className="btn btn-line lp-ok" onClick={() => onPick(center)}>ใช้ตำแหน่งนี้</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
