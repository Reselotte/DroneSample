/** ส่งสถิติการกดปุ่ม LINE (ทำงานเมื่อติดตั้ง Google Analytics / Meta Pixel ไว้เท่านั้น) */
export function trackLineClick() {
  if (window.gtag) window.gtag("event", "line_click");
  if (window.fbq) window.fbq("track", "Contact");
}
