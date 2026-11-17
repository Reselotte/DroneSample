/**
 * สร้างแผนที่ภูมิประเทศจำลอง (ข้อมูลสังเคราะห์ ไม่ใช่ที่ดินจริง) ออกมาเป็นโค้ด SVG
 * ใช้เป็นภาพตัวอย่างทั้งเว็บ: การ์ดหน้าแรก, ตัวอย่างผลงาน, หน้าขั้นตอน
 */
const GRID_W = 40; // จำนวนช่องแนวนอน
const GRID_H = 28; // จำนวนช่องแนวตั้ง
const CELL = 20; // ขนาดต่อช่อง (px)
const LEVEL_START = 90; // ระดับความสูงเริ่มต้นของเส้น contour
const LEVEL_STEP = 2.5; // เส้น contour ห่างกันกี่เมตร

export const MAP_VIEWBOX = `0 0 ${GRID_W * CELL} ${GRID_H * CELL}`;

// พื้นผิวภูมิประเทศจำลอง: ลาดเอียง + เนิน 2 ลูก + แอ่ง 1 แห่ง
const heightAt = (x, y) =>
  100 + 8 * x - 4 * y +
  26 * Math.exp(-((x - 0.22) ** 2 + (y - 0.3) ** 2) / 0.07) +
  16 * Math.exp(-((x - 0.85) ** 2 + (y - 0.8) ** 2) / 0.05) -
  14 * Math.exp(-((x - 0.55) ** 2 + (y - 0.55) ** 2) / 0.04);

const grid = [];
for (let j = 0; j <= GRID_H; j++) {
  grid[j] = [];
  for (let i = 0; i <= GRID_W; i++) grid[j][i] = heightAt(i / GRID_W, j / GRID_H);
}

let hMin = 1e9;
let hMax = -1e9;
grid.flat().forEach((v) => {
  hMin = Math.min(hMin, v);
  hMax = Math.max(hMax, v);
});

const PARCEL_POINTS = [[250, 120], [560, 95], [640, 260], [590, 440], [330, 470], [200, 330]];
const normalize = (v) => (v - hMin) / (hMax - hMin);

/** สีของแต่ละช่อง ตามรูปแบบแผนที่ (mode) */
function cellColor(mode, i, j) {
  const v = (grid[j][i] + grid[j][i + 1] + grid[j + 1][i] + grid[j + 1][i + 1]) / 4;
  const t = normalize(v);

  if (mode === "dtm") return `hsl(${Math.round((1 - t) * 250)},80%,50%)`;

  if (mode === "ortho") {
    const noise = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
    const a = Math.abs(noise);
    return `hsl(${70 + t * 20 + a * 25},${35 + a * 20}%,${30 + t * 14 + a * 10}%)`;
  }

  if (mode === "shade") {
    const dx = grid[j][i + 1] - grid[j][i];
    const dy = grid[j + 1][i] - grid[j][i];
    const light = Math.max(0, Math.min(1, 0.55 - (dx * 1.2 + dy * 0.9) * 0.35));
    return `hsl(35,15%,${25 + light * 60}%)`;
  }

  return t < 0.33 ? "#bcd9ea" : t < 0.66 ? "#cfe5c8" : "#ecdfba";
}

/** เส้นความสูง (contour) ที่ระดับ level หนึ่ง ๆ */
function contourPath(level) {
  let d = "";
  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const e = grid[j + 1][i];
      const pts = [];
      const edge = (u, v, x1, y1, x2, y2) => {
        if (u < level !== v < level) {
          const t = (level - u) / (v - u);
          pts.push([(x1 + (x2 - x1) * t) * CELL, (y1 + (y2 - y1) * t) * CELL]);
        }
      };
      edge(a, b, i, j, i + 1, j);
      edge(b, c, i + 1, j, i + 1, j + 1);
      edge(e, c, i, j + 1, i + 1, j + 1);
      edge(a, e, i, j, i, j + 1);
      for (let q = 0; q + 1 < pts.length; q += 2) {
        d += `M${pts[q][0].toFixed(0)} ${pts[q][1].toFixed(0)}L${pts[q + 1][0].toFixed(0)} ${pts[q + 1][1].toFixed(0)}`;
      }
    }
  }
  return d;
}

/**
 * options:
 *  mode    "contour" | "dtm" | "ortho" | "shade"
 *  parcel  วาดแปลงที่ดินตัวอย่าง   arrows ทิศน้ำไหล   pond จุดน้ำขัง/สระ   pad ที่ตั้งอาคาร
 *  lines   วาดเส้นความสูงทับแผนที่สี
 * คืนค่าเป็นเนื้อในของ <svg> (สตริง)
 */
export function buildMapSvgContent(options = {}) {
  const mode = options.mode || "contour";
  let s = "";

  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      s += `<rect x="${i * CELL}" y="${j * CELL}" width="${CELL + 0.5}" height="${CELL + 0.5}" fill="${cellColor(mode, i, j)}"/>`;
    }
  }

  if (mode === "contour" || options.lines) {
    for (let k = Math.ceil((hMin - LEVEL_START) / LEVEL_STEP); LEVEL_START + k * LEVEL_STEP < hMax; k++) {
      const level = LEVEL_START + k * LEVEL_STEP;
      const isMajor = k % 2 === 0; // เส้นหนาทุกช่วง 5 เมตร
      s += `<path d="${contourPath(level)}" fill="none" stroke="${options.lines ? "#fff" : isMajor ? "#5b3b1a" : "#8a6a45"}" stroke-width="${isMajor ? 2 : 1}" opacity="${options.lines ? 0.45 : isMajor ? 0.9 : 0.6}"/>`;
    }
  }

  if (options.parcel) {
    s += `<polygon points="${PARCEL_POINTS.map((p) => p.join(",")).join(" ")}" fill="rgba(11,42,91,.15)" stroke="#e11d48" stroke-width="3" stroke-dasharray="10 6"/><text x="330" y="290" font-size="22" font-weight="700" fill="#e11d48" stroke="#fff" stroke-width="4" paint-order="stroke">แปลงตัวอย่าง</text>`;
    if (options.arrows) s += `<g stroke="#1d4ed8" stroke-width="3" fill="#1d4ed8"><path d="M300 190l-40 40M520 170l30 60M450 400l-20-30"/></g>`;
    if (options.pond) s += `<ellipse cx="440" cy="300" rx="55" ry="34" fill="none" stroke="#1d4ed8" stroke-width="3" stroke-dasharray="6 4"/><text x="388" y="352" font-size="18" fill="#1d4ed8" stroke="#fff" stroke-width="3" paint-order="stroke">จุดน้ำขัง/ตำแหน่งสระ</text>`;
    if (options.pad) s += `<rect x="380" y="150" width="150" height="100" fill="rgba(0,0,0,.08)" stroke="#444" stroke-width="2.5"/><text x="392" y="205" font-size="18" fill="#222" stroke="#fff" stroke-width="3" paint-order="stroke">พื้นที่ตั้งอาคาร</text>`;
  }

  return s;
}
