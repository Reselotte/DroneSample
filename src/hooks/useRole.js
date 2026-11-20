import { useEffect, useState } from "react";
import useAuth from "./useAuth";
import { fetchMyRole } from "../lib/listingsApi";

/** ระดับสิทธิ์ของบัญชีที่เข้าระบบอยู่ ("guest" | "user" | "staff" | "admin", null = กำลังเช็ก) */
export default function useRole() {
  const { user, ready } = useAuth();
  const [role, setRole] = useState(null);
  useEffect(() => {
    if (!ready) return undefined;
    if (!user) { setRole("guest"); return undefined; }
    let alive = true;
    fetchMyRole().then((r) => alive && setRole(r)).catch(() => alive && setRole("user"));
    return () => { alive = false; };
  }, [user?.id, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return role;
}
