/** จัดรูปแบบตัวเลขแบบไทย เช่น 1,200,000 */
export const formatNumber = (n, maxDecimals = 0) =>
  Number(n).toLocaleString("th-TH", { maximumFractionDigits: maxDecimals });
