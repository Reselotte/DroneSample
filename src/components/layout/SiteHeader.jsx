import { useEffect, useRef, useState } from "react";
import siteConfig from "../../config/siteConfig";
import { CONTACT_PAGE, NAV_ITEMS } from "../../data/navigationMenu";
import useMediaQuery from "../../hooks/useMediaQuery";
import useNavMagnify from "../../hooks/useNavMagnify";
import useHideOnScrollDown from "../../hooks/useHideOnScrollDown";

/**
 * แถบเมนูด้านบน
 * - คอมพิวเตอร์: เมนูเรียงแถวเดียว และขยายเมื่อเมาส์เข้าใกล้
 * - มือถือ: แสดงเฉพาะหน้าปัจจุบัน + ลูกศร กดแล้วกางเมนูทั้งหมดเป็นแถวลงมา
 * - เลื่อนลงแล้วแถบซ่อนไป เลื่อนขึ้นแล้วแถบโผล่กลับมา
 */
export default function SiteHeader({ currentPage }) {
  const headerRef = useRef(null);
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:899px)");

  useNavMagnify(navRef, headerRef, pillRef);
  const hidden = useHideOnScrollDown(menuOpen);

  // เปลี่ยนหน้าแล้วหุบเมนู / กดนอกเมนูแล้วหุบเมนู
  useEffect(() => setMenuOpen(false), [currentPage]);
  useEffect(() => {
    const onDocClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const hasActiveItem = NAV_ITEMS.some((item) => item.page === currentPage);

  const onNavClick = (e, page) => {
    if (!isMobile) return;
    if (page === currentPage) {
      e.preventDefault(); // กดหน้าปัจจุบัน = เปิด/ปิดเมนู
      setMenuOpen((open) => !open);
    } else {
      setMenuOpen(false);
    }
  };

  return (
    <header ref={headerRef} className={hidden ? "is-hidden" : undefined}>
      <div className="wrap">
        <a className="brand" href="#/home" id="brand">{siteConfig.brand}</a>
        <nav id="nav" ref={navRef} className={menuOpen ? "open" : undefined}>
          {/* หน้าติดต่อเรา ไม่มีรายการเมนูที่ถูกเลือก: บนมือถือใช้ปุ่ม "เมนู" แทนเพื่อกางรายการ */}
          {!hasActiveItem && (
            <button type="button" className="nav-toggle" onClick={() => setMenuOpen((open) => !open)}>เมนู</button>
          )}
          {NAV_ITEMS.map(({ page, label }) => (
            <a
              key={page}
              href={`#/${page}`}
              data-p={page}
              className={page === currentPage ? "on" : undefined}
              onClick={(e) => onNavClick(e, page)}
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
    </header>
  );
}
