import { GRADIENTS } from "../data/colorGuide";

/**
 * ส่งออกชุดสีของเว็บเป็นไฟล์ (ใช้ในคู่มือสี /admin/colors)
 * groups = กลุ่มสีทั้งหมดที่แสดงในคู่มือ (รวมสีเสริม) · values = { "--c-navy": "#0b2a5b", ... } ค่าจริงจาก color-tokens.css
 */

const NAME = "DroneSample";
const shortName = (token) => token.replace(/^--c-/, ""); // --c-l-page → l-page
const today = () => new Date().toISOString().slice(0, 10);

/** JSON อ่านง่าย: แยกกลุ่ม มีชื่อไทย / ค่า / ใช้ที่ไหน */
function toJson(values, groups) {
  const data = {
    name: `${NAME} color palette`,
    exported: today(),
    source: "src/styles/base/color-tokens.css",
    groups: groups.map((g) => ({
      key: g.key,
      title: g.title,
      note: g.note,
      colors: g.colors.map((c) => ({ token: c.token, name: c.name, value: values[c.token], use: c.use })),
    })),
    gradients: GRADIENTS.map((g) => ({ token: g.token, name: g.name, value: values[g.token], use: g.use })),
  };
  return JSON.stringify(data, null, 2);
}

/** CSS: วางในโปรเจกต์อื่นแล้วใช้ var(--c-navy) ได้ทันที */
function toCss(values, groups) {
  const lines = [`/* ${NAME} color palette (${today()}) */`, ":root{"];
  groups.forEach((g) => {
    lines.push(`  /* ${g.title} */`);
    g.colors.forEach((c) => lines.push(`  ${c.token}: ${values[c.token]}; /* ${c.name} */`));
  });
  lines.push("  /* ไล่สี */");
  GRADIENTS.forEach((g) => lines.push(`  ${g.token}: ${values[g.token]}; /* ${g.name} */`));
  lines.push("}");
  return lines.join("\n") + "\n";
}

/** SCSS: ตัวแปร $c-navy */
function toScss(values, groups) {
  const lines = [`// ${NAME} color palette (${today()})`];
  groups.forEach((g) => {
    lines.push("", `// ${g.title}`);
    g.colors.forEach((c) => lines.push(`$c-${shortName(c.token)}: ${values[c.token]}; // ${c.name}`));
  });
  lines.push("", "// ไล่สี");
  GRADIENTS.forEach((g) => lines.push(`$c-${shortName(g.token)}: ${values[g.token]}; // ${g.name}`));
  return lines.join("\n") + "\n";
}

/** Design Tokens (มาตรฐาน W3C) — นำเข้า Figma ผ่านปลั๊กอิน Tokens Studio ได้ */
function toDesignTokens(values, groups) {
  const tokens = {};
  groups.forEach((g) => {
    tokens[g.key] = Object.fromEntries(g.colors.map((c) => [
      shortName(c.token),
      { $type: "color", $value: values[c.token], $description: `${c.name} — ${c.use}` },
    ]));
  });
  tokens.gradient = Object.fromEntries(GRADIENTS.map((g) => [
    shortName(g.token).replace(/^grad-/, ""),
    { $type: "gradient", $value: values[g.token], $description: `${g.name} — ${g.use}` },
  ]));
  return JSON.stringify(tokens, null, 2);
}

export const EXPORT_FORMATS = [
  { key: "json", label: "JSON", hint: "ไฟล์ข้อมูลทั่วไป มีชื่อสี ค่าสี และใช้ที่ไหน", file: "dronesample-colors.json", type: "application/json", build: toJson },
  { key: "css", label: "CSS", hint: "วางในเว็บอื่นแล้วใช้ var(--c-…) ได้ทันที", file: "dronesample-colors.css", type: "text/css", build: toCss },
  { key: "scss", label: "SCSS", hint: "สำหรับโปรเจกต์ที่ใช้ Sass (ตัวแปร $c-…)", file: "dronesample-colors.scss", type: "text/x-scss", build: toScss },
  { key: "tokens", label: "Figma", hint: "นำเข้า Figma ผ่านปลั๊กอิน Tokens Studio (Design Tokens)", file: "dronesample-colors.tokens.json", type: "application/json", build: toDesignTokens },
];

/** สร้างไฟล์แล้วสั่งดาวน์โหลด */
export function downloadPalette(format, values, groups) {
  const blob = new Blob([format.build(values, groups)], { type: `${format.type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = format.file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
