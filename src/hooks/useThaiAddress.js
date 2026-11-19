import { useEffect, useState } from "react";

let cache = null;

/**
 * รายชื่ออำเภอ/ตำบลจริงทั้งประเทศ (ข้อมูลจาก kongvut/thai-province-data, MIT)
 * โหลดแยกเฉพาะตอนใช้ (ไม่ถ่วงหน้าอื่น) คืน { จังหวัด: { อำเภอ: [ตำบล…] } } หรือ null ระหว่างโหลด
 */
export default function useThaiAddress() {
  const [data, setData] = useState(cache);
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    import("../data/thaiAddress.json").then((m) => {
      cache = m.default;
      if (alive) setData(cache);
    });
    return () => { alive = false; };
  }, []);
  return data;
}
