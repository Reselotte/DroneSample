import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { photoUrl } from "../../lib/listingsApi";
import { LISTING_STATUSES, landTypeLabel } from "../../data/landListingOptions";
import { highlightList } from "../../data/landChecklist";
import { formatArea, formatBaht, formatThaiDate, listingCode } from "../../utils/listingFormat";
import { PhoneIcon, PinIcon } from "../../components/common/Icons";
import ListingHighlights from "../LandsPage/ListingHighlights";
import AdminListingEditor from "./AdminListingEditor";

const PAGE_SIZE = 10;
export const statusLabel = (value) => LISTING_STATUSES.find((s) => s.value === value)?.label || value;

/** คำสั่งเปลี่ยนสถานะตามสถานะปัจจุบัน */
const ACTIONS = {
  pending: [["approved", "อนุมัติ เผยแพร่"], ["rejected", "ไม่อนุมัติ"]],
  approved: [["sold", "ทำเครื่องหมายขายแล้ว"], ["rejected", "ซ่อนประกาศ"]],
  sold: [["approved", "เปิดขายอีกครั้ง"]],
  rejected: [["approved", "อนุมัติ เผยแพร่"]],
};

/** คำอธิบายใต้ตัวเลขในการ์ดสรุป */
const STAT_NOTES = {
  pending: (n) => (n ? "รอแอดมินตรวจสอบ" : "ไม่มีงานค้าง"),
  approved: () => "แสดงบนเว็บอยู่",
  sold: () => "ปิดการขายแล้ว",
  rejected: () => "ไม่แสดงบนเว็บ",
};

/** คอลัมน์ที่กดเรียงได้: ค่าที่ใช้เรียง */
const SORTS = {
  title: (l) => l.title,
  code: (l) => l.id,
  price: (l) => Number(l.total_price),
  area: (l) => Number(l.area_wah),
  seller: (l) => l.listing_private?.seller_name || "",
  date: (l) => l.created_at,
};

export function StatusBadge({ status }) {
  return <span className={`adm-status is-${status}`}><i />{statusLabel(status)}</span>;
}

/** การ์ดสรุปจำนวนแต่ละสถานะ (กดเพื่อกรอง) */
export function StatCards({ counts, active, onPick }) {
  return (
    <div className="adm-stats">
      {LISTING_STATUSES.map((s) => {
        const n = counts[s.value];
        return (
          <button
            key={s.value}
            type="button"
            className={`adm-stat is-${s.value}${active === s.value ? " on" : ""}${s.value === "pending" && n ? " is-alert" : ""}`}
            onClick={() => onPick(s.value)}
            aria-pressed={active === s.value}
          >
            <span className="adm-stat-label"><i />{s.label}</span>
            <b>{n ?? "…"}</b>
            <small>{n == null ? "" : STAT_NOTES[s.value](n)}</small>
          </button>
        );
      })}
    </div>
  );
}

/** เมนู ⋮ ท้ายแถว (ลอยแบบ fixed เพื่อไม่ถูกตารางที่เลื่อนข้างได้ตัดขอบ) */
function RowMenu({ label, items }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    const close = (e) => { if (!e.target.closest?.(".adm-menu") && !btn.current?.contains(e.target)) setPos(null); };
    const esc = (e) => { if (e.key === "Escape") setPos(null); };
    const hide = () => setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = btn.current.getBoundingClientRect();
    const above = r.bottom + 260 > window.innerHeight;
    setPos({ right: window.innerWidth - r.right, ...(above ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };

  return (
    <>
      <button ref={btn} type="button" className="adm-dots" aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(pos)} onClick={toggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
      </button>
      {pos && (
        <div className="adm-menu" role="menu" style={pos}>
          {items.filter(Boolean).map((it) => (
            it.href ? (
              <a key={it.label} role="menuitem" href={it.href} onClick={() => setPos(null)}>{it.label}</a>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={it.tone ? `is-${it.tone}` : undefined}
                disabled={it.disabled}
                onClick={() => { setPos(null); it.onClick(); }}
              >
                {it.label}
              </button>
            )
          ))}
        </div>
      )}
    </>
  );
}

/** แถวรายละเอียดเพิ่ม (กดที่แถวเพื่อเปิด) */
function ListingDetails({ listing }) {
  const seller = listing.listing_private || {};
  const privateNotes = highlightList(seller.checklist);
  const published = listing.status === "approved" || listing.status === "sold";
  return (
    <div className="adm-details">
      <div className="adm-details-photos">
        {(listing.photos || []).map((path) => (
          <a key={path} href={photoUrl(path)} target="_blank" rel="noopener noreferrer">
            <img src={photoUrl(path)} alt="" loading="lazy" />
          </a>
        ))}
        {!listing.photos?.length && <span className="adm-muted">ไม่มีรูป</span>}
      </div>
      <div className="adm-details-main">
        <b>{listing.title}</b>
        <span className="adm-muted">
          {landTypeLabel(listing.land_type)} · {formatArea(listing.rai, listing.ngan, listing.wah)} ·{" "}
          {listing.district ? `${listing.district}, ` : ""}{listing.province}
        </span>
        {listing.description && <p className="adm-desc">{listing.description}</p>}
        <ListingHighlights highlights={listing.highlights} compact max={12} />
        <div className="adm-links">
          {listing.lat != null && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`} target="_blank" rel="noopener noreferrer">
              <PinIcon /> Google Maps
            </a>
          )}
          {published && <a href={`#/lands/${listing.id}`}>ดูหน้าประกาศ ↗</a>}
        </div>
      </div>
      <div className="adm-seller">
        <b>ผู้ขาย (ไม่แสดงบนเว็บ)</b>
        <span>{seller.seller_name || "—"}</span>
        {seller.phone && <a href={`tel:${seller.phone}`}><PhoneIcon /> {seller.phone}</a>}
        {seller.line_id && <span>LINE: {seller.line_id}</span>}
        {seller.deed_no && <span>เลขโฉนด: {seller.deed_no}</span>}
        {privateNotes.map((h) => <span key={h.key}>{h.label}{h.note ? `: ${h.note}` : ""}</span>)}
        {listing.deedLinks?.length > 0 && (
          <span className="adm-deeds">
            สำเนาโฉนด:{" "}
            {listing.deedLinks.map((d, i) => (d.url
              ? <a key={d.path} href={d.url} target="_blank" rel="noopener noreferrer">ไฟล์ {i + 1}</a>
              : <span key={d.path}>ไฟล์ {i + 1} (เปิดไม่ได้)</span>))}
          </span>
        )}
      </div>
    </div>
  );
}

/** เลขหน้า: 1 … 4 5 6 … 12 */
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return list.flatMap((p, i) => (i && p - list[i - 1] > 1 ? ["…", p] : [p]));
}

function Pagination({ page, total, count, onPage }) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const from = count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, count);
  return (
    <div className="adm-pager">
      <span>แสดง <b>{from}–{to}</b> จาก {total} รายการ</span>
      {pages > 1 && (
        <div className="adm-pager-btns">
          <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>‹ ก่อนหน้า</button>
          {pageList(page, pages).map((p, i) => (p === "…"
            ? <span key={`gap${i}`} className="adm-pager-gap">…</span>
            : <button key={p} type="button" className={p === page ? "on" : undefined} aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}>{p}</button>))}
          <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>ถัดไป ›</button>
        </div>
      )}
    </div>
  );
}

/** ตารางประกาศ: เรียงคอลัมน์ได้ · กดแถวเพื่อดูรายละเอียด · ⋮ = คำสั่ง · แบ่งหน้าละ 10 */
export default function AdminListingsTable({ items, busyId, phoneCounts, onChangeStatus, onSaved, onDelete, onSearchPhone }) {
  const [sort, setSort] = useState({ key: "date", dir: -1 });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // รายการเปลี่ยน (เปลี่ยนสถานะ/ค้นหา) → กลับหน้าแรกถ้าหน้าปัจจุบันหายไป
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);

  const sorted = useMemo(() => {
    const get = SORTS[sort.key];
    return [...items].sort((a, b) => {
      const x = get(a); const y = get(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [items, sort]);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const head = (key, label, className) => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : undefined}>
      <button type="button" className="adm-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : key === "date" ? -1 : 1 }))}>
        {label}
        <svg viewBox="0 0 12 16" aria-hidden="true" className={sort.key === key ? (sort.dir > 0 ? "is-asc" : "is-desc") : undefined}>
          <path className="up" d="M6 2l4 5H2z" /><path className="down" d="M6 14l4-5H2z" />
        </svg>
      </button>
    </th>
  );

  return (
    <div className="adm-table-card">
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              {head("title", "ประกาศ", "c-title")}
              {head("code", "รหัส")}
              {head("price", "ราคา")}
              {head("area", "ขนาด")}
              {head("seller", "ผู้ขาย")}
              {head("date", "วันที่ลง")}
              <th>สถานะ</th>
              <th className="c-menu"><span className="sr-only">คำสั่ง</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const seller = l.listing_private || {};
              const dup = phoneCounts[seller.phone] || 0;
              const open = openId === l.id || editingId === l.id;
              const busy = busyId === l.id;
              return (
                <Fragment key={l.id}>
                  <tr
                    className={`adm-row${open ? " is-open" : ""}${busy ? " is-busy" : ""}`}
                    onClick={(e) => { if (!e.target.closest("button,a")) setOpenId((id) => (id === l.id ? null : l.id)); }}
                  >
                    <td className="c-title">
                      <div className="adm-prod">
                        {l.photos?.[0] ? <img src={photoUrl(l.photos[0])} alt="" loading="lazy" /> : <span className="adm-noimg" />}
                        <div>
                          <b title={l.title}>{l.title}</b>
                          <small>{landTypeLabel(l.land_type)} · {l.province}</small>
                        </div>
                      </div>
                    </td>
                    <td className="adm-mono">{listingCode(l.id)}</td>
                    <td className="adm-num">{formatBaht(l.total_price)}</td>
                    <td>{formatArea(l.rai, l.ngan, l.wah)}</td>
                    <td>
                      <div className="adm-sellercell">
                        <span>{seller.seller_name || "—"}</span>
                        <small>
                          {seller.phone || ""}
                          {dup > 1 && (
                            <button type="button" className="adm-dup" title="ดูทุกประกาศของเบอร์นี้" onClick={() => onSearchPhone(seller.phone)}>
                              ซ้ำ {dup}
                            </button>
                          )}
                        </small>
                      </div>
                    </td>
                    <td className="adm-muted">{formatThaiDate(l.created_at)}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td className="c-menu">
                      <RowMenu
                        label={`คำสั่งสำหรับ ${listingCode(l.id)}`}
                        items={[
                          ...ACTIONS[l.status].map(([next, label]) => ({
                            label, disabled: busy, tone: next === "approved" ? "ok" : undefined, onClick: () => onChangeStatus(l, next),
                          })),
                          { label: "แก้ไขประกาศ", onClick: () => { setEditingId(l.id); setOpenId(null); } },
                          { label: open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด", onClick: () => setOpenId((id) => (id === l.id ? null : l.id)) },
                          (l.status === "approved" || l.status === "sold") && { label: "ดูหน้าประกาศ ↗", href: `#/lands/${l.id}` },
                          { label: "ลบถาวร", tone: "danger", disabled: busy, onClick: () => onDelete(l) },
                        ]}
                      />
                    </td>
                  </tr>
                  {open && (
                    <tr className="adm-row-more">
                      <td colSpan={8}>
                        {editingId === l.id ? (
                          <AdminListingEditor
                            listing={l}
                            onCancel={() => setEditingId(null)}
                            onSaved={(updated) => { setEditingId(null); onSaved(updated); }}
                          />
                        ) : (
                          <ListingDetails listing={l} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={items.length} count={items.length} onPage={(p) => { setPage(p); setOpenId(null); }} />
    </div>
  );
}
