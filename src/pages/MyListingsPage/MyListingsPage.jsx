import { useEffect, useMemo, useRef, useState } from "react";
import {
  OwnerSchemaError, fetchMyListing, fetchMyListings, photoUrl, updateMyListing,
} from "../../lib/listingsApi";
import { shrinkImage } from "../../hooks/useFileAttachments";
import useThaiAddress from "../../hooks/useThaiAddress";
import { useToast } from "../../hooks/useToast";
import { LAND_TYPES, PRICE_UNITS, PROVINCES } from "../../data/landListingOptions";
import {
  districtText, formatArea, formatBaht, formatThaiDate, isInThailand, listingCode, parseLatLng,
} from "../../utils/listingFormat";
import {
  MOBILE_ERROR, PHONE_PLACEHOLDER, formatThaiPhone, isThaiMobile, normalizeThaiPhone,
} from "../../utils/thaiPhone";
import LocationField from "../../components/common/LocationField";
import PhotoLightbox from "../../components/common/PhotoLightbox";
import { useConfirm } from "../../hooks/useConfirm";
import { navigate } from "../../lib/router";

const MAX_PHOTOS = 10;

/** ป้ายสถานะ (คำสำหรับเจ้าของประกาศ) */
const STATUS = {
  pending: { label: "รอทีมงานตรวจ", note: "ยังไม่ขึ้นหน้าเว็บ ทีมงานจะตรวจภายใน 1–2 วันทำการ" },
  approved: { label: "เผยแพร่อยู่", note: "แสดงบนหน้าเว็บแล้ว" },
  rejected: { label: "ไม่อนุมัติ", note: "แก้ไขข้อมูลแล้วส่งตรวจใหม่ได้ หรือสอบถามทีมงานทาง LINE" },
  sold: { label: "ขายแล้ว", note: "ประกาศที่ขายแล้วแก้ไขไม่ได้" },
};
const StatusTag = ({ status }) => <span className={`adm-status is-${status}`}><i />{STATUS[status]?.label || status}</span>;

const SCHEMA_MSG = (
  <div className="lands-msg">
    <b>ระบบประกาศของฉันยังไม่พร้อมใช้งาน</b>
    <span>ผู้ดูแลต้องรัน supabase/schema.sql ใหม่ใน Supabase ก่อน</span>
  </div>
);

/** แยก "ต.หนองชาก อ.บ้านบึง" / "แขวงลาดยาว เขตจตุจักร" เป็น { subdistrict, district } */
function splitDistrict(text = "") {
  const sub = text.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s,]+)/)?.[1] || "";
  const dist = text.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s,]+)/)?.[1] || "";
  return { subdistrict: sub, district: dist };
}

/** หน้ารายการประกาศของฉัน */
function MyList() {
  const [items, setItems] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    fetchMyListings()
      .then((d) => { setItems(d); setState("ready"); })
      .catch((err) => { console.error(err); setState(err instanceof OwnerSchemaError ? "outdated" : "error"); });
  }, []);

  if (state === "loading") return <div className="lands-msg">กำลังโหลด…</div>;
  if (state === "outdated") return SCHEMA_MSG;
  if (state === "error") return <div className="lands-msg"><b>โหลดประกาศไม่สำเร็จ</b><span>กรุณาลองใหม่อีกครั้ง</span></div>;
  if (!items.length) {
    return (
      <div className="lands-msg">
        <b>ยังไม่มีประกาศ</b>
        <span>ลงประกาศขายที่ดินฟรี ระบบคำนวณราคาให้ทันที</span>
        <a className="btn" href="/post">+ ลงประกาศขาย</a>
      </div>
    );
  }
  return (
    <div className="ml-list">
      {items.map((l) => {
        const live = l.status === "approved" || l.status === "sold";
        return (
          <div key={l.id} className="ml-item">
            <div className="ml-thumb">{l.photos?.[0] ? <img src={photoUrl(l.photos[0])} alt="" loading="lazy" /> : null}</div>
            <div className="ml-body">
              <div className="ml-meta"><span className="adm-code">{listingCode(l.id)}</span><StatusTag status={l.status} /></div>
              <b className="ml-title">{l.title}</b>
              <span className="ml-sub">{formatBaht(l.total_price)} · {formatArea(l.rai, l.ngan, l.wah)} · {l.province}</span>
              <small className="ml-note">{STATUS[l.status]?.note} · ลงเมื่อ {formatThaiDate(l.created_at)}</small>
            </div>
            <div className="ml-act">
              {l.status !== "sold" && <a className="btn ml-edit" href={`/mylistings/${l.id}`}>แก้ไข</a>}
              {live && <a className="btn btn-ghost" href={`/lands/${l.id}`}>ดูหน้าประกาศ</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** ค่าเริ่มต้นฟอร์มจากประกาศ */
function toForm(l) {
  const seller = l.listing_private || {};
  const str = (v) => (v == null || Number(v) === 0 ? "" : String(v));
  return {
    title: l.title,
    landType: l.land_type,
    province: l.province,
    ...splitDistrict(l.district),
    rai: str(l.rai), ngan: str(l.ngan), wah: str(l.wah),
    price: String(l.price),
    priceUnit: l.price_unit,
    location: l.lat != null ? `${l.lat}, ${l.lng}` : "",
    description: l.description || "",
    sellerName: seller.seller_name || "",
    phone: seller.phone ? formatThaiPhone(seller.phone) : "",
    lineId: seller.line_id || "",
  };
}

/** ฟอร์มแก้ไขประกาศของฉัน */
function MyEdit({ listing }) {
  const ask = useConfirm();
  const toast = useToast();
  const address = useThaiAddress();
  const initial = useMemo(() => toForm(listing), [listing]);
  const initialPhotos = useMemo(() => (listing.photos || []).map((path) => ({ key: path, path })), [listing]);
  const [form, setForm] = useState(initial);
  const [photos, setPhotos] = useState(initialPhotos);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || photos.map((p) => p.key).join() !== initialPhotos.map((p) => p.key).join();
  const bkk = form.province === "กรุงเทพมหานคร";
  const districts = Object.keys(address?.[form.province] || {});
  const subdistricts = address?.[form.province]?.[form.district] || [];
  const published = listing.status === "approved";

  useEffect(() => {
    if (!dirty || saving) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const RESETS = { province: { district: "", subdistrict: "" }, district: { subdistrict: "" } };
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value, ...RESETS[field] }));
      setErrors((er) => (er[field] ? { ...er, [field]: undefined } : er));
    },
  });

  const addPhotos = async (files) => {
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (files.length > room) toast(`ใส่รูปได้สูงสุด ${MAX_PHOTOS} รูป`);
    const added = [];
    for (const f of list) {
      try {
        added.push({ key: `new-${crypto.randomUUID()}`, file: { name: f.name, type: "image/jpeg", data: await shrinkImage(f) } });
      } catch { /* อ่านรูปไม่ได้ ข้ามไป */ }
    }
    setPhotos((p) => [...p, ...added]);
    setErrors((er) => ({ ...er, photos: undefined }));
  };
  const srcOf = (p) => (p.file ? p.file.data : photoUrl(p.path));

  const cancel = async () => {
    if (dirty && !(await ask({ title: "ออกโดยไม่บันทึก?", message: "การแก้ไขที่ยังไม่ได้บันทึกจะหายไป", confirmText: "ออกจากหน้านี้", cancelText: "อยู่ต่อ", tone: "warn" }))) return;
    navigate("/mylistings");
  };

  const save = async (e) => {
    e.preventDefault();
    const num = (v) => (v === "" ? 0 : Number(v));
    const rai = num(form.rai); const ngan = num(form.ngan); const wah = num(form.wah);
    const price = Number(form.price);
    const err = {};
    let coords = null;
    if (form.title.trim().length < 5) err.title = "กรุณาใส่หัวข้อประกาศอย่างน้อย 5 ตัวอักษร";
    if (!form.province) err.province = "กรุณาเลือกจังหวัด";
    if (!form.district) err.district = bkk ? "กรุณาเลือกเขต" : "กรุณาเลือกอำเภอ";
    if (!form.subdistrict) err.subdistrict = bkk ? "กรุณาเลือกแขวง" : "กรุณาเลือกตำบล";
    if ([rai, ngan, wah].some((n) => Number.isNaN(n) || n < 0) || rai * 400 + ngan * 100 + wah <= 0) err.area = "กรุณาระบุขนาดที่ดิน";
    if (!(price > 0)) err.price = "กรุณาระบุราคา";
    if (form.location.trim()) {
      coords = parseLatLng(form.location);
      if (!coords) err.location = "อ่านพิกัดไม่ได้ ใส่แบบ 13.7563, 100.5018 หรือวางลิงก์ Google Maps";
      else if (!isInThailand(coords)) err.location = "พิกัดนี้อยู่นอกประเทศไทย";
    }
    if (!photos.length) err.photos = "ต้องมีรูปที่ดินอย่างน้อย 1 รูป";
    if (!form.sellerName.trim()) err.sellerName = "กรุณาระบุชื่อ";
    if (!isThaiMobile(form.phone)) err.phone = MOBILE_ERROR;
    setErrors(err);
    if (Object.keys(err).length) {
      requestAnimationFrame(() => document.querySelector(".ae .err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    if (published && !(await ask({
      title: "บันทึกและส่งให้ทีมงานตรวจใหม่?",
      message: "ประกาศจะกลับไปรอทีมงานตรวจอีกครั้ง และหายจากหน้าเว็บชั่วคราวจนกว่าจะอนุมัติ",
      confirmText: "บันทึก",
      tone: "warn",
    }))) return;

    setSaving(true);
    try {
      await updateMyListing(listing.id, {
        title: form.title.trim(), description: form.description.trim(), landType: form.landType,
        province: form.province, district: districtText(form),
        rai, ngan, wah, price, priceUnit: form.priceUnit,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        sellerName: form.sellerName.trim(), phone: normalizeThaiPhone(form.phone), lineId: form.lineId.trim(),
      }, photos);
      toast(`${listingCode(listing.id)}: บันทึกแล้ว รอทีมงานตรวจ`);
      navigate("/mylistings");
    } catch (x) {
      console.error(x);
      const msg = x?.message || "";
      setErrors({
        save: x instanceof OwnerSchemaError ? "ระบบแก้ไขประกาศยังไม่พร้อม (ผู้ดูแลต้องรัน schema.sql ใหม่)"
          : /NOT_OWNER/.test(msg) ? "ประกาศนี้ไม่ใช่ของบัญชีนี้ แก้ไขไม่ได้"
            : /SOLD_LOCKED/.test(msg) ? "ประกาศที่ขายแล้วแก้ไขไม่ได้"
              : /RATE_UPLOAD/.test(msg) ? "ขณะนี้มีการอัปโหลดรูปจำนวนมาก กรุณาลองใหม่ในอีกสักครู่"
                : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",
      });
      setSaving(false);
    }
  };

  return (
    <form className="ae" onSubmit={save} noValidate>
      <div className="ae-top">
        <button type="button" className="ae-back" onClick={cancel}>← กลับไปประกาศของฉัน</button>
        <div className="ae-title">
          <div className="ae-meta">
            <span className="adm-code">{listingCode(listing.id)}</span>
            <StatusTag status={listing.status} />
            <span className="adm-muted">ลงเมื่อ {formatThaiDate(listing.created_at)}</span>
          </div>
          <div className="ae-h">แก้ไขประกาศ: {form.title || "—"}</div>
        </div>
      </div>
      {published && <p className="ml-warn">ประกาศนี้เผยแพร่อยู่ ถ้าบันทึกการแก้ไข ประกาศจะกลับไป <b>รอทีมงานตรวจ</b> และหายจากหน้าเว็บจนกว่าจะอนุมัติอีกครั้ง</p>}

      <div className="ae-main">
        {/* 1. รูป */}
        <div className="ae-card">
          <div className="ae-card-head">
            <span className="ae-num">1</span>
            <div><h3>รูปภาพ</h3><p>รูปแรกคือรูปหน้าปก · สูงสุด {MAX_PHOTOS} รูป</p></div>
            <span className="ae-count">{photos.length} รูป</span>
          </div>
          <div className="ae-photos">
            {photos.map((p, i) => (
              <div key={p.key} className={`ae-photo${i === 0 ? " is-cover" : ""}`}>
                <button type="button" className="adm-photo-btn" aria-label={`ดูรูปที่ ${i + 1}`} onClick={() => setViewing(i)}>
                  <img src={srcOf(p)} alt="" loading="lazy" />
                </button>
                {i === 0 && <span className="ae-cover-tag">★ หน้าปก</span>}
                {p.file && <span className="ml-new">ใหม่</span>}
                <div className="ae-photo-act">
                  {i > 0 && <button type="button" onClick={() => setPhotos((list) => [p, ...list.filter((x) => x !== p)])}>ตั้งเป็นหน้าปก</button>}
                  <button type="button" className="is-danger" onClick={() => setPhotos((list) => list.filter((x) => x !== p))}>ลบ</button>
                </div>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" className="ml-add" onClick={() => fileRef.current?.click()}>
                <span aria-hidden="true">+</span>เพิ่มรูป
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          <div className="err">{errors.photos}</div>
        </div>

        {/* 2. ข้อมูลที่ดิน */}
        <div className="ae-card">
          <div className="ae-card-head"><span className="ae-num">2</span><div><h3>ข้อมูลที่ดิน</h3></div></div>
          <div className="field">
            <label htmlFor="m_title">หัวข้อประกาศ</label>
            <input id="m_title" maxLength={120} {...bind("title")} />
            <div className="err">{errors.title}</div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="m_type">ประเภทที่ดิน</label>
              <select id="m_type" {...bind("landType")}>
                {LAND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="m_prov">จังหวัด</label>
              <select id="m_prov" {...bind("province")}>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="err">{errors.province}</div>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="m_dist">{bkk ? "เขต" : "อำเภอ"}</label>
              <select id="m_dist" disabled={!address} {...bind("district")}>
                <option value="">{address ? "— เลือก —" : "กำลังโหลด…"}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="err">{errors.district}</div>
            </div>
            <div className="field">
              <label htmlFor="m_sub">{bkk ? "แขวง" : "ตำบล"}</label>
              <select id="m_sub" disabled={!form.district} {...bind("subdistrict")}>
                <option value="">{form.district ? "— เลือก —" : `— เลือก${bkk ? "เขต" : "อำเภอ"}ก่อน —`}</option>
                {subdistricts.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="err">{errors.subdistrict}</div>
            </div>
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
              <label htmlFor="m_price">ราคาขาย</label>
              <input id="m_price" type="number" min="0" step="any" {...bind("price")} />
              <div className="err">{errors.price}</div>
            </div>
            <div className="field">
              <label htmlFor="m_unit">หน่วยราคา</label>
              <select id="m_unit" {...bind("priceUnit")}>
                {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. ตำแหน่ง + รายละเอียด */}
        <div className="ae-card">
          <div className="ae-card-head"><span className="ae-num">3</span><div><h3>ตำแหน่ง และรายละเอียด</h3></div></div>
          <LocationField
            id="m_loc"
            label={<>ตำแหน่งที่ดิน <span className="opt">(ไม่บังคับ)</span></>}
            value={form.location}
            onChange={(text) => { setForm((f) => ({ ...f, location: text })); setErrors((er) => ({ ...er, location: undefined })); }}
            error={errors.location}
            onError={(msg) => setErrors((er) => ({ ...er, location: msg }))}
          />
          <div className="field">
            <label htmlFor="m_desc">รายละเอียดเพิ่มเติม / จุดขาย</label>
            <textarea id="m_desc" rows={5} maxLength={3000} {...bind("description")} />
          </div>
        </div>

        {/* 4. ติดต่อ */}
        <div className="ae-card ae-private">
          <div className="ae-card-head"><span className="ae-num">4</span><div><h3>ข้อมูลติดต่อ</h3><p>ทีมงานเห็นเท่านั้น ไม่แสดงบนเว็บ</p></div></div>
          <div className="row2">
            <div className="field">
              <label htmlFor="m_name">ชื่อ</label>
              <input id="m_name" maxLength={100} {...bind("sellerName")} />
              <div className="err">{errors.sellerName}</div>
            </div>
            <div className="field">
              <label htmlFor="m_phone">เบอร์มือถือ</label>
              <input id="m_phone" type="tel" inputMode="tel" maxLength={20} placeholder={PHONE_PLACEHOLDER} {...bind("phone")} />
              <div className="err">{errors.phone}</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="m_line">LINE ID <span className="opt">(ไม่บังคับ)</span></label>
            <input id="m_line" maxLength={50} {...bind("lineId")} />
          </div>
        </div>
      </div>

      <div className="ae-bar">
        <span className={`ae-state${dirty ? " is-dirty" : ""}`}>{dirty ? "● มีการแก้ไขที่ยังไม่บันทึก" : "ยังไม่มีการเปลี่ยนแปลง"}</span>
        <div className="err">{errors.save}</div>
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={cancel}>ยกเลิก</button>
        <button type="submit" className="btn btn-line" disabled={saving || !dirty}>{saving ? "กำลังบันทึก…" : "บันทึกและส่งตรวจ"}</button>
      </div>

      {viewing != null && photos[viewing] && (
        <PhotoLightbox photos={photos.map(srcOf)} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} title={form.title} />
      )}
    </form>
  );
}

/** โหลดประกาศของฉันตามรหัส แล้วแสดงฟอร์มแก้ไข */
function MyEditLoader({ id }) {
  const [listing, setListing] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    fetchMyListing(id)
      .then((l) => { setListing(l); setState(l ? (l.status === "sold" ? "sold" : "ready") : "notmine"); })
      .catch((err) => { console.error(err); setState(err instanceof OwnerSchemaError ? "outdated" : "error"); });
  }, [id]);

  if (state === "loading") return <div className="lands-msg">กำลังโหลดประกาศ…</div>;
  if (state === "outdated") return SCHEMA_MSG;
  if (state === "notmine") {
    return (
      <div className="lands-msg">
        <b>แก้ไขประกาศนี้ไม่ได้</b>
        <span>แก้ไขได้เฉพาะประกาศที่บัญชีของคุณลงไว้เท่านั้น</span>
        <a className="btn btn-ghost" href="/mylistings">ไปที่ประกาศของฉัน</a>
      </div>
    );
  }
  if (state === "sold") {
    return (
      <div className="lands-msg">
        <b>ประกาศนี้ขายแล้ว</b>
        <span>ประกาศที่ขายแล้วแก้ไขไม่ได้ หากต้องการเปิดขายอีกครั้ง ติดต่อทีมงานทาง LINE</span>
        <a className="btn btn-ghost" href="/mylistings">กลับไปประกาศของฉัน</a>
      </div>
    );
  }
  if (state === "error") return <div className="lands-msg"><b>โหลดประกาศไม่สำเร็จ</b><span>กรุณาลองใหม่อีกครั้ง</span></div>;
  return <MyEdit listing={listing} />;
}

/** หน้าประกาศของฉัน (/mylistings) และแก้ไข (/mylistings/<รหัส>) — ต้องเข้าสู่ระบบ */
export default function MyListingsPage({ param }) {
  const id = Number(param);
  const editing = Number.isInteger(id) && id > 0;
  return (
    <section className="alt ml" data-page="mylistings">
      <div className="wrap">
        {!editing && (
          <div className="ml-head">
            <div>
              <h2>ประกาศของฉัน</h2>
              <p className="sub">ประกาศที่คุณลงไว้ทั้งหมด แก้ไขได้เฉพาะประกาศของคุณเอง</p>
            </div>
            <a className="btn ml-new-btn" href="/post">+ ลงประกาศใหม่</a>
          </div>
        )}
        {editing ? <MyEditLoader id={id} /> : <MyList />}
      </div>
    </section>
  );
}

