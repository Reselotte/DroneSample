import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  deleteListing, fetchMyRole, fetchAdminListing, fetchAdminListings, fetchPhoneCounts, fetchStatusCounts, photoUrl,
  searchAdminListings, setListingStatus, signIn, signOut,
} from "../../lib/listingsApi";
import { useToast } from "../../hooks/useToast";
import { LISTING_STATUSES } from "../../data/landListingOptions";
import { listingCode } from "../../utils/listingFormat";
import SetupNotice from "../LandsPage/SetupNotice";
import AdminColorGuide from "./AdminColorGuide";
import AdminSalesChecklist from "./AdminSalesChecklist";
import AdminListingsTable, { StatCards, statusLabel } from "./AdminListingsTable";
import ListingsReport from "./ListingsReport";
import AdminMembers from "./AdminMembers";
import AdminSystemCheck from "./AdminSystemCheck";
import { canUseBackoffice, roleLabel } from "../../data/roles";
import AdminListingEditor from "./AdminListingEditor";

/** ไอคอนเมนู (เส้น ใช้สีตามตัวอักษร) */
const icon = (d) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const ICONS = {
  listings: icon("M4 5h16M4 12h16M4 19h10"),
  checklist: icon("M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"),
  colors: icon("M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.7-.5-1 .2-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10zM7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01"),
  print: icon("M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"),
  logout: icon("M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"),
  search: icon("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4"),
  members: icon("M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5M17 11a3.5 3.5 0 1 0 0-7M22 21c0-3-1.8-5.3-4.5-6.1"),
};

/** เมนูแอดมิน: แต่ละเมนูมีที่อยู่ของตัวเอง (#/admin, #/admin/colors) */
const ADMIN_SECTIONS = [
  { key: "listings", href: "#/admin", label: "จัดการประกาศ", title: "จัดการประกาศ", sub: "ตรวจ อนุมัติ และแก้ไขประกาศขายที่ดิน" },
  { key: "checklist", href: "#/admin/checklist", label: "เช็กลิสต์ฝ่ายขาย", title: "เช็กลิสต์ฝ่ายขาย", sub: "ถามเจ้าของที่ดินทีละหัวข้อ สรุปและพิมพ์ได้" },
  { key: "colors", href: "#/admin/colors", label: "คู่มือสีเว็บ", title: "คู่มือสีเว็บ", sub: "ชุดสีทั้งหมดของเว็บ ดาวน์โหลดไปใช้ต่อได้" },
  { key: "members", href: "#/admin/members", label: "สมาชิก", title: "สมาชิก", sub: "บัญชีทั้งหมดในระบบ และระดับสิทธิ์ (ผู้ดูแลระบบเท่านั้น)", adminOnly: true },
  { key: "system", href: "#/admin/system", label: "ตรวจระบบ", title: "ตรวจระบบ", sub: "เช็กความพร้อมของฐานข้อมูล และเช็กลิสต์ทดสอบฟีเจอร์ (ผู้ดูแลระบบเท่านั้น)", adminOnly: true },
];

const STATUS_VALUES = LISTING_STATUSES.map((s) => s.value);

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

/** หน้าแก้ไขประกาศ (#/admin/edit/<รหัส>): โหลดประกาศเดียว แล้วแสดงฟอร์มเต็มหน้า */
function AdminEditPage({ id, onSaved }) {
  const [listing, setListing] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | notfound
  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchAdminListing(id)
      .then((l) => { if (alive) { setListing(l); setState(l ? "ready" : "notfound"); } })
      .catch((err) => { console.error(err); if (alive) setState("notfound"); });
    return () => { alive = false; };
  }, [id]);

  const back = () => { window.location.hash = "#/admin"; };
  if (state === "loading") return <div className="lands-msg">กำลังโหลดประกาศ…</div>;
  if (state === "notfound") {
    return (
      <div className="lands-msg">
        <b>ไม่พบประกาศ {listingCode(id)}</b>
        <a className="btn btn-ghost" href="#/admin">กลับไปรายการประกาศ</a>
      </div>
    );
  }
  return <AdminListingEditor key={listing.id} listing={listing} onCancel={back} onSaved={(updated) => { onSaved(updated); back(); }} />;
}

/** หน้าแอดมิน (#/admin) — ไม่มีในเมนู เข้าผ่านลิงก์โดยตรง · param = เมนูในแถบเครื่องมือ */
export default function AdminPage({ param }) {
  const [role, setRole] = useState(null); // ระดับสิทธิ์: staff = ทีมงาน, admin = ผู้ดูแลระบบ
  const isTopAdmin = role === "admin";
  const sections = ADMIN_SECTIONS.filter((s) => !s.adminOnly || isTopAdmin);
  const section = sections.find((s) => s.key === param) || sections[0];
  const editId = /^edit\/\d+$/.test(param || "") ? Number(param.slice(5)) : null; // #/admin/edit/12
  const onListings = section.key === "listings" && !editId;
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
    fetchMyRole()
      .then((r) => { setRole(r); setIsAdmin(canUseBackoffice(r)); })
      .catch(() => setIsAdmin(false));
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
    if (isAdmin) refreshCounts(); // ตัวเลขรอตรวจบนเมนูข้าง แสดงทุกหน้า
  }, [isAdmin, refreshCounts]);

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
    refreshCounts();
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

  // ยังไม่ได้เข้าระบบ / ไม่มีสิทธิ์ → หน้าธรรมดากลางจอ
  if (!isAdmin) {
    let gate;
    if (!isSupabaseConfigured) gate = <SetupNotice />;
    else if (session === undefined || (session && isAdmin === null)) gate = <div className="lands-msg">กำลังตรวจสอบสิทธิ์…</div>;
    else if (!session) gate = <LoginForm />;
    else {
      gate = (
        <div className="lands-msg">
          <b>บัญชีนี้ไม่มีสิทธิ์แอดมิน</b>
          <span>{session.user.email}</span>
          <button type="button" className="btn btn-ghost" onClick={signOut}>ออกจากระบบ</button>
        </div>
      );
    }
    return (
      <section className="alt adm" data-page="admin">
        <div className="wrap">
          <h2>จัดการประกาศขายที่ดิน</h2>
          {gate}
        </div>
      </section>
    );
  }

  let body;
  if (editId) body = <AdminEditPage id={editId} onSaved={saved} />;
  else if (section.key === "checklist") body = <AdminSalesChecklist />;
  else if (section.key === "colors") body = <AdminColorGuide />;
  else if (section.key === "members") body = <AdminMembers myId={session.user.id} />;
  else if (section.key === "system") body = <AdminSystemCheck myId={session.user.id} />;
  else {
    body = (
      <div className="adm-listings">
        <div className="adm-tools-bar">
          <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); runSearch(searchInput); }}>
            {ICONS.search}
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหา รหัส (L00012) เบอร์โทร ชื่อผู้ขาย หรือหัวข้อ แล้วกด Enter"
              aria-label="ค้นหาประกาศ"
            />
          </form>
          <button
            type="button"
            className="btn adm-add"
            disabled={loadState !== "ready"}
            onClick={() => window.print()}
            title="พิมพ์รายการที่กำลังดูอยู่ทั้งหมด (A4 แนวนอน)"
          >
            {ICONS.print} พิมพ์ใบสรุปผล
          </button>
        </div>

        <StatCards counts={counts} active={search ? null : tab} onPick={pickTab} />

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
          <div className="lands-msg"><span>{search ? "ไม่พบประกาศที่ตรงกับคำค้น" : `ไม่มีประกาศสถานะ "${statusLabel(tab)}"`}</span></div>
        ) : (
          <AdminListingsTable
            key={search || tab}
            items={items}
            busyId={busyId}
            phoneCounts={phoneCounts}
            onChangeStatus={changeStatus}
            onDelete={isTopAdmin ? remove : null}
            onSearchPhone={runSearch}
          />
        ))}

        {loadState === "ready" && (
          <ListingsReport
            items={items}
            counts={counts}
            scope={search ? `ผลค้นหา "${search}" (ทุกสถานะ)` : `สถานะ "${statusLabel(tab)}"`}
            email={session.user.email}
          />
        )}
      </div>
    );
  }

  return (
    <section className="adm adm-app" data-page="admin">
      <aside className="adm-side">
        <div className="adm-brand">
          <b>DroneSample</b>
          <span>หลังบ้าน</span>
        </div>
        <nav className="adm-nav" aria-label="เมนูแอดมิน">
          {sections.map((s) => (
            <a key={s.key} href={s.href} className={s.key === section.key ? "on" : undefined} aria-current={s.key === section.key ? "page" : undefined}>
              {ICONS[s.key]}
              <span>{s.label}</span>
              {s.key === "listings" && counts.pending > 0 && <em title="ประกาศรอตรวจ">{counts.pending}</em>}
            </a>
          ))}
        </nav>
        <div className="adm-side-foot">
          <span title={session.user.email}>{session.user.email}</span>
          {role && <em className={`adm-role is-${role}`}>{roleLabel(role)}</em>}
          <button type="button" onClick={signOut}>{ICONS.logout} ออกจากระบบ</button>
        </div>
      </aside>

      <div className="adm-main">
        {!editId && (
          <div className="adm-head">
            <h1>{section.title}</h1>
            <p>{section.sub}</p>
          </div>
        )}
        {body}
      </div>
    </section>
  );
}
