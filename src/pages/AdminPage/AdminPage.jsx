import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  checkIsAdmin, fetchAdminListings, photoUrl, setListingStatus, signIn, signOut,
} from "../../lib/listingsApi";
import { useToast } from "../../hooks/useToast";
import { LISTING_STATUSES, landTypeLabel } from "../../data/landListingOptions";
import { formatArea, formatBaht, formatThaiDate, listingCode } from "../../utils/listingFormat";
import SetupNotice from "../LandsPage/SetupNotice";
import { PhoneIcon, PinIcon } from "../../components/common/Icons";

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

function AdminListing({ listing, onChangeStatus, busy }) {
  const seller = listing.listing_private || {};
  const published = listing.status === "approved" || listing.status === "sold";

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
          {seller.phone && <a href={`tel:${seller.phone}`}><PhoneIcon /> {seller.phone}</a>}
          {seller.line_id && <span>LINE: {seller.line_id}</span>}
          {seller.deed_no && <span>เลขโฉนด: {seller.deed_no}</span>}
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
        </div>
      </div>
    </article>
  );
}

/** หน้าแอดมินตรวจประกาศ (#/admin) — ไม่มีในเมนู เข้าผ่านลิงก์โดยตรง */
export default function AdminPage() {
  const [session, setSession] = useState(undefined); // undefined = กำลังเช็ก
  const [isAdmin, setIsAdmin] = useState(null);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ready | error
  const [busyId, setBusyId] = useState(null);
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

  const load = useCallback(async (status) => {
    setLoadState("loading");
    try {
      setItems(await fetchAdminListings(status));
      setLoadState("ready");
    } catch (err) {
      console.error(err);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load(tab);
  }, [isAdmin, tab, load]);

  const changeStatus = async (listing, next) => {
    setBusyId(listing.id);
    try {
      await setListingStatus(listing.id, next);
      setItems((list) => list.filter((l) => l.id !== listing.id));
      toast(`${listingCode(listing.id)}: ${LISTING_STATUSES.find((s) => s.value === next).label}`);
    } catch (err) {
      console.error(err);
      toast("เปลี่ยนสถานะไม่สำเร็จ");
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
  } else {
    body = (
      <>
        <div className="adm-bar">
          <div className="tabs adm-tabs">
            {LISTING_STATUSES.map((s) => (
              <button key={s.value} type="button" className={s.value === tab ? "on" : undefined} onClick={() => setTab(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="adm-user">
            <span>{session.user.email}</span>
            <button type="button" className="btn btn-ghost" onClick={signOut}>ออกจากระบบ</button>
          </div>
        </div>

        {loadState === "loading" && <div className="lands-msg">กำลังโหลด…</div>}
        {loadState === "error" && (
          <div className="lands-msg">
            <b>โหลดไม่สำเร็จ</b>
            <button type="button" className="btn btn-ghost" onClick={() => load(tab)}>ลองอีกครั้ง</button>
          </div>
        )}
        {loadState === "ready" && (items.length === 0 ? (
          <div className="lands-msg"><span>ไม่มีประกาศในสถานะนี้</span></div>
        ) : (
          <div className="adm-list">
            {items.map((listing) => (
              <AdminListing key={listing.id} listing={listing} busy={busyId === listing.id} onChangeStatus={changeStatus} />
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <section className="alt adm" data-page="admin">
      <div className="wrap">
        <h2>จัดการประกาศขายที่ดิน</h2>
        {body}
      </div>
    </section>
  );
}
