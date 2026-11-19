import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import siteConfig from "../../config/siteConfig";
import { CONTACT_PAGE, NAV_ITEMS, SERVICE_LINKS } from "../../data/navigationMenu";
import LineLink from "../common/LineLink";
import useMediaQuery from "../../hooks/useMediaQuery";
import useNavMagnify from "../../hooks/useNavMagnify";
import useHideOnScrollDown from "../../hooks/useHideOnScrollDown";

/**
 * แถบเมนูด้านบน
 * - คอมพิวเตอร์: เมนูเรียงแถวเดียว และขยายเมื่อเมาส์เข้าใกล้
 * - มือถือ: ปุ่ม ☰ มุมขวาบน (ลอยค้างเหมือนปุ่มธีม) กดแล้วแผงเมนูเลื่อนออกมาจากขอบขวา รายการเรียงลงมา
 * - เลื่อนลงแล้วแถบซ่อนไป เลื่อนขึ้นแล้วแถบโผล่กลับมา (เปิดเมนูอยู่ = ไม่ซ่อน)
 */
export default function SiteHeader({ currentPage }) {
  const headerRef = useRef(null);
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const burgerRef = useRef(null);
  const drawerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:899px)");

  useNavMagnify(navRef, headerRef, pillRef);
  const hidden = useHideOnScrollDown(menuOpen);

  // เปลี่ยนหน้า / กดนอกเมนู / กด Esc / ขยายจอเป็นคอม → หุบเมนู
  useEffect(() => setMenuOpen(false), [currentPage]);
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);
  useEffect(() => {
    const onDocClick = (e) => {
      if (drawerRef.current?.contains(e.target) || burgerRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // เปิดแผงเมนูอยู่ → ล็อกไม่ให้หน้าข้างหลังเลื่อน
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const drawerItems = [...NAV_ITEMS, { page: CONTACT_PAGE, label: "ติดต่อเรา" }];

  return (
    <header ref={headerRef} className={hidden ? "is-hidden" : undefined}>
      <div className="wrap">
        <a className="brand" href="#/home" id="brand">{siteConfig.brand}</a>
        <nav id="nav" ref={navRef} className={menuOpen ? "open" : undefined} aria-label="เมนูหลัก">
          {NAV_ITEMS.map(({ page, label }) => (
            <a
              key={page}
              href={`#/${page}`}
              data-p={page}
              className={page === currentPage ? "on" : undefined}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          ref={pillRef}
          className="pill"
          href={`#/${CONTACT_PAGE}`}
          data-p={CONTACT_PAGE}
        >
          ติดต่อเรา
        </a>
      </div>

      {/* มือถือ: ปุ่ม ☰ + แผงเมนูด้านขวา — วางนอก header ผ่าน portal
          (header มีเอฟเฟกต์เบลอ/เลื่อนซ่อน ถ้าอยู่ข้างในแผงจะลอยเต็มจอไม่ได้) */}
      {isMobile && createPortal(
        <>
          <div className={`nav-backdrop${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <nav
            id="nav-drawer"
            ref={drawerRef}
            className={`nav-drawer${menuOpen ? " is-open" : ""}`}
            aria-label="เมนูหลัก"
            aria-hidden={!menuOpen}
            inert={menuOpen ? undefined : ""}
          >
            <b className="nav-drawer-title">เมนู</b>
            {drawerItems.map(({ page, label }, i) => (
              <a
                key={page}
                href={`#/${page}`}
                style={{ "--i": i }}
                className={`${page === currentPage ? "on" : ""}${page === CONTACT_PAGE ? " is-contact" : ""}` || undefined}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}

            {/* ท้ายแผง: ข้อมูลจากส่วนท้ายเว็บ (ตัวเล็ก สีจาง ไม่แย่งความเด่นจากเมนู) */}
            <div className="nav-drawer-extra">
              <div>
                <b>บริการของเรา</b>
                {SERVICE_LINKS.map((l) => (
                  <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
                ))}
              </div>
              <div>
                <b>ติดต่อเรา</b>
                <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
                <a href={siteConfig.emailHref}>{siteConfig.email}</a>
                <LineLink variant="plain">LINE: {siteConfig.lineId}</LineLink>
                <small>{siteConfig.replyText}</small>
              </div>
            </div>
          </nav>
        </>,
        document.body,
      )}
      {createPortal(
        <button
          ref={burgerRef}
          type="button"
          className={`nav-burger${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>,
        document.body,
      )}
    </header>
  );
}
