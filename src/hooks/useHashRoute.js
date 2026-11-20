import { useEffect, useState } from "react";
import { PAGE_ALIASES, PAGES } from "../data/navigationMenu";
import { listen, toPath, upgradeLegacyHash } from "../lib/router";

/**
 * อ่านหน้าจากที่อยู่เว็บ (ไม่มี #)
 *  /             → { page: "home", param: "" }
 *  /works        → { page: "works", param: "" }
 *  /lands/12     → { page: "lands", param: "12" }
 *  /admin/edit/12 → { page: "admin", param: "edit/12" } (ส่วนที่เหลือทั้งหมดเป็น param)
 * ลิงก์เก่าแบบ #/lands/12 ยังเปิดได้ (แปลงเป็นแบบใหม่ให้)
 */
function readRoute() {
  const [first = "", ...rest] = window.location.pathname.replace(/^\/+/, "").split("/");
  const second = rest.join("/").replace(/\/+$/, "");
  let page = first || "home";
  page = PAGE_ALIASES[page] || page; // ลิงก์เก่า เช่น /sell → /callback
  if (!PAGES.includes(page)) return { page: "home", param: "" };
  return { page, param: decodeURIComponent(second) };
}

/** หน้าแรกแสดงเป็น "/" เสมอ (/home → /) */
function tidyHome() {
  if (/^\/home\/?$/.test(window.location.pathname)) {
    window.history.replaceState(window.history.state, "", toPath(window.location.pathname) + window.location.search);
  }
}

/** คืนค่าหน้าปัจจุบัน { page, param } และเลื่อนกลับขึ้นบนสุดทุกครั้งที่เปลี่ยนหน้า */
export default function useHashRoute() {
  const [route, setRoute] = useState(() => {
    upgradeLegacyHash();
    tidyHome();
    return readRoute();
  });

  useEffect(() => listen(() => {
    tidyHome();
    setRoute(readRoute());
    window.scrollTo(0, 0);
  }), []);

  return route;
}
