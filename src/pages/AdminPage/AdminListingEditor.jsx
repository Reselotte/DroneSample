import { useEffect, useMemo, useState } from "react";
import { SchemaOutdatedError, photoUrl, updateListing } from "../../lib/listingsApi";
import PhotoLightbox from "../../components/common/PhotoLightbox";
import { PRIVATE_GROUPS, PUBLIC_GROUPS } from "../../data/landChecklist";
import ChecklistFields, { cleanChecklist } from "./ChecklistFields";
import { LAND_TYPES, PRICE_UNITS, PROVINCES } from "../../data/landListingOptions";
import { formatThaiDate, isInThailand, listingCode, parseLatLng } from "../../utils/listingFormat";
import { StatusBadge } from "./AdminListingsTable";
import { isThaiPhone, normalizeThaiPhone } from "../../utils/thaiPhone";
import { useConfirm } from "../../hooks/useConfirm";

/** ค่าเริ่มต้นของฟอร์มจากประกาศเดิม */
function toForm(listing) {
  const seller = listing.listing_private || {};
  const str = (v) => (v == null || Number(v) === 0 ? "" : String(v));
  return {
    title: listing.title,
    land_type: listing.land_type,
    province: listing.province,
    district: listing.district || "",
    rai: str(listing.rai),
    ngan: str(listing.ngan),
    wah: str(listing.wah),
    price: String(listing.price),
    price_unit: listing.price_unit,
    location: listing.lat != null ? `${listing.lat}, ${listing.lng}` : "",
    description: listing.description || "",
    photos: [...(listing.photos || [])],
    seller_name: seller.seller_name || "",
    phone: seller.phone || "",
    line_id: seller.line_id || "",
    deed_no: seller.deed_no || "",
    highlights: { ...(listing.highlights || {}) },
    checklist: { ...(seller.checklist || {}) },
  };
}

/** ตรวจค่า (กติกาเดียวกับ check ใน supabase/schema.sql) คืน { errors, fields, seller } */
function validate(f) {
  const errors = {};
  const num = (v) => (v === "" ? 0 : Number(v));
  const rai = num(f.rai);
  const ngan = num(f.ngan);
  const wah = num(f.wah);
  const price = Number(f.price);
  const phone = normalizeThaiPhone(f.phone);
  const title = f.title.trim();
  let coords = null;

  if (title.length < 5 || title.length > 120) errors.title = "หัวข้อ 5–120 ตัวอักษร";
  if (!f.province) errors.province = "กรุณาเลือกจังหวัด";
  if ([rai, ngan, wah].some((n) => Number.isNaN(n) || n < 0) || rai * 400 + ngan * 100 + wah <= 0) {
    errors.area = "กรุณาระบุขนาดที่ดิน";
  }
  if (!(price > 0)) errors.price = "กรุณาระบุราคา";
  if (f.location.trim()) {
    coords = parseLatLng(f.location);
    if (!coords) errors.location = "อ่านพิกัดไม่ได้ ใส่แบบ 13.7563, 100.5018";
    else if (!isInThailand(coords)) errors.location = "พิกัดนี้อยู่นอกประเทศไทย";
  }
  if (f.photos.length < 1) errors.photos = "ต้องเหลือรูปอย่างน้อย 1 รูป";
  if (!f.seller_name.trim()) errors.seller_name = "กรุณาระบุชื่อ";
  if (!isThaiPhone(phone)) errors.phone = "เบอร์ไม่ถูกต้อง เช่น 0812345678 หรือ +66 81 234 5678";

  const fields = {
    title,
    land_type: f.land_type,
    province: f.province,
    district: f.district.trim(),
    rai, ngan, wah, price,
    price_unit: f.price_unit,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    description: f.description.trim(),
    photos: f.photos,
    highlights: cleanChecklist(f.highlights),
  };
  const seller = {
    seller_name: f.seller_name.trim(),
    phone,
    line_id: f.line_id.trim(),
    deed_no: f.deed_no.trim(),
    checklist: cleanChecklist(f.checklist),
  };
  return { errors, fields, seller };
}

/** หัวการ์ดแต่ละส่วน: เลข + ชื่อ + คำอธิบายสั้น */
function CardHead({ n, title, note, children }) {
  return (
    <div className="ae-card-head">
      {n && <span className="ae-num">{n}</span>}
      <div>
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * หน้าแก้ไขประกาศ (#/admin/edit/<รหัส>) — แยกเป็นหน้าของตัวเอง
 * ซ้าย: รูป → ข้อมูลที่ดิน → ตำแหน่ง/รายละเอียด → จุดเด่น · ขวา: ผู้ขาย (ข้อมูลภายใน)
 * แถบล่างค้างจอ: บอกว่ามีการแก้ที่ยังไม่บันทึก + ปุ่มบันทึก/ยกเลิก
 */
export default function AdminListingEditor({ listing, onCancel, onSaved }) {
  const ask = useConfirm();
  const initial = useMemo(() => toForm(listing), [listing]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null); // รูปที่เปิดดูเต็มจอ
  const pickedCount = Object.keys(form.highlights).length;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const published = listing.status === "approved" || listing.status === "sold";

  // แก้แล้วยังไม่บันทึก → เตือนก่อนปิดแท็บ/รีเฟรช
  useEffect(() => {
    if (!dirty || saving) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((er) => (er[field] ? { ...er, [field]: undefined } : er));
    },
  });
  const removePhoto = (path) => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== path) }));
  const makeCover = (path) => setForm((f) => ({ ...f, photos: [path, ...f.photos.filter((p) => p !== path)] }));
  const restorePhotos = () => setForm((f) => ({ ...f, photos: [...listing.photos] }));
  const removedCount = (listing.photos || []).length - form.photos.length;

  const cancel = async () => {
    if (dirty && !(await ask({ title: "ออกโดยไม่บันทึก?", message: "การแก้ไขที่ยังไม่ได้บันทึกจะหายไป", confirmText: "ออกจากหน้านี้", cancelText: "อยู่ต่อ", tone: "warn" }))) return;
    onCancel();
  };

  const save = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, fields, seller } = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => document.querySelector(".ae .err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    // ฐานข้อมูลยังไม่มีคอลัมน์จุดเด่น (ยังไม่ได้รัน SQL ใหม่) และไม่ได้ติ๊กอะไร → ไม่ส่งไป จะได้แก้ส่วนอื่นได้ตามปกติ
    if (!("highlights" in listing) && !Object.keys(fields.highlights).length) delete fields.highlights;
    if (!("checklist" in (listing.listing_private || {})) && !Object.keys(seller.checklist).length) delete seller.checklist;

    setSaving(true);
    try {
      const removed = (listing.photos || []).filter((p) => !form.photos.includes(p));
      onSaved(await updateListing(listing.id, fields, seller, removed));
    } catch (err) {
      console.error(err);
      setErrors({
        save: err instanceof SchemaOutdatedError
          ? "ฐานข้อมูลยังไม่รองรับจุดเด่นที่ดิน กรุณารัน supabase/schema.sql ใหม่ใน Supabase ก่อน"
          : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",
      });
      setSaving(false);
    }
  };

  return (
    <form className="ae" onSubmit={save} noValidate>
      {/* หัวหน้า: กลับ / รหัส สถานะ / ชื่อประกาศ */}
      <div className="ae-top">
        <button type="button" className="ae-back" onClick={cancel}>← กลับไปรายการประกาศ</button>
        <div className="ae-title">
          <div className="ae-meta">
            <span className="adm-code">{listingCode(listing.id)}</span>
            <StatusBadge status={listing.status} />
            <span className="adm-muted">ลงประกาศ {formatThaiDate(listing.created_at)}</span>
          </div>
          <div className="ae-h">{form.title || "—"}</div>
        </div>
        {published && <a className="btn btn-ghost ae-view" href={`#/lands/${listing.id}`} target="_blank" rel="noopener noreferrer">ดูหน้าประกาศ ↗</a>}
      </div>

      <div className="ae-grid">
        <div className="ae-main">
          {/* 1. รูป */}
          <div className="ae-card">
            <CardHead n="1" title="รูปภาพ" note="รูปแรกคือรูปหน้าปก · กดรูปเพื่อดูใหญ่">
              <span className="ae-count">{form.photos.length} รูป</span>
            </CardHead>
            <div className="ae-photos">
              {form.photos.map((path, i) => (
                <div key={path} className={`ae-photo${i === 0 ? " is-cover" : ""}`}>
                  <button type="button" className="adm-photo-btn" aria-label={`ดูรูปที่ ${i + 1}`} onClick={() => setViewing(i)}>
                    <img src={photoUrl(path)} alt="" loading="lazy" />
                  </button>
                  {i === 0 && <span className="ae-cover-tag">★ หน้าปก</span>}
                  <div className="ae-photo-act">
                    {i > 0 && <button type="button" onClick={() => makeCover(path)}>ตั้งเป็นหน้าปก</button>}
                    <button type="button" className="is-danger" onClick={() => removePhoto(path)}>ลบ</button>
                  </div>
                </div>
              ))}
            </div>
            {removedCount > 0 && (
              <p className="ae-note">
                จะลบ {removedCount} รูปเมื่อกดบันทึก ·{" "}
                <button type="button" className="adm-link" onClick={restorePhotos}>คืนรูปทั้งหมด</button>
              </p>
            )}
            <div className="err">{errors.photos}</div>
          </div>

          {/* 2. ข้อมูลที่ดิน */}
          <div className="ae-card">
            <CardHead n="2" title="ข้อมูลที่ดิน" />
            <div className="field">
              <label htmlFor="e_title">หัวข้อประกาศ</label>
              <input id="e_title" maxLength={120} {...bind("title")} />
              <div className="err">{errors.title}</div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="e_type">ประเภทที่ดิน</label>
                <select id="e_type" {...bind("land_type")}>
                  {LAND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="e_prov">จังหวัด</label>
                <select id="e_prov" {...bind("province")}>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="err">{errors.province}</div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="e_dist">ตำบล / อำเภอ</label>
              <input id="e_dist" maxLength={100} placeholder="เช่น ต.หนองชาก อ.บ้านบึง" {...bind("district")} />
            </div>
            <div className="field">
              <label>ขนาดที่ดิน</label>
              <div className="ae-area">
                <label><input type="number" min="0" step="any" {...bind("rai")} /><span>ไร่</span></label>
                <label><input type="number" min="0" step="any" {...bind("ngan")} /><span>งาน</span></label>
                <label><input type="number" min="0" step="any" {...bind("wah")} /><span>ตร.วา</span></label>
              </div>
              <div className="err">{errors.area}</div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="e_price">ราคา</label>
                <input id="e_price" type="number" min="0" step="any" {...bind("price")} />
                <div className="err">{errors.price}</div>
              </div>
              <div className="field">
                <label htmlFor="e_unit">หน่วยราคา</label>
                <select id="e_unit" {...bind("price_unit")}>
                  {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. ตำแหน่ง + รายละเอียด */}
          <div className="ae-card">
            <CardHead n="3" title="ตำแหน่ง และรายละเอียด" />
            <div className="field">
              <label htmlFor="e_loc">พิกัด (ละติจูด, ลองจิจูด)</label>
              <input id="e_loc" placeholder="13.7563, 100.5018" {...bind("location")} />
              <div className="err">{errors.location}</div>
            </div>
            <div className="field">
              <label htmlFor="e_desc">รายละเอียดเพิ่มเติม / จุดขาย</label>
              <textarea id="e_desc" rows={5} maxLength={3000} {...bind("description")} />
            </div>
          </div>

          {/* 4. จุดเด่น */}
          <div className="ae-card">
            <CardHead n="4" title="จุดเด่นที่ดิน" note="เลือกเฉพาะข้อที่เจ้าของยืนยันแล้ว · ข้อที่เลือกจะขึ้นบนหน้าประกาศ">
              <span className="ae-count">{pickedCount} ข้อ</span>
            </CardHead>
            <ChecklistFields groups={PUBLIC_GROUPS} value={form.highlights} onChange={(v) => setForm((f) => ({ ...f, highlights: v }))} />
          </div>
        </div>

        {/* ขวา: ผู้ขาย (ไม่แสดงบนเว็บ) */}
        <aside className="ae-side">
          <div className="ae-card ae-private">
            <CardHead title="ผู้ขาย" note="ข้อมูลภายใน ไม่แสดงบนเว็บ" />
            <div className="field">
              <label htmlFor="e_name">ชื่อ</label>
              <input id="e_name" maxLength={100} {...bind("seller_name")} />
              <div className="err">{errors.seller_name}</div>
            </div>
            <div className="field">
              <label htmlFor="e_phone">เบอร์โทร</label>
              <input id="e_phone" inputMode="tel" maxLength={20} {...bind("phone")} />
              <div className="err">{errors.phone}</div>
            </div>
            <div className="field">
              <label htmlFor="e_line">LINE ID</label>
              <input id="e_line" maxLength={50} {...bind("line_id")} />
            </div>
            <div className="field">
              <label htmlFor="e_deed">เลขโฉนด</label>
              <input id="e_deed" maxLength={50} {...bind("deed_no")} />
            </div>
            {listing.deedLinks?.length > 0 && (
              <p className="ae-deeds">
                สำเนาโฉนด:{" "}
                {listing.deedLinks.map((d, i) => (d.url
                  ? <a key={d.path} href={d.url} target="_blank" rel="noopener noreferrer">ไฟล์ {i + 1}</a>
                  : <span key={d.path}>ไฟล์ {i + 1} (เปิดไม่ได้)</span>))}
              </p>
            )}
            <ChecklistFields groups={PRIVATE_GROUPS} value={form.checklist} tone="private" onChange={(v) => setForm((f) => ({ ...f, checklist: v }))} />
          </div>
        </aside>
      </div>

      {/* แถบล่างค้างจอ */}
      <div className="ae-bar">
        <span className={`ae-state${dirty ? " is-dirty" : ""}`}>{dirty ? "● มีการแก้ไขที่ยังไม่บันทึก" : "ยังไม่มีการเปลี่ยนแปลง"}</span>
        <div className="err">{errors.save}</div>
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={cancel}>ยกเลิก</button>
        <button type="submit" className="btn btn-line" disabled={saving || !dirty}>{saving ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}</button>
      </div>

      {viewing != null && form.photos[viewing] && (
        <PhotoLightbox photos={form.photos.map(photoUrl)} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} title={listing.title} />
      )}
    </form>
  );
}
