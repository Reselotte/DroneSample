import { useMemo } from "react";
import { MAP_VIEWBOX, buildMapSvgContent } from "../../utils/contourMapGenerator";

/**
 * รูปแผนที่ภูมิประเทศจำลอง (SVG)
 * props: mode, parcel, arrows, pond, pad, lines  (ดูรายละเอียดที่ utils/contourMapGenerator.js)
 *        cover = true ให้รูปเต็มกรอบ (ตัดขอบ) ใช้กับการ์ดและจอโทรศัพท์
 */
export default function ContourMapSvg({ cover = false, ...mapOptions }) {
  const content = useMemo(
    () => buildMapSvgContent(mapOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapOptions.mode, mapOptions.parcel, mapOptions.arrows, mapOptions.pond, mapOptions.pad, mapOptions.lines]
  );

  return (
    <svg
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio={cover ? "xMidYMid slice" : undefined}
      role="img"
      aria-label="ตัวอย่างแผนที่ภูมิประเทศจำลอง"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
