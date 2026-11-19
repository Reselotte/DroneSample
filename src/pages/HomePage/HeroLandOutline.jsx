import { useEffect, useRef, useState } from "react";
import track from "../../data/heroLandTrack.json";

/**
 * เส้นแบ่งแปลงที่ดินทับวิดีโอหน้าแรก (เลื่อนตามกล้องโดรน แยกสีแต่ละแปลง)
 *
 * heroLandTrack.json = การเคลื่อนของกล้องทุก 0.1 วินาที (homography จากเฟรมอ้างอิงวินาทีที่ 12 → เฟรมนั้น)
 * ได้จากการติดตามภาพด้วย OpenCV (SIFT + RANSAC) — ถ้าเปลี่ยนวิดีโอ hero-bg.mp4 ต้องสร้างไฟล์นี้ใหม่
 * แปลงที่ดิน (PLOTS) วาดเป็นพิกัดบนเฟรมอ้างอิง (1280×720) → ปรับ/เพิ่มแปลงได้โดยไม่ต้องติดตามภาพใหม่
 * viewBox ขนาดเดียวกับวิดีโอ + preserveAspectRatio "slice" = ครอปเหมือน object-fit:cover ของวิดีโอพอดี
 */
// แปลงตามที่ลูกค้าวาด (วินาทีที่ 20.7 และ 21.2) → ขอบตรง แปลงพิกัดกลับมาที่เฟรมอ้างอิง, เรียงใกล้ → ไกล
// • แต่ละแปลงไม่ทับกัน เว้นช่องอย่างน้อย ~4px
// • แปลง A: ด้านซ้าย/ขวาลากยาวลงไปพ้นขอบล่างของทุกเฟรม (ที่ดินยาวเลยขอบภาพ) จึงไม่เห็นเส้นปิดด้านล่าง
//   tag = จุดปักหมุดของ A (จุดกลางแปลงจริงอยู่นอกภาพ) วางให้เห็นได้ตั้งแต่ต้นคลิป
const PLOTS = [
  { label: "A", tag: [790, 330], pts: [[718, 245], [1217, 411], [887, 1324], [609, 1324]] }, // เหลือง
  { label: "B", pts: [[1282.4, 261.5], [1217, 374], [749, 216], [910, 179]] }, // แดง
  { label: "C", pts: [[1325.1, 191.2], [1282.6, 257.5], [897, 171], [1022.9, 129.6]] }, // เขียว
  { label: "D", pts: [[1335, 136], [1313.9, 184.8], [1052.1, 131.4], [1146, 107]] }, // ฟ้า
  { label: "E", pts: [[1323, 132], [1175, 109], [1272, 106], [1321, 124]] }, // ม่วง
  { label: "F", pts: [[980, 127], [813, 152], [748.2, 131.9], [866.6, 103.3]] }, // เขียวมะนาว
  { label: "G", pts: [[1083, 97], [993, 124], [835.5, 92.2], [944, 71]] }, // ชมพู
  { label: "H", pts: [[899, 74], [827.5, 89.8], [697, 66], [802, 59]] }, // ฟ้าอ่อน
  { label: "I", pts: [[860.4, 100.7], [767.8, 123.1], [610, 83], [675, 65]] }, // น้ำเงิน
  { label: "J", pts: [[721, 130], [640, 179], [600, 96]] }, // น้ำตาล
];
// จุดปักหมุด = จุดกลางแปลง (หรือ tag ถ้ากำหนดไว้)
const SHAPES = PLOTS.map(({ label, tag, pts }) => ({
  label,
  pts,
  tag: tag || [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length],
}));

/** เวลาต่อหนึ่งแปลง (ms): หมุดปัก → วาดเส้น → ค้างไว้ → จางหาย — ต้องตรงกับ --step ใน home-hero.css */
const STEP_MS = 3400;

const KEYS = track.keys; // [t, h11, h12, h13, h21, h22, h23, h31, h32]

/** การเคลื่อนของกล้อง ณ เวลา t (เฉลี่ยระหว่างสองค่าที่ใกล้ที่สุด) */
function homographyAt(t) {
  let i = 1;
  while (i < KEYS.length - 1 && KEYS[i][0] < t) i += 1;
  const a = KEYS[i - 1];
  const b = KEYS[i];
  const k = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
  const h = [];
  for (let j = 1; j < 9; j += 1) h.push(a[j] + (b[j] - a[j]) * k);
  return h;
}
const project = (h, [x, y]) => {
  const w = h[6] * x + h[7] * y + 1;
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
};

/**
 * ลำดับแอนิเมชัน (วนไปเรื่อย ๆ): หมุดปักลงที่แปลง A → เส้นวาดรอบแปลง → ค้างสักครู่ → หมุดและเส้นจางหาย
 * → หมุดปักที่แปลง B → ... จนครบทุกแปลง แล้ววนกลับมาเริ่มใหม่
 * ผู้ใช้ที่ปิดแอนิเมชันในเครื่อง: ยังไล่ทีละแปลง แต่ไม่มีหมุดตก/เส้นวิ่ง แค่ค่อย ๆ ปรากฏแล้วจางไป (ดู home-hero.css)
 */
export default function HeroLandOutline({ videoRef }) {
  const polys = useRef([]);
  const tags = useRef([]);
  const [active, setActive] = useState(-1); // แปลงที่กำลังโชว์ (-1 = ยังไม่เริ่ม)

  // ไล่ทีละแปลง เริ่มหลังเปิดหน้า 0.6 วินาที
  // ข้ามแปลงที่ตอนนั้นอยู่นอกภาพ (เช่น แปลงไกลช่วงต้นคลิปที่กล้องยังต่ำ) จะได้ไม่มีช่วงว่างที่หมุดไปปักนอกจอ
  useEffect(() => {
    const visible = (i) => {
      const [x, y] = project(homographyAt(videoRef.current?.currentTime || 0), SHAPES[i].tag);
      return x > 40 && x < track.w - 40 && y > 60 && y < track.h - 20;
    };
    let timer = setTimeout(function next() {
      setActive((cur) => {
        for (let k = 1; k <= SHAPES.length; k += 1) {
          const i = (cur + k) % SHAPES.length;
          if (visible(i)) return i;
        }
        return (cur + 1) % SHAPES.length;
      });
      timer = setTimeout(next, STEP_MS);
    }, 600);
    return () => clearTimeout(timer);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let raf = 0;
    let vfc = 0;
    const draw = () => {
      const h = homographyAt(video.currentTime || 0);
      SHAPES.forEach((s, i) => {
        polys.current[i]?.setAttribute("points", s.pts.map((p) => project(h, p).join(",")).join(" "));
        const [x, y] = project(h, s.tag);
        tags.current[i]?.setAttribute("transform", `translate(${x},${y})`);
      });
    };
    // วาดตามเฟรมวิดีโอ (ถ้าเบราว์เซอร์รองรับ) — ไม่งั้นวาดทุกเฟรมหน้าจอ
    if (video.requestVideoFrameCallback) {
      const onFrame = () => { draw(); vfc = video.requestVideoFrameCallback(onFrame); };
      vfc = video.requestVideoFrameCallback(onFrame);
      video.addEventListener("seeked", draw);
    } else {
      const loop = () => { draw(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      if (vfc) video.cancelVideoFrameCallback?.(vfc);
      video.removeEventListener("seeked", draw);
    };
  }, [videoRef]);

  const state = (i) => (i === active ? " is-on" : "");

  return (
    <svg className="hero-land" viewBox={`0 0 ${track.w} ${track.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {SHAPES.map((s, i) => (
        <polygon key={s.label} ref={(el) => { polys.current[i] = el; }} className={`hero-plot is-${i + 1}${state(i)}`} pathLength="1" />
      ))}
      {SHAPES.map((s, i) => (
        <g key={s.label} ref={(el) => { tags.current[i] = el; }} className={`hero-pin is-${i + 1}${state(i)}`}>
          <g className="hero-pin-drop">
            <ellipse className="hero-pin-shadow" rx="9" ry="3.5" />
            <path className="hero-pin-body" d="M0 0C-4-11-16-19-16-31a16 16 0 1 1 32 0C16-19 4-11 0 0Z" />
            <text y="-31" textAnchor="middle" dominantBaseline="central">{s.label}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}
