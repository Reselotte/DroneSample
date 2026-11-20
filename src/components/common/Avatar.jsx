/**
 * รูปโปรไฟล์วงกลม (ไม่มีรูป = ตัวอักษรแรกของชื่อ)
 * size = ขนาด (px) · gem = ติดเพชรมุมขวาล่าง (ดีลเลอร์)
 */
export default function Avatar({ src, name = "", size = 64, gem = false, className = "" }) {
  return (
    <span className={`av${className ? ` ${className}` : ""}`} style={{ "--av": `${size}px` }}>
      <span className="av-clip">
        {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <span className="av-initial">{(name || "?").slice(0, 1).toUpperCase()}</span>}
      </span>
      {gem && (
        <i className="av-gem" title="ดีลเลอร์" aria-label="ดีลเลอร์">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path className="av-gem-body" d="M7 4.5h10l4.5 5L12 20.5 2.5 9.5z" />
            <path className="av-gem-cut" d="M2.5 9.5h19M9.5 4.5 7.8 9.5 12 20.5l4.2-11-1.7-5" />
          </svg>
        </i>
      )}
    </span>
  );
}
