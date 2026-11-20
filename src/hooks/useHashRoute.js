import { useEffect, useState } from "react";
import { PAGE_ALIASES, PAGES } from "../data/navigationMenu";

/**
 * อ่านหน้าจาก URL แบบ hash
 *  index.html#/works     → { page: "works", param: "" }
 *  index.html#/lands/12  → { page: "lands", param: "12" }
 *  index.html#/admin/edit/12 → { page: "admin", param: "edit/12" } (ส่วนที่เหลือทั้งหมดเป็น param)
 */
function readRouteFromHash() {
  const [first = "", ...rest] = window.location.hash.replace(/^#\/?/, "").split("/");
  const second = rest.join("/");
  let page = first || "home";
  page = PAGE_ALIASES[page] || page; // ลิงก์เก่า เช่น #/sell → #/callback
  if (!PAGES.includes(page)) return { page: "home", param: "" };
  return { page, param: decodeURIComponent(second) };
}

/** คืนค่าหน้าปัจจุบัน { page, param } และเลื่อนกลับขึ้นบนสุดทุกครั้งที่เปลี่ยนหน้า */
export default function useHashRoute() {
  const [route, setRoute] = useState(readRouteFromHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(readRouteFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
