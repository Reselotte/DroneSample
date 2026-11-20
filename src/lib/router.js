/**
 * ระบบเปลี่ยนหน้าแบบที่อยู่สะอาด (ไม่มี #): โดเมน/lands/12 แทน โดเมน/#/lands/12
 * - กดลิงก์ภายในเว็บ (href="/..." หรือลิงก์เก่า "#/...") → เปลี่ยนหน้าทันทีไม่โหลดใหม่
 * - ลิงก์เก่าแบบ #/... (ที่เคยแชร์ไป) ยังเปิดได้ → แปลงเป็นแบบใหม่ให้อัตโนมัติ
 * - ต้องมี vercel.json ส่งทุกที่อยู่มาที่ index.html (ไม่งั้นกดรีเฟรชแล้ว 404)
 */
const NAV_EVENT = "app:navigate";

/** "#/lands/12" / "/lands/12" / "/home" → "/lands/12" (หน้าแรก = "/") */
export function toPath(href) {
  let p = String(href || "/");
  if (p.startsWith("#")) p = p.slice(1);
  if (!p.startsWith("/")) p = `/${p}`;
  return /^\/home\/?(?=$|\?)/.test(p) ? p.replace(/^\/home\/?/, "/") : p;
}

/** ที่อยู่ปัจจุบัน (ไว้จำหน้าก่อนเข้าสู่ระบบ) เช่น "/mylistings/12" */
export const currentHref = () => `${window.location.pathname}${window.location.search}`;

/** เปลี่ยนหน้า: navigate("/lands") · navigate("#/lands") ก็ได้ */
export function navigate(href, { replace = false } = {}) {
  const path = toPath(href);
  if (path !== currentHref()) window.history[replace ? "replaceState" : "pushState"](null, "", path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** ลิงก์เก่า #/... → ที่อยู่แบบใหม่ (ไม่เพิ่มประวัติย้อนกลับ) · คืน true ถ้าแปลง */
export function upgradeLegacyHash() {
  if (!window.location.hash.startsWith("#/")) return false;
  window.history.replaceState(null, "", toPath(window.location.hash));
  return true;
}

/** ติดตามการเปลี่ยนหน้า (กดลิงก์ / ย้อนกลับ / navigate()) — คืนฟังก์ชันเลิกติดตาม */
export function listen(onChange) {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    const internal = href.startsWith("#/") || (href.startsWith("/") && !href.startsWith("//") && !/\.[a-z0-9]{2,5}$/i.test(href));
    if (!internal) return;
    e.preventDefault();
    navigate(href);
  };
  const onHash = () => { if (upgradeLegacyHash()) onChange(); }; // โค้ด/ลิงก์เก่าที่ยังตั้ง location.hash = "#/..."
  document.addEventListener("click", onClick);
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onHash);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    document.removeEventListener("click", onClick);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}
