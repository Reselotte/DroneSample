import { useEffect } from "react";

/**
 * เมนูด้านบน (เฉพาะคอมพิวเตอร์ที่ใช้เมาส์): ยิ่งเอาเมาส์เข้าใกล้ ปุ่มยิ่งขยาย กดง่ายขึ้น
 *  MAX / PILL_MAX = ขยายสูงสุดกี่เท่า | SIGMA = โซนที่ได้ผลกว้างแค่ไหน | REACH = ระยะใต้แถบที่ยังได้ผล (px)
 */
const MAX = 1.5;
const PILL_MAX = 1.35;
const SIGMA = 90;
const REACH = 150;

export default function useNavMagnify(navRef, headerRef, pillRef) {
  useEffect(() => {
    const nav = navRef.current;
    const header = headerRef.current;
    const pill = pillRef.current;
    if (!nav || !header || !window.matchMedia) return undefined;

    const links = Array.from(nav.querySelectorAll("a"));
    const desktopQuery = window.matchMedia("(min-width:900px)");
    let mx = 0;
    let my = 0;
    let raf = 0;
    let active = false;

    const clearLinks = () => links.forEach((a) => { a.style.transform = ""; });
    const clearPill = () => { if (pill) pill.style.transform = ""; };
    const reset = () => {
      if (!active) return;
      active = false;
      clearLinks();
      clearPill();
    };
    // ความใกล้ 0..1 (เส้นโค้งระฆัง)
    const closeness = (cx, cy, sigma) => {
      const dx = mx - cx;
      const dy = (my - cy) * 1.1;
      return Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
    };

    const frame = () => {
      raf = 0;
      if (!desktopQuery.matches) { reset(); return; }
      const h = header.getBoundingClientRect();
      if (my > h.bottom + REACH || my < 0) { reset(); return; }
      let any = false;

      // ใช้ตำแหน่งตามธรรมชาติ (offset*) เพื่อไม่ให้ผลขยายวนกลับมากระทบตัวเอง
      const natural = links.map((a) => ({
        w: a.offsetWidth,
        cx: h.left + a.offsetLeft + a.offsetWidth / 2,
        cy: h.top + a.offsetTop + a.offsetHeight / 2,
      }));
      const scales = natural.map((o) => {
        const v = 1 + (MAX - 1) * closeness(o.cx, o.cy, SIGMA);
        return v < 1.01 ? 1 : v;
      });
      const extra = scales.map((v, i) => natural[i].w * (v - 1));
      const total = extra.reduce((a, b) => a + b, 0);

      if (total < 0.5) {
        clearLinks();
      } else {
        any = true;
        let acc = 0;
        links.forEach((a, i) => {
          // ดันปุ่มข้างเคียงออก ไม่ให้ซ้อนทับกัน
          const shift = acc + extra[i] / 2 - total / 2;
          acc += extra[i];
          a.style.transform = `translateX(${shift.toFixed(1)}px) scale(${scales[i].toFixed(3)})`;
        });
      }

      // ปุ่ม "ติดต่อเรา" ขยายจากขอบขวา ไม่ให้หลุดจอ
      if (pill) {
        const pcx = h.left + pill.offsetLeft + pill.offsetWidth / 2;
        const pcy = h.top + pill.offsetTop + pill.offsetHeight / 2;
        const ps = 1 + (PILL_MAX - 1) * closeness(pcx, pcy, SIGMA * 0.8);
        if (ps < 1.01) clearPill();
        else { any = true; pill.style.transform = `scale(${ps.toFixed(3)})`; }
      }
      active = any;
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const forceReset = () => { active = true; reset(); };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", forceReset);
    window.addEventListener("blur", forceReset);
    window.addEventListener("resize", forceReset);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", forceReset);
      window.removeEventListener("blur", forceReset);
      window.removeEventListener("resize", forceReset);
      cancelAnimationFrame(raf);
    };
  }, [navRef, headerRef, pillRef]);
}
