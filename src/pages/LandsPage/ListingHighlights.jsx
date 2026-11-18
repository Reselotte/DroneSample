import { highlightList } from "../../data/landChecklist";

/** จุดเด่นของที่ดิน (จากเช็กลิสต์ฝ่ายขาย) — compact = ชิปสั้นบนการ์ด */
export default function ListingHighlights({ highlights, compact = false, max = 3 }) {
  const list = highlightList(highlights);
  if (!list.length) return null;

  if (compact) {
    const shown = list.slice(0, max);
    return (
      <ul className="hl-chips" aria-label="จุดเด่น">
        {shown.map((h) => <li key={h.key}>{h.label}</li>)}
        {list.length > max && <li className="hl-more">+{list.length - max}</li>}
      </ul>
    );
  }

  return (
    <ul className="hl-list">
      {list.map((h) => (
        <li key={h.key}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
          <span>
            <b>{h.label}</b>
            {h.note && <small>{h.note}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}
