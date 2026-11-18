import { useMemo, useState } from "react";
import { COLOR_GROUPS, COLOR_RULES, EXTRA_GROUP, GRADIENTS } from "../../data/colorGuide";
import { useToast } from "../../hooks/useToast";
import Accordion from "./Accordion";
import { EXPORT_FORMATS, downloadPalette } from "../../utils/colorExport";

/** ค่าจริงของตัวแปรสี (อ่านจาก color-tokens.css ที่โหลดอยู่) */
const readToken = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

/** "#0b2a5b" → [r,g,b] (ไม่ใช่ hex 6 หลัก = null) */
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** อัตราส่วนความต่างของสี (WCAG) */
function contrast(fg, bg) {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

function ContrastBadge({ value, onValue }) {
  const fg = hexToRgb(value);
  const bg = hexToRgb(onValue);
  if (!fg || !bg) return null;
  const ratio = contrast(fg, bg);
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "ตัวใหญ่เท่านั้น" : "อ่านยาก";
  return (
    <span className={`cg-contrast${ratio < 4.5 ? " is-low" : ""}`} title="ความต่างของสีตัวอักษรกับพื้น (WCAG)">
      อ่านง่าย {ratio.toFixed(1)}:1 · {level}
    </span>
  );
}

/** ตัวแปร --c-x-* ทั้งหมดใน color-tokens.css (เรียงตามไฟล์) → กลุ่ม "สีเสริม" แสดงครบโดยไม่ต้องจดเอง */
function readExtraTokens() {
  const found = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // ไฟล์จากโดเมนอื่น (ฟอนต์) อ่านไม่ได้
    for (const rule of rules) {
      if (rule.selectorText !== ":root") continue;
      for (let k = 0; k < rule.style.length; k++) {
        const prop = rule.style[k];
        if (prop.startsWith("--c-x-") && !prop.endsWith("-rgb") && !found.includes(prop)) found.push(prop);
      }
    }
  }
  return found;
}

/** คู่มือสีเว็บ (#/admin/colors) — แต่ละกลุ่มพับเก็บไว้ กดหัวข้อเพื่อเปิด · กดที่สีเพื่อคัดลอกโค้ด */
export default function AdminColorGuide() {
  const toast = useToast();
  const [formatKey, setFormatKey] = useState("json");
  const format = EXPORT_FORMATS.find((f) => f.key === formatKey);

  // กลุ่มหลัก (จดชื่อ/การใช้ไว้ใน colorGuide.js) + สีเสริมที่อ่านจากไฟล์ตัวแปรเอง
  const groups = useMemo(() => [
    ...COLOR_GROUPS,
    { ...EXTRA_GROUP, colors: readExtraTokens().map((t) => ({ token: t, name: t.replace("--c-x-", ""), use: "" })) },
  ], []);
  const colorCount = groups.reduce((n, g) => n + g.colors.length, 0);

  // อ่านค่าสีครั้งเดียวตอนเปิด (ค่าเป็นของ :root ไม่เปลี่ยนตามธีม)
  const values = useMemo(() => {
    const all = [...groups.flatMap((g) => g.colors), ...GRADIENTS];
    const map = {};
    all.forEach(({ token, on }) => {
      map[token] = readToken(token);
      if (on) map[on] = readToken(on);
    });
    return map;
  }, [groups]);

  const download = () => {
    downloadPalette(format, values, groups);
    toast(`ดาวน์โหลด ${format.file} แล้ว`);
  };

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`คัดลอก ${label} แล้ว`);
    } catch {
      toast("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="cg acc-list">
      <div className="card cg-export">
        <div className="cg-export-tx">
          <b>ดาวน์โหลดชุดสี</b>
          <span>{colorCount} สี + ไล่สี {GRADIENTS.length} แบบ ในไฟล์เดียว</span>
        </div>
        <div className="cg-fmt" role="radiogroup" aria-label="รูปแบบไฟล์">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={f.key === formatKey}
              className={f.key === formatKey ? "on" : undefined}
              onClick={() => setFormatKey(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn cg-export-go" onClick={download}>ดาวน์โหลด</button>
        <p className="cg-export-hint">{format.hint} · <code>{format.file}</code></p>
      </div>

      <Accordion title="กติกาการใช้สี" meta={`${COLOR_RULES.length} ข้อ`}>
        <div className="cg-rules">
        <ol>{COLOR_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        <p className="cg-src">
          ไฟล์ต้นฉบับ: <code>src/styles/base/color-tokens.css</code> · กดที่สีเพื่อคัดลอกโค้ดสี, กดชื่อตัวแปรเพื่อคัดลอก <code>var(--…)</code>
        </p>
        </div>
      </Accordion>

      {groups.map((group) => (
        <Accordion
          key={group.title}
          className={`cg-group${group.dark ? " is-dark" : ""}`}
          title={group.title}
          meta={`${group.colors.length} สี`}
        >
          <p className="cg-note">{group.note}</p>
          <div className={`cg-grid${group.compact ? " is-compact" : ""}`}>
            {group.colors.map((c) => {
              const value = values[c.token];
              return (
                <div key={c.token} className="cg-item">
                  <button
                    type="button"
                    className={`cg-swatch${c.onDark ? " on-dark" : ""}`}
                    onClick={() => copy(value, value)}
                    aria-label={`คัดลอกสี ${c.name} ${value}`}
                  >
                    <span style={{ background: `var(${c.token})` }} />
                  </button>
                  <div className="cg-info">
                    {!group.compact && <b>{c.name}</b>}
                    <span className="cg-value">{value}</span>
                    <button type="button" className="cg-token" onClick={() => copy(`var(${c.token})`, `var(${c.token})`)}>
                      {c.token}
                    </button>
                    {c.use && <span className="cg-use">{c.use}</span>}
                    {c.on && <ContrastBadge value={value} onValue={values[c.on]} />}
                  </div>
                </div>
              );
            })}
          </div>
        </Accordion>
      ))}

      <Accordion
        className="cg-group"
        title="ไล่สี (Gradient)"
        meta={`${GRADIENTS.length} แบบ`}
      >
        <p className="cg-note">ใช้กับปุ่ม โลโก้ และเส้นใต้หัวข้อ</p>
        <div className="cg-grads">
          {GRADIENTS.map((g) => (
            <div key={g.token} className="cg-grad">
              <button
                type="button"
                className={`cg-grad-bar${g.dark ? " on-dark" : ""}`}
                onClick={() => copy(values[g.token], g.name)}
                aria-label={`คัดลอกไล่สี ${g.name}`}
              >
                <span style={{ background: `var(${g.token})` }} />
              </button>
              <div className="cg-info">
                <b>{g.name}</b>
                <button type="button" className="cg-token" onClick={() => copy(`var(${g.token})`, `var(${g.token})`)}>
                  {g.token}
                </button>
                <span className="cg-use">{g.use}</span>
              </div>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  );
}
