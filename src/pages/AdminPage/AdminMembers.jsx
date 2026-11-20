import { useCallback, useEffect, useState } from "react";
import { fetchUsers, setUserRole } from "../../lib/listingsApi";
import { ROLES, roleLabel } from "../../data/roles";
import { useToast } from "../../hooks/useToast";
import { formatThaiPhone } from "../../utils/thaiPhone";
import { formatThaiDate } from "../../utils/listingFormat";

const PROVIDER = { google: "Google", facebook: "Facebook", email: "อีเมล" };

/** หลังบ้าน → สมาชิก: รายชื่อบัญชีทั้งหมด + เปลี่ยนระดับสิทธิ์ (แอดมินเท่านั้น) */
export default function AdminMembers({ myId }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error | outdated
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setRows(await fetchUsers(search));
      setState("ready");
    } catch (err) {
      console.error(err);
      // ยังไม่ได้รัน schema.sql ใหม่ (ไม่มีฟังก์ชัน admin_list_users)
      setState(err?.code === "PGRST202" || /admin_list_users/.test(err?.message || "") ? "outdated" : "error");
    }
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const change = async (u, role) => {
    if (role === u.role) return;
    const ok = window.confirm(`เปลี่ยน ${u.name || u.email} จาก "${roleLabel(u.role)}" เป็น "${roleLabel(role)}"?`);
    if (!ok) return;
    setBusyId(u.id);
    try {
      await setUserRole(u.id, role);
      setRows((list) => list.map((r) => (r.id === u.id ? { ...r, role } : r)));
      toast(`${u.name || u.email}: ${roleLabel(role)}`);
    } catch (err) {
      console.error(err);
      toast(/SELF_DEMOTE/.test(err?.message || "") ? "ลดสิทธิ์ของตัวเองไม่ได้" : "เปลี่ยนสิทธิ์ไม่สำเร็จ");
    }
    setBusyId(null);
  };

  const counts = Object.fromEntries(ROLES.map((r) => [r.value, rows.filter((u) => u.role === r.value).length]));
  const shown = filter === "all" ? rows : rows.filter((u) => u.role === filter);

  return (
    <div className="mb">
      <div className="adm-tools-bar">
        <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); setSearch(input.trim()); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" /></svg>
          <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="ค้นหา ชื่อ อีเมล หรือเบอร์ แล้วกด Enter" aria-label="ค้นหาสมาชิก" />
        </form>
      </div>

      {/* กรองตามระดับสิทธิ์ */}
      <div className="mb-filter" role="tablist" aria-label="กรองตามระดับสิทธิ์">
        <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "on" : undefined} onClick={() => setFilter("all")}>
          ทั้งหมด <b>{rows.length}</b>
        </button>
        {ROLES.map((r) => (
          <button key={r.value} type="button" role="tab" aria-selected={filter === r.value} className={filter === r.value ? "on" : undefined} onClick={() => setFilter(r.value)}>
            <i className={`mb-dot is-${r.value}`} />{r.label} <b>{counts[r.value]}</b>
          </button>
        ))}
      </div>

      {state === "loading" && <div className="lands-msg">กำลังโหลด…</div>}
      {state === "error" && <div className="lands-msg"><b>โหลดรายชื่อไม่สำเร็จ</b><button type="button" className="btn btn-ghost" onClick={load}>ลองอีกครั้ง</button></div>}
      {state === "outdated" && (
        <div className="lands-msg">
          <b>ฐานข้อมูลยังไม่รองรับระดับสิทธิ์</b>
          <span>กรุณารัน supabase/schema.sql ใหม่ใน Supabase → SQL Editor</span>
        </div>
      )}

      {state === "ready" && (shown.length === 0 ? (
        <div className="lands-msg"><span>ไม่พบสมาชิก</span></div>
      ) : (
        <div className="adm-table-card">
          <div className="adm-table-wrap">
            <table className="adm-table mb-table">
              <thead>
                <tr><th>สมาชิก</th><th>เบอร์มือถือ</th><th>เข้าสู่ระบบด้วย</th><th>สมัครเมื่อ</th><th>เข้าใช้ล่าสุด</th><th>ระดับสิทธิ์</th></tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const me = u.id === myId;
                  return (
                    <tr key={u.id} className={busyId === u.id ? "is-busy" : undefined}>
                      <td>
                        <div className="mb-who">
                          <span className={`mb-av is-${u.role}`}>{(u.name || u.email || "?").slice(0, 1).toUpperCase()}</span>
                          <div>
                            <b>{u.name || "—"}{me && <em className="mb-me">คุณ</em>}</b>
                            <small>{u.email || "—"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{u.phone ? formatThaiPhone(u.phone.startsWith("66") ? `+${u.phone}` : u.phone) : <span className="adm-muted">—</span>}</td>
                      <td className="adm-muted">{PROVIDER[u.provider] || u.provider || "—"}</td>
                      <td className="adm-muted">{formatThaiDate(u.created_at)}</td>
                      <td className="adm-muted">{u.last_sign_in_at ? formatThaiDate(u.last_sign_in_at) : "—"}</td>
                      <td>
                        <select
                          className={`mb-role is-${u.role}`}
                          value={u.role}
                          disabled={busyId === u.id || me}
                          title={me ? "เปลี่ยนสิทธิ์ของตัวเองไม่ได้" : undefined}
                          aria-label={`ระดับสิทธิ์ของ ${u.name || u.email}`}
                          onChange={(e) => change(u, e.target.value)}
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <dl className="mb-legend">
        {ROLES.map((r) => (
          <div key={r.value}><dt><i className={`mb-dot is-${r.value}`} />{r.label}</dt><dd>{r.note}</dd></div>
        ))}
      </dl>
    </div>
  );
}
