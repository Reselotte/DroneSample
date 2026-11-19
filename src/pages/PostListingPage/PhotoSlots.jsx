import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shrinkImage } from "../../hooks/useFileAttachments";

/**
 * ช่องรูปตามหัวข้อ (หัวข้อละ 1 รูป) — แตะช่องแล้วเด้งหน้าต่าง: ซ้าย = เพิ่มรูป, ขวา = ตัวอย่าง
 * required = ต้องใส่รูปหัวข้อนี้
 * tips = สิ่งที่ควรเห็นในรูป (สั้น ๆ อ่านแวบเดียวเข้าใจ)
 */
export const PHOTO_SLOTS = [
  { key: "overview", label: "ภาพรวมทั้งแปลง", hint: "มุมสูง เห็นทั้งแปลง", tips: ["เห็นทั้งแปลง", "ถ่ายตอนกลางวัน"], required: true },
  { key: "road", label: "หน้าที่ดินติดถนน", hint: "เห็นถนนกับหน้าที่ดิน", tips: ["เห็นถนนกับหน้าที่ดินในรูปเดียว", "ถ่ายแนวนอน"] },
  { key: "access", label: "ทางเข้า–ออก", hint: "ถนนที่ใช้เข้าที่ดิน", tips: ["ถนนที่รถเข้าถึงที่ดิน", "เห็นสภาพถนน"] },
  { key: "inside", label: "สภาพในแปลง", hint: "ยืนในที่ดิน ถ่ายรอบ ๆ", tips: ["ยืนในที่ดิน ถ่ายรอบ ๆ", "เห็นพื้นดินและต้นไม้"] },
  { key: "boundary", label: "หมุด / แนวเขต", hint: "ถ่ายใกล้ ๆ ให้ชัด", tips: ["ถ่ายใกล้ ๆ เห็นหมุดชัด", "มีรั้ว ถ่ายแนวรั้วด้วย"] },
  { key: "utility", label: "ไฟฟ้า / ประปา", hint: "เสาไฟ มิเตอร์ ท่อน้ำ", tips: ["เสาไฟหรือมิเตอร์ใกล้ที่ดิน", "ท่อประปา (ถ้ามี)"] },
  { key: "nearby", label: "ที่ใกล้เคียง", hint: "ตลาด ชุมชน โรงเรียน", tips: ["ตลาด ชุมชน โรงเรียน", "จุดขายรอบ ๆ ที่ดิน"] },
  { key: "other", label: "รูปอื่น ๆ", hint: "รูปที่ช่วยขาย", tips: ["รูปอะไรก็ได้ที่ช่วยขาย"] },
];

/**
 * รูปตัวอย่าง: วางไฟล์ชื่อตามหัวข้อไว้ที่ src/assets/photo-examples/ (เช่น inside.jpg) แล้วขึ้นเองทันที
 * ตอนนี้มี overview / road / access (ภาพจากวิดีโอโดรนของเว็บ)
 */
const EXAMPLE_FILES = import.meta.glob("../../assets/photo-examples/*.{jpg,jpeg,png,webp}", { eager: true, query: "?url", import: "default" });
const EXAMPLES = Object.fromEntries(
  Object.entries(EXAMPLE_FILES).map(([path, url]) => [path.split("/").pop().replace(/\.\w+$/, ""), url]),
);

/** เส้นไฮไลต์บนรูปตัวอย่าง (พิกัดเป็น % ของรูป) — ใช้กับรูปตัวอย่างชุดปัจจุบันเท่านั้น */
const MARKS = {
  overview: { shape: "area", points: "43,99 41.7,61 47.4,46 58.3,34 90.6,20 91.1,56 86.5,99", label: { x: 68, y: 66, text: "ที่ดิน" } },
  road: { shape: "line", points: "46.6,99 46.6,42 52,32 63,22", label: { x: 52, y: 64, text: "หน้าติดถนน" } },
  access: { shape: "arrow", points: "52,96 56.5,64 60,46 66,28", label: { x: 63, y: 74, text: "ทางเข้า" } },
};

/** เรียงรูปสำหรับส่ง: รูปหน้าปกก่อน แล้วตามลำดับหัวข้อ */
export function orderedPhotos(slots, coverKey) {
  const keys = PHOTO_SLOTS.map((s) => s.key).filter((k) => slots[k]);
  const first = slots[coverKey] ? coverKey : keys[0];
  return [first, ...keys.filter((k) => k !== first)].filter(Boolean).map((k) => slots[k]);
}

/** หัวข้อที่บังคับแต่ยังไม่มีรูป */
export const missingRequired = (slots) => PHOTO_SLOTS.filter((s) => s.required && !slots[s.key]);

const inputId = (key) => `ps_${key}`;
const openPicker = (key) => document.getElementById(inputId(key))?.click();

/** รูปตัวอย่าง + เส้นไฮไลต์ */
function ExampleImage({ slotKey, label }) {
  const src = EXAMPLES[slotKey];
  if (!src) return null;
  const mark = MARKS[slotKey];
  return (
    <figure className="psm-exfig">
      <img src={src} alt={`ตัวอย่างรูป${label}`} />
      {mark && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {mark.shape === "area" && <polygon points={mark.points} className="psm-mk-area" vectorEffect="non-scaling-stroke" />}
          {mark.shape !== "area" && <polyline points={mark.points} className={`psm-mk-line${mark.shape === "arrow" ? " is-arrow" : ""}`} vectorEffect="non-scaling-stroke" />}
        </svg>
      )}
      {mark?.label && <span className="psm-mk-tx" style={{ left: `${mark.label.x}%`, top: `${mark.label.y}%` }}>{mark.label.text}</span>}
    </figure>
  );
}

/** หน้าต่างเพิ่มรูป: ซ้าย = เพิ่มรูป, ขวา = ตัวอย่าง */
function SlotDialog({ index, slots, coverNow, busy, error, onPick, onRemove, onCover, onGo, onClose }) {
  const s = PHOTO_SLOTS[index];
  const photo = slots[s.key];
  const next = PHOTO_SLOTS[index + 1];
  const prev = PHOTO_SLOTS[index - 1];
  const closeRef = useRef(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
  useEffect(() => { closeRef.current?.focus(); }, [index]);

  return createPortal(
    <div className="psm-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="psm" role="dialog" aria-modal="true" aria-labelledby="psm-title">
        <div className="psm-head">
          <b id="psm-title">{s.label}{s.required && <span className="req"> *</span>}</b>
          <span className="psm-count">{index + 1} / {PHOTO_SLOTS.length}</span>
          <button ref={closeRef} type="button" className="psm-x" aria-label="ปิด" onClick={onClose}>×</button>
        </div>

        <div key={s.key} className="psm-body">
          {/* ซ้าย: เพิ่มรูป */}
          <div className="psm-up">
            {photo ? (
              <>
                <div className={`psm-preview${s.key === coverNow ? " is-cover" : ""}`}>
                  <img src={photo.data} alt={s.label} />
                  {s.key === coverNow && <span className="pslot-badge"><span aria-hidden="true">★</span> รูปหน้าปก</span>}
                </div>
                <div className="psm-up-act">
                  <button type="button" className="btn btn-ghost" onClick={() => openPicker(s.key)}>เปลี่ยนรูป</button>
                  <button type="button" className="btn btn-ghost" onClick={() => onRemove(s.key)}>ลบ</button>
                  {s.key !== coverNow && (
                    <button type="button" className="btn btn-ghost psm-cover" onClick={() => onCover(s.key)}>☆ ใช้เป็นหน้าปก</button>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                className={`psm-drop${drag ? " is-drag" : ""}`}
                onClick={() => openPicker(s.key)}
                onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(s.key, e.dataTransfer.files[0]); }}
              >
                <span className="psm-drop-ic" aria-hidden="true">+</span>
                <b>{busy ? "กำลังใส่รูป…" : "เลือกรูป / ถ่ายรูป"}</b>
                <small>หรือลากรูปมาวางตรงนี้</small>
              </button>
            )}
            {error && <div className="err">{error}</div>}
          </div>

          {/* ขวา: ตัวอย่าง */}
          <div className={`psm-ex${EXAMPLES[s.key] ? "" : " is-tips"}`}>
            <span className="psm-ex-tag">{EXAMPLES[s.key] ? "ตัวอย่าง" : "ถ่ายให้เห็น"}</span>
            <ExampleImage slotKey={s.key} label={s.label} />
            <ul className="psm-tips">
              {s.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>

        <div className="psm-foot">
          {prev
            ? <button type="button" className="btn btn-ghost" onClick={() => onGo(index - 1)}>‹ ก่อนหน้า</button>
            : <span />}
          {next
            ? <button type="button" className="btn post-next" onClick={() => onGo(index + 1)}><span className="psm-next-full">{photo ? "ถัดไป" : "ข้าม"}: {next.label} ›</span><span className="psm-next-short">{photo ? "ถัดไป" : "ข้าม"} ›</span></button>
            : <button type="button" className="btn post-next" onClick={onClose}>เสร็จ</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function PhotoSlots({ slots, onChange, coverKey, onCover }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // index ของหัวข้อที่เปิดหน้าต่างอยู่
  const coverNow = slots[coverKey] ? coverKey : PHOTO_SLOTS.find((s) => slots[s.key])?.key;

  const pick = async (key, file) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError("ไฟล์นี้ไม่ใช่รูปภาพ"); return; }
    setBusy(key);
    try {
      const data = await shrinkImage(file);
      onChange((cur) => ({ ...cur, [key]: { name: `${key}.jpg`, type: "image/jpeg", data } }));
    } catch {
      setError("อ่านรูปนี้ไม่ได้ ลองรูปอื่น");
    }
    setBusy(null);
  };
  const remove = (key) => onChange((cur) => {
    const next = { ...cur };
    delete next[key];
    return next;
  });
  const go = (i) => { setError(""); setOpen(i); };

  return (
    <div className="pslots">
      {PHOTO_SLOTS.map((s, i) => {
        const photo = slots[s.key];
        const isCover = photo && s.key === coverNow;
        return (
          <div key={s.key} className={`pslot${photo ? " has-photo" : ""}${isCover ? " is-cover" : ""}`}>
            {/* ช่องเลือกไฟล์ (ซ่อน) — หน้าต่างเพิ่มรูปเรียกใช้ */}
            <input
              id={inputId(s.key)}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { pick(s.key, e.target.files[0]); e.target.value = ""; }}
            />
            {photo ? (
              <div className="pslot-img">
                <button type="button" className="pslot-open" aria-label={`ดู/เปลี่ยนรูป${s.label}`} onClick={() => go(i)}>
                  <img src={photo.data} alt={s.label} />
                </button>
                {isCover && <span className="pslot-badge"><span aria-hidden="true">★</span> รูปหน้าปก</span>}
                <button type="button" className="pslot-del" aria-label={`ลบรูป${s.label}`} onClick={() => remove(s.key)}>×</button>
              </div>
            ) : (
              <button type="button" className="pslot-add" onClick={() => go(i)} aria-label={`เพิ่มรูป${s.label}`}>
                <span className="pslot-plus">{busy === s.key ? "กำลังใส่รูป…" : "+ เพิ่มรูป"}</span>
              </button>
            )}
            <div className="pslot-foot">
              <b>{s.label}{s.required && <span className="req"> *</span>}</b>
              {!photo && <small className="pslot-hint">{s.hint}</small>}
              {photo && (
                isCover
                  ? <span className="pslot-cover-on"><span aria-hidden="true">★</span> หน้าปก</span>
                  : <button type="button" className="pslot-cover" onClick={() => onCover(s.key)}>☆ ตั้งเป็นหน้าปก</button>
              )}
            </div>
          </div>
        );
      })}
      {error && open == null && <div className="err pslots-err">{error}</div>}

      {open != null && (
        <SlotDialog
          index={open}
          slots={slots}
          coverNow={coverNow}
          busy={busy === PHOTO_SLOTS[open].key}
          error={error}
          onPick={pick}
          onRemove={remove}
          onCover={onCover}
          onGo={go}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
