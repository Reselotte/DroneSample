/**
 * เลื่อนหน้าเว็บแบบนุ่ม ๆ ไม่ให้มึนหัว (แทน scrollIntoView ที่เลื่อนเร็วเกิน)
 * - ค่อย ๆ ออกตัว → ไหล → ค่อย ๆ ชะลอตอนถึง (easeInOutCubic)
 * - ระยะเวลาตามระยะทาง 0.9–1.6 วินาที
 * - ถ้าผู้ใช้หมุนลูกกลิ้ง/แตะจอ/กดปุ่มเลื่อนเองระหว่างทาง → หยุดทันที (ไม่แย่งการควบคุม)
 * คืน Promise ที่ resolve(true) เมื่อถึงที่หมาย หรือ resolve(false) เมื่อถูกผู้ใช้ขัด
 */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function gentleScrollTo(targetY, { minMs = 900, maxMs = 1600, msPerPx = 1.1 } = {}) {
  const startY = window.scrollY;
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const endY = Math.max(0, Math.min(targetY, maxY));
  const distance = endY - startY;
  if (Math.abs(distance) < 2) return Promise.resolve(true);
  const duration = Math.min(maxMs, Math.max(minMs, Math.abs(distance) * msPerPx));

  return new Promise((resolve) => {
    let raf = 0;
    let start = 0;
    const cancelEvents = ["wheel", "touchstart", "keydown", "mousedown"];
    const stop = (arrived) => {
      cancelAnimationFrame(raf);
      cancelEvents.forEach((ev) => window.removeEventListener(ev, onUser));
      resolve(arrived);
    };
    const onUser = () => stop(false);
    cancelEvents.forEach((ev) => window.addEventListener(ev, onUser, { passive: true }));

    const step = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      // behavior:"instant" เพื่อไม่ให้ html{scroll-behavior:smooth} ซ้อนทับการเลื่อนของเรา
      window.scrollTo({ top: startY + distance * ease(t), behavior: "instant" });
      if (t < 1) raf = requestAnimationFrame(step);
      else stop(true);
    };
    raf = requestAnimationFrame(step);
  });
}

/** เลื่อนให้ element อยู่กลางจอ (ถ้าสูงกว่าจอ ให้ชิดบน เว้นที่แถบเมนู) */
export function gentleScrollToElement(el, opts) {
  if (!el) return Promise.resolve(false);
  const r = el.getBoundingClientRect();
  const headerSpace = 80;
  const centered = window.scrollY + r.top - (window.innerHeight - r.height) / 2;
  const topAligned = window.scrollY + r.top - headerSpace;
  return gentleScrollTo(r.height > window.innerHeight - headerSpace ? topAligned : centered, opts);
}
