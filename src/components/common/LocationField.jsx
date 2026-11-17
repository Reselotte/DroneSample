import { lazy, Suspense, useState } from "react";
import { PinIcon } from "./Icons";
import { parseLatLng } from "../../utils/listingFormat";

// โหลดแผนที่ (Leaflet) เฉพาะตอนกดเปิด จะได้ไม่ทำให้หน้าเว็บโหลดช้า
const LocationPicker = lazy(() => import("./LocationPicker"));

/**
 * ช่องกรอกตำแหน่งที่ดิน: พิมพ์พิกัด / วางลิงก์ Google Maps ได้เหมือนเดิม
 * + ปุ่ม "เลือกบนแผนที่" (เปิดแผนที่ในเว็บ) + "ตำแหน่งปัจจุบัน" + ลิงก์ "ดูใน Google Maps" เมื่อมีพิกัดแล้ว
 *  value / onChange(text)  = ข้อความในช่อง (เก็บเป็น "lat, lng")
 *  error = ข้อความผิดพลาดจากฟอร์ม   onError(text) = แจ้งข้อผิดพลาดของ GPS กลับไปที่ฟอร์ม
 */
export default function LocationField({ id, label, value, onChange, error, onError, placeholder, className = "" }) {
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const coords = parseLatLng(value);

  const setCoords = ({ lat, lng }) => onChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

  const locateMe = () => {
    if (!navigator.geolocation) { onError?.("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => { setLocating(false); setCoords({ lat: c.latitude, lng: c.longitude }); onError?.(""); },
      () => { setLocating(false); onError?.("หาตำแหน่งไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือเลือกบนแผนที่แทน"); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className={`field locf ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "กด \"เลือกบนแผนที่\" หรือวางลิงก์ Google Maps / พิกัด"}
      />
      <div className="locf-actions">
        <button type="button" className="locf-btn is-primary" onClick={() => setPicking(true)}>
          <PinIcon /> เลือกบนแผนที่
        </button>
        <button type="button" className="locf-btn" onClick={locateMe} disabled={locating}>
          {locating ? "กำลังหา…" : "ใช้ตำแหน่งปัจจุบัน"}
        </button>
        {coords && (
          <a
            className="locf-btn is-link"
            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ดูใน Google Maps ↗
          </a>
        )}
      </div>
      <div className="err">{error}</div>

      {picking && (
        <Suspense fallback={<div className="lp lp-loading">กำลังเปิดแผนที่…</div>}>
          <LocationPicker
            initial={coords}
            onClose={() => setPicking(false)}
            onPick={(c) => { setCoords(c); onError?.(""); setPicking(false); }}
          />
        </Suspense>
      )}
    </div>
  );
}
