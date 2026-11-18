import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  checkIsAdmin, deleteListing, fetchAdminListings, fetchPhoneCounts, fetchStatusCounts, photoUrl,
  searchAdminListings, setListingStatus, signIn, signOut,
} from "../../lib/listingsApi";
import { useToast } from "../../hooks/useToast";
import { LISTING_STATUSES, landTypeLabel } from "../../data/landListingOptions";
import { formatArea, formatBaht, formatThaiDate, listingCode } from "../../utils/listingFormat";
import SetupNotice from "../LandsPage/SetupNotice";
import { PhoneIcon, PinIcon } from "../../components/common/Icons";
import AdminListingEditor from "./AdminListingEditor";
import AdminColorGuide from "./AdminColorGuide";
import AdminSalesChecklist from "./AdminSalesChecklist";
import ListingHighlights from "../LandsPage/ListingHighlights";
import { highlightList } from "../../data/landChecklist";

/** แถบเครื่องมือแอดมิน: แต่ละเมนูมีที่อยู่ของตัวเอง (#/admin, #/admin/colors) */
const ADMIN_SECTIONS = [
  { key: "listings", href: "#/admin", label: "จัดการประกาศ", title: "จัดการประกาศขายที่ดิน" },
  { key: "checklist", href: "#/admin/checklist", label: "เช็กลิสต์ฝ่ายขาย", title: "เช็กลิสต์ถามเจ้าของที่ดิน" },
  { key: "colors", href: "#/admin/colors", label: "คู่มือสีเว็บ", title: "คู่มือสีเว็บ" },
];

const STATUS_VALUES = LISTING_STATUSES.map((s) => s.value);
const statusLabel = (value) => LISTING_STATUSES.find((s) => s.value === value)?.label || value;

/** ปุ่มเปลี่ยนสถานะที่แสดงตามสถานะปัจจุบัน */
const ACTIONS = {
  pending: [["approved", "อนุมัติ เผยแพร่"], ["rejected", "ไม่อนุมัติ"]],
  approved: [["sold", "ขายแล้ว"], ["rejected", "ซ่อนประกาศ"]],
  sold: [["approved", "เปิดขายอีกครั้ง"]],
  rejected: [["approved", "อนุมัติ เผยแพร่"]],
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    setBusy(false);
  };

  return (
    <form className="card adm-login" onSubmit={submit}>
      <h3>เข้าสู่ระบบแอดมิน</h3>
      <div className="field">
        <label htmlFor="a_email">อีเมล</label>
        <input id="a_email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="a_pw">รหัสผ่าน</label>
        <input id="a_pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn btn-line" type="submit" disabled={busy} style={{ width: "100%", background: "var(--g)" }}>
        {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <div className="err">{error}</div>
    </form>
  );
}

function AdminListing({ listing, busy, showStatus, phoneCount, onChangeStatus, onSaved, onDelete, onSearchPhone }) {
  const [editing, setEditing] = useState(false);
  const seller = listing.listing_private || {};
  const published = listing.status === "approved" || listing.status === "sold";

  if (editing) {
    return (
      <AdminListingEditor
        listing={listing}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => { setEditing(false); onSaved(updated); }}
      />
    );
  }

  return (
    <article className="card adm-item">
      <div className="adm-photos">
        {(listing.photos || []).map((path) => (
          <a key={path} href={photoUrl(path)} target="_blank" rel="noopener noreferrer">
            <img src={photoUrl(path)} alt="" loading="lazy" />
          </a>
        ))}
      </div>

      <div className="adm-body">
        <div className="adm-top">
          <span className="adm-code">{listingCode(listing.id)}</span>
          {showStatus && <span className={`adm-status is-${listing.status}`}>{statusLabel(listing.status)}</span>}
          <span>{formatThaiDate(listing.created_at)}</span>
          {published && <a href={`#/lands/${listing.id}`}>ดูหน้าประกาศ ↗</a>}
        </div>
        <h3>{listing.title}</h3>
        <p className="adm-line">
          {landTypeLabel(listing.land_type)} · {formatArea(listing.rai, listing.ngan, listing.wah)} ·{" "}
          {listing.district ? `${listing.district}, ` : ""}{listing.province}
        </p>
        <p className="adm-price">{formatBaht(listing.total_price)}</p>
        {listing.description && <p className="adm-desc">{listing.description}</p>}
        <ListingHighlights highlights={listing.highlights} compact max={6} />
        {listing.lat != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <PinIcon /> ดูตำแหน่งใน Google Maps
          </a>
        )}

        <div className="adm-seller">
          <b>ผู้ขาย (ไม่แสดงบนเว็บ)</b>
          <span>{seller.seller_name || "—"}</span>
          {seller.phone && (
            <span className="adm-phone">
              <a href={`tel:${seller.phone}`}><PhoneIcon /> {seller.phone}</a>
              {/* เบอร์เดียวกันลงหลายประกาศ = อาจเป็นสแปมหรือประกาศซ้ำ กดเพื่อดูทั้งหมด */}
              {phoneCount > 1 && (
                <button type="button" className="adm-dup" onClick={() => onSearchPhone(seller.phone)}>
                  เบอร์นี้มี {phoneCount} ประกาศ · ดูทั้งหมด
                </button>
              )}
            </span>
          )}
          {seller.line_id && <span>LINE: {seller.line_id}</span>}
          {seller.deed_no && <span>เลขโฉนด: {seller.deed_no}</span>}
          {highlightList(seller.checklist).map((h) => (
            <span key={h.key}>{h.label}{h.note ? `: ${h.note}` : ""}</span>
          ))}
          {listing.deedLinks.length > 0 && (
            <span className="adm-deeds">
              สำเนาโฉนด:{" "}
              {listing.deedLinks.map((d, i) =>
                d.url ? (
                  <a key={d.path} href={d.url} target="_blank" rel="noopener noreferrer">ไฟล์ {i + 1}</a>
                ) : (
                  <span key={d.path}>ไฟล์ {i + 1} (เปิดไม่ได้)</span>
                )
              )}
            </span>
          )}
        </div>

        <div className="adm-actions">
          {ACTIONS[listing.status].map(([next, label]) => (
            <button
              key={next}
              type="button"
              className={`btn ${next === "approved" ? "btn-line" : "btn-ghost"}`}
              disabled={busy}
              onClick={() => onChangeStatus(listing, next)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setEditing(true)}>แก้ไข</button>
          <button type="button" className="btn adm-del" disabled={busy} onClick={() => onDelete(listing)}>ลบถาวร</button>
        </div>
      </div>
    </article>
  );
}

/** หน้าแอดมิน (#/admin) — ไม่มีในเมนู เข้าผ่านลิงก์โดยตรง · param = เมนูในแถบเครื่องมือ */
export default function AdminPage({ param }) {
  const section = ADMIN_SECTIONS.find((s) => s.key === param) || ADMIN_SECTIONS[0];
  const onListings = section.key === "listings";
  const [session, setSession] = useState(undefined); // undefined = กำลังเช็ก
  const [isAdmin, setIsAdmin] = useState(null);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ready | error
  const [busyId, setBusyId] = useState(null);
  const [counts, setCounts] = useState({}); // จำนวนประกาศแต่ละสถานะ (ตัวเลขบนแท็บ)
  const [phoneCounts, setPhoneCounts] = useState({}); // เบอร์ → จำนวนประกาศ (เตือนเบอร์ซ้ำ)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(null); // คำค้นที่ใช้อยู่ (null = ดูตามแท็บ)
  const toast = useToast();

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [session]);

  const refreshCounts = useCallback(() => {
    fetchStatusCounts(STATUS_VALUES).then(setCounts).catch((err) => console.error(err));
  }, []);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      setItems(search ? await searchAdminListings(search) : await fetchAdminListings(tab));
      setLoadState("ready");
    } catch (err) {
      console.error(err);
      setLoadState("error");
    }
  }, [search, tab]);

  useEffect(() => {
    if (isAdmin && onListings) load();
  }, [isAdmin, onListings, load]);

  useEffect(() => {
    if (isAdmin && onListings) refreshCounts();
  }, [isAdmin, onListings, refreshCounts]);

  // เช็กเบอร์ซ้ำของประกาศที่แสดงอยู่
  useEffect(() => {
    const phones = items.map((l) => l.listing_private?.phone);
    if (!phones.length) return;
    fetchPhoneCounts(phones).then(setPhoneCounts).catch((err) => console.error(err));
  }, [items]);

  const pickTab = (value) => { setSearch(null); setSearchInput(""); setTab(value); };
  const runSearch = (text) => { setSearchInput(text); setSearch(text.trim() || null); };

  const changeStatus = async (listing, next) => {
    setBusyId(listing.id);
    try {
      await setListingStatus(listing.id, next);
      // ดูตามแท็บ: ย้ายออกจากแท็บนี้ / ผลค้นหา: อัปเดตป้ายสถานะในที่
      setItems((list) => (search
        ? list.map((l) => (l.id === listing.id ? { ...l, status: next } : l))
        : list.filter((l) => l.id !== listing.id)));
      toast(`${listingCode(listing.id)}: ${statusLabel(next)}`);
      refreshCounts();
    } catch (err) {
      console.error(err);
      toast("เปลี่ยนสถานะไม่สำเร็จ");
    }
    setBusyId(null);
  };

  const saved = (updated) => {
    setItems((list) => list.map((l) => (l.id === updated.id ? updated : l)));
    toast(`${listingCode(updated.id)}: บันทึกการแก้ไขแล้ว`);
  };

  const remove = async (listing) => {
    const ok = window.confirm(
      `ลบประกาศ ${listingCode(listing.id)} "${listing.title}" ถาวร?\n\nข้อมูลผู้ขาย รูป และสำเนาโฉนดจะถูกลบทั้งหมด กู้คืนไม่ได้`
    );
    if (!ok) return;
    setBusyId(listing.id);
    try {
      await deleteListing(listing);
      setItems((list) => list.filter((l) => l.id !== listing.id));
      toast(`${listingCode(listing.id)}: ลบแล้ว`);
      refreshCounts();
    } catch (err) {
      console.error(err);
      toast("ลบไม่สำเร็จ");
    }
    setBusyId(null);
  };

  let body;
  if (!isSupabaseConfigured) body = <SetupNotice />;
  else if (session === undefined || (session && isAdmin === null)) body = <div className="lands-msg">กำลังตรวจสอบสิทธิ์…</div>;
  else if (!session) body = <LoginForm />;
  else if (!isAdmin) {
    body = (
      <div className="lands-msg">
        <b>บัญชีนี้ไม่มีสิทธิ์แอดมิน</b>
        <span>{session.user.email}</span>
        <button type="button" className="btn btn-ghost" onClick={signOut}>ออกจากระบบ</button>
      </div>
    );
  } else if (section.key === "checklist") {
    body = <AdminSalesChecklist />;
  } else if (!onListings) {
    body = <AdminColorGuide />;
  } else {
    body = (
      <>
        <div className="adm-bar">
          <div className="tabs adm-tabs">
            {LISTING_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={!search && s.value === tab ? "on" : undefined}
                onClick={() => pickTab(s.value)}
              >
                {s.label}
                <span className={`adm-count${s.value === "pending" && counts.pending ? " is-alert" : ""}`}>
                  {counts[s.value] ?? "…"}
                </span>
              </button>
            ))}
          </div>
          <div className="adm-user">
            <span>{session.user.email}</span>
            <button type="button" className="btn btn-ghost" onClick={signOut}>ออกจากระบบ</button>
          </div>
        </div>

        <form className="adm-search" onSubmit={(e) => { e.preventDefault(); runSearch(searchInput); }}>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา: รหัสประกาศ (L00012) เบอร์โทร ชื่อผู้ขาย หรือหัวข้อ"
            aria-label="ค้นหาประกาศ"
          />
          <button type="submit" className="btn btn-ghost">ค้นหา</button>
        </form>

        {search && loadState !== "loading" && (
          <div className="adm-search-info">
            <span>
              ผลค้นหา "<b>{search}</b>" ทุกสถานะ{loadState === "ready" ? ` · ${items.length} รายการ` : ""}
            </span>
            <button type="button" className="adm-link" onClick={() => pickTab(tab)}>ล้างการค้นหา</button>
          </div>
        )}

        {loadState === "loading" && <div className="lands-msg">กำลังโหลด…</div>}
        {loadState === "error" && (
          <div className="lands-msg">
            <b>โหลดไม่สำเร็จ</b>
            <button type="button" className="btn btn-ghost" onClick={load}>ลองอีกครั้ง</button>
          </div>
        )}
        {loadState === "ready" && (items.length === 0 ? (
          <div className="lands-msg"><span>{search ? "ไม่พบประกาศที่ตรงกับคำค้น" : "ไม่มีประกาศในสถานะนี้"}</span></div>
        ) : (
          <div className="adm-list">
            {items.map((listing) => (
              <AdminListing
                key={listing.id}
                listing={listing}
                busy={busyId === listing.id}
                showStatus={Boolean(search)}
                phoneCount={phoneCounts[listing.listing_private?.phone] || 0}
                onChangeStatus={changeStatus}
                onSaved={saved}
                onDelete={remove}
                onSearchPhone={runSearch}
              />
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <section className="alt adm" data-page="admin">
      <div className="wrap">
        {isAdmin && (
          <nav className="adm-toolbar" aria-label="เมนูแอดมิน">
            {ADMIN_SECTIONS.map((s) => (
              <a key={s.key} href={s.href} className={s.key === section.key ? "on" : undefined} aria-current={s.key === section.key ? "page" : undefined}>
                {s.label}
              </a>
            ))}
          </nav>
        )}
        <h2>{isAdmin ? section.title : "จัดการประกาศขายที่ดิน"}</h2>
        {body}
      </div>
    </section>
  );
}
