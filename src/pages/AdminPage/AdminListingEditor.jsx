import { useState } from "react";
import { SchemaOutdatedError, photoUrl, updateListing } from "../../lib/listingsApi";
import { PRIVATE_GROUPS, PUBLIC_GROUPS } from "../../data/landChecklist";
import ChecklistFields, { cleanChecklist } from "./ChecklistFields";
import { LAND_TYPES, PRICE_UNITS, PROVINCES } from "../../data/landListingOptions";
import { isInThailand, listingCode, parseLatLng } from "../../utils/listingFormat";

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
  const phone = f.phone.replace(/[\s-]/g, "");
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
  if (!/^0\d{8,9}$/.test(phone)) errors.phone = "เบอร์ไม่ถูกต้อง เช่น 0812345678";

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

/** ฟอร์มแก้ไขประกาศ (แทนที่การ์ดในหน้าแอดมินระหว่างแก้) */
export default function AdminListingEditor({ listing, onCancel, onSaved }) {
  const [form, setForm] = useState(() => toForm(listing));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const pickedCount = Object.keys(form.highlights).length;

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm((f) => ({ ...f, [field]: e.target.value })),
  });
  const removePhoto = (path) => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== path) }));
  const restorePhotos = () => setForm((f) => ({ ...f, photos: [...listing.photos] }));
  const removedCount = (listing.photos || []).length - form.photos.length;

  const save = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, fields, seller } = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

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
    <form className="card adm-item adm-edit" onSubmit={save} noValidate>
      <div className="adm-edit-head">
        <span className="adm-code">{listingCode(listing.id)}</span>
        <b>แก้ไขประกาศ</b>
      </div>

      <div className="adm-edit-photos">
        <div className="adm-edit-grid">
          {form.photos.map((path) => (
            <div key={path} className="adm-edit-photo">
              <img src={photoUrl(path)} alt="" loading="lazy" />
              <button type="button" onClick={() => removePhoto(path)} aria-label="เอารูปนี้ออก">เอาออก</button>
            </div>
          ))}
        </div>
        {removedCount > 0 && (
          <p className="adm-edit-note">
            จะลบ {removedCount} รูปเมื่อกดบันทึก ·{" "}
            <button type="button" className="adm-link" onClick={restorePhotos}>คืนรูปทั้งหมด</button>
          </p>
        )}
        <div className="err">{errors.photos}</div>
      </div>

      <div className="adm-edit-fields">
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
          <label htmlFor="e_dist">อำเภอ / ตำบล</label>
          <input id="e_dist" maxLength={100} {...bind("district")} />
        </div>
        <div className="field">
          <label>ขนาดที่ดิน</label>
          <div className="adm-edit-area">
            <label><input type="number" min="0" step="any" {...bind("rai")} /> ไร่</label>
            <label><input type="number" min="0" step="any" {...bind("ngan")} /> งาน</label>
            <label><input type="number" min="0" step="any" {...bind("wah")} /> ตร.วา</label>
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
        <div className="field">
          <label htmlFor="e_loc">พิกัด (ละติจูด, ลองจิจูด)</label>
          <input id="e_loc" placeholder="13.7563, 100.5018" {...bind("location")} />
          <div className="err">{errors.location}</div>
        </div>
        <div className="field">
          <label htmlFor="e_desc">รายละเอียด</label>
          <textarea id="e_desc" rows={4} maxLength={3000} {...bind("description")} />
        </div>

        <section className="adm-edit-ckl">
          <div className="adm-edit-ckl-head">
            <b>จุดเด่นที่ดิน <span className="ckl-count">{pickedCount}</span></b>
          </div>
          <p className="adm-edit-hint">กดหัวข้อเพื่อเปิด เลือกข้อที่เจ้าของยืนยันแล้ว แล้วกด "ถัดไป" · เฉพาะข้อที่เลือกจะขึ้นเป็นจุดเด่นบนหน้าประกาศ</p>
          <ChecklistFields groups={PUBLIC_GROUPS} value={form.highlights} onChange={(v) => setForm((f) => ({ ...f, highlights: v }))} />
        </section>

        <div className="adm-seller adm-edit-seller">
          <b>ผู้ขาย (ไม่แสดงบนเว็บ)</b>
          <div className="row2">
            <div className="field">
              <label htmlFor="e_name">ชื่อ</label>
              <input id="e_name" maxLength={100} {...bind("seller_name")} />
              <div className="err">{errors.seller_name}</div>
            </div>
            <div className="field">
              <label htmlFor="e_phone">เบอร์โทร</label>
              <input id="e_phone" inputMode="tel" maxLength={15} {...bind("phone")} />
              <div className="err">{errors.phone}</div>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="e_line">LINE ID</label>
              <input id="e_line" maxLength={50} {...bind("line_id")} />
            </div>
            <div className="field">
              <label htmlFor="e_deed">เลขโฉนด</label>
              <input id="e_deed" maxLength={50} {...bind("deed_no")} />
            </div>
          </div>
          <ChecklistFields groups={PRIVATE_GROUPS} value={form.checklist} tone="private" onChange={(v) => setForm((f) => ({ ...f, checklist: v }))} />
        </div>

        <div className="adm-actions">
          <button type="submit" className="btn btn-line" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</button>
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={onCancel}>ยกเลิก</button>
        </div>
        <div className="err">{errors.save}</div>
      </div>
    </form>
  );
}
