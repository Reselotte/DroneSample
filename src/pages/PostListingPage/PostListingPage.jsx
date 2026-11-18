import { useRef, useState } from "react";
import FileDropZone from "../../components/common/FileDropZone";
import LineLink from "../../components/common/LineLink";
import useFileAttachments from "../../hooks/useFileAttachments";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { ListingLimitError, submitListing } from "../../lib/listingsApi";
import { LAND_TYPES, PRICE_UNITS, PROVINCES } from "../../data/landListingOptions";
import { isInThailand, listingCode, parseLatLng } from "../../utils/listingFormat";
import SetupNotice from "../LandsPage/SetupNotice";
import { CheckCircleIcon, LockIcon } from "../../components/common/Icons";
import LocationField from "../../components/common/LocationField";

const MAX_PHOTOS = 10;

// ── กันสแปม (ฝั่งหน้าเว็บ) ──
// ส่งเร็วกว่านี้หลังเปิดหน้า = ไม่ใช่คนกรอก (ฟอร์มนี้ต้องแนบรูป คนจริงใช้เวลาเป็นนาที)
const MIN_FILL_MS = 6000;
// ข้อความเมื่อเกินโควตาจากฐานข้อมูล (supabase/schema.sql)
const LIMIT_MESSAGES = {
  RATE_PHONE: "เบอร์โทรนี้ลงประกาศครบ 3 รายการใน 24 ชั่วโมงแล้ว กรุณาลองใหม่พรุ่งนี้ หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
  RATE_GLOBAL: "ขณะนี้มีประกาศรอตรวจสอบจำนวนมาก กรุณาลองใหม่ภายหลัง หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
  RATE_UPLOAD: "ขณะนี้มีการอัปโหลดรูปจำนวนมาก กรุณาลองใหม่ในอีกสักครู่ หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
};

const EMPTY_VALUES = {
  title: "", landType: "", province: "", district: "",
  rai: "", ngan: "", wah: "", price: "", priceUnit: "total",
  location: "", description: "",
  sellerName: "", phone: "", lineId: "", deedNo: "", consent: false,
  website: "", // ช่องดักบอท: ซ่อนจากคน บอทที่กรอกทุกช่องจะใส่ค่าลงมา
};

/** ตรวจค่าในฟอร์ม คืน { errors, listing } (listing = ค่าที่พร้อมส่ง) */
function validate(values, photoCount) {
  const errors = {};
  const num = (v) => (v === "" ? 0 : Number(v));
  const rai = num(values.rai);
  const ngan = num(values.ngan);
  const wah = num(values.wah);
  const price = Number(values.price);
  const phone = values.phone.trim().replace(/[\s-]/g, "");
  const title = values.title.trim();
  let coords = null;

  if (title.length < 5) errors.title = "กรุณาใส่หัวข้อประกาศอย่างน้อย 5 ตัวอักษร";
  if (!values.landType) errors.landType = "กรุณาเลือกประเภทที่ดิน";
  if (!values.province) errors.province = "กรุณาเลือกจังหวัด";
  if ([rai, ngan, wah].some((n) => Number.isNaN(n) || n < 0) || rai * 400 + ngan * 100 + wah <= 0) {
    errors.area = "กรุณาระบุขนาดที่ดิน";
  }
  if (!(price > 0)) errors.price = "กรุณาระบุราคา";
  if (values.location.trim()) {
    coords = parseLatLng(values.location);
    if (!coords) errors.location = /goo.gl/.test(values.location)
      ? "ลิงก์แบบย่อ (goo.gl) อ่านพิกัดไม่ได้ กรุณาเปิดลิงก์แล้วคัดลอกพิกัดตัวเลขมาวางแทน"
      : "อ่านพิกัดไม่ได้ ใส่แบบ 13.7563, 100.5018 หรือวางลิงก์ Google Maps";
    else if (!isInThailand(coords)) errors.location = "พิกัดนี้อยู่นอกประเทศไทย กรุณาตรวจสอบอีกครั้ง";
  }
  if (photoCount < 1) errors.photos = "กรุณาแนบรูปที่ดินอย่างน้อย 1 รูป";
  if (!values.sellerName.trim()) errors.sellerName = "กรุณาระบุชื่อ";
  if (!/^0\d{8,9}$/.test(phone)) errors.phone = "หมายเลขโทรศัพท์ไม่ถูกต้อง เช่น 0812345678";
  if (!values.consent) errors.consent = "กรุณายืนยันก่อนส่งประกาศ";

  const listing = {
    title,
    landType: values.landType,
    province: values.province,
    district: values.district.trim(),
    rai, ngan, wah, price,
    priceUnit: values.priceUnit,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    description: values.description.trim(),
    sellerName: values.sellerName.trim(),
    phone,
    lineId: values.lineId.trim(),
    deedNo: values.deedNo.trim(),
  };
  return { errors, listing };
}

/** หน้าลงประกาศขายที่ดิน (#/post) — ใครก็ลงได้ ประกาศจะขึ้นเว็บเมื่อทีมงานอนุมัติ */
export default function PostListingPage() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState(null);
  const openedAt = useRef(Date.now()); // เวลาเปิดฟอร์ม (ดักส่งเร็วเกินคน)
  const photos = useFileAttachments({ maxFiles: MAX_PHOTOS, allowPdf: false });
  const deed = useFileAttachments({ maxFiles: 5, allowPdf: true });

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setValues((v) => ({ ...v, [field]: e.target.value })),
  });

  const submit = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, listing } = validate(values, photos.files.length);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      // เลื่อนไปที่ช่องแรกที่ผิด
      requestAnimationFrame(() => document.querySelector(".post .err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    // บอทกรอกช่องที่ซ่อนไว้ → ทำเหมือนส่งสำเร็จ แต่ไม่บันทึกอะไร (บอทจะได้ไม่ลองวิธีอื่น)
    if (values.website) {
      setSentId("ignored");
      window.scrollTo(0, 0);
      return;
    }
    // ส่งเร็วเกินคนกรอก → ให้กดส่งอีกครั้ง (คนจริงที่บังเอิญเร็ว กดซ้ำก็ผ่าน)
    if (Date.now() - openedAt.current < MIN_FILL_MS) {
      openedAt.current = Date.now() - MIN_FILL_MS / 2;
      setErrors({ send: "กรุณาตรวจสอบข้อมูลอีกครั้ง แล้วกดส่งประกาศ" });
      return;
    }

    setSending(true);
    try {
      const id = await submitListing(listing, photos.files, deed.files);
      setSentId(id);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setErrors({
        send: err instanceof ListingLimitError
          ? LIMIT_MESSAGES[err.code]
          : "ส่งประกาศไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อทีมงานทาง LINE",
      });
    }
    setSending(false);
  };

  if (!isSupabaseConfigured) {
    return <section className="alt post" data-page="post"><div className="wrap"><SetupNotice /></div></section>;
  }

  if (sentId) {
    return (
      <section className="alt post" data-page="post">
        <div className="wrap">
          <div className="ok post-ok">
            <div className="ico ico-ok"><CheckCircleIcon /></div>
            <h3>ได้รับประกาศของท่านแล้ว</h3>
            {typeof sentId === "number" && <p>รหัสประกาศ <b>{listingCode(sentId)}</b></p>}
            <p>ทีมงานจะตรวจสอบข้อมูลก่อนเผยแพร่ และอาจโทรติดต่อเพื่อยืนยันข้อมูล ภายใน 1–2 วันทำการ</p>
            <div className="post-ok-act">
              <a className="btn btn-ghost" href="#/lands">ดูที่ดินประกาศขาย</a>
              <LineLink>สอบถามทีมงานทาง LINE</LineLink>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="alt post" data-page="post">
      <div className="wrap">
        <h2>ลงประกาศขายที่ดินฟรี</h2>
        <p className="sub">กรอกข้อมูลที่ดิน <span className="hl">ทีมงานตรวจสอบก่อนเผยแพร่</span> ผู้ซื้อติดต่อผ่านทีมงาน ข้อมูลติดต่อของท่านไม่แสดงบนเว็บ</p>

        <form className="post-form" noValidate onSubmit={submit}>
          {/* ช่องดักบอท: คนมองไม่เห็นและกด Tab ข้าม — อย่าใช้ display:none (บอทบางตัวข้ามช่องแบบนั้น) */}
          <div className="post-hp" aria-hidden="true">
            <label htmlFor="p_website">เว็บไซต์ (ไม่ต้องกรอก)</label>
            <input id="p_website" name="website" type="text" tabIndex={-1} autoComplete="off" {...bind("website")} />
          </div>
          {/* คอม: ซ้าย = ผู้ขาย + ปุ่มส่ง (ค้างตอนเลื่อน) / ขวา = ข้อมูลที่ดิน · มือถือ: ผู้ขาย → ที่ดิน → ปุ่มส่ง (จัดลำดับด้วย CSS) */}
          <div className="post-side">
            <div className="card post-block post-seller">
              <h3>1. ข้อมูลผู้ขาย</h3>
              <p className="post-private"><LockIcon /> ข้อมูลส่วนนี้ทีมงานเห็นเท่านั้น ไม่แสดงบนเว็บ</p>

              <div className="row2">
                <div className="field">
                  <label htmlFor="p_name">ชื่อ <span className="req">*</span></label>
                  <input id="p_name" autoComplete="name" maxLength={100} {...bind("sellerName")} />
                  <div className="err">{errors.sellerName}</div>
                </div>
                <div className="field">
                  <label htmlFor="p_phone">หมายเลขโทรศัพท์ <span className="req">*</span></label>
                  <input id="p_phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" {...bind("phone")} />
                  <div className="err">{errors.phone}</div>
                </div>
              </div>

              <div className="row2">
                <div className="field">
                  <label htmlFor="p_line">LINE ID <span className="opt">(ไม่บังคับ)</span></label>
                  <input id="p_line" maxLength={50} {...bind("lineId")} />
                </div>
                <div className="field">
                  <label htmlFor="p_deed">เลขโฉนด <span className="opt">(ไม่บังคับ)</span></label>
                  <input id="p_deed" maxLength={50} {...bind("deedNo")} />
                </div>
              </div>

              <FileDropZone
                attachments={deed}
                id="p_deedfiles"
                label={<>สำเนาโฉนด <span className="opt">(ไม่บังคับ ช่วยให้ตรวจสอบได้เร็วขึ้น)</span></>}
                hint="รองรับรูปภาพและ PDF สูงสุด 5 ไฟล์ (PDF ไม่เกิน 4 MB ต่อไฟล์)"
                note="แนะนำให้ปิดบังเลขบัตรประชาชนก่อนแนบ"
              >
                <b>เลือกไฟล์ หรือถ่ายภาพสำเนาโฉนด</b>
              </FileDropZone>
            </div>
            <div className="card post-block post-final">
              <div className="field">
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--tx)" }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", marginTop: 5 }}
                    checked={values.consent}
                    onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
                  />
                  <span>
                    ข้าพเจ้าเป็นเจ้าของที่ดินหรือได้รับมอบอำนาจให้ขาย และยินยอมให้ทีมงานใช้ข้อมูลนี้เพื่อตรวจสอบและติดต่อกลับ <span className="req">*</span>
                  </span>
                </label>
                <div className="err">{errors.consent}</div>
              </div>

              <button className="btn btn-line" type="submit" disabled={sending} style={{ width: "100%" }}>
                {sending ? "กำลังส่งประกาศ…" : "ส่งประกาศให้ทีมงานตรวจสอบ"}
              </button>
              <div className="err">{errors.send}</div>
            </div>
          </div>

          <div className="card post-block post-land">
            <h3>2. ข้อมูลที่ดิน</h3>

            <div className="field">
              <label htmlFor="p_title">หัวข้อประกาศ <span className="req">*</span></label>
              <input id="p_title" maxLength={120} placeholder="เช่น ที่ดินติดถนนลาดยาง ใกล้ตัวเมือง เหมาะทำสวน" {...bind("title")} />
              <div className="err">{errors.title}</div>
            </div>

            <div className="row2">
              <div className="field">
                <label htmlFor="p_type">ประเภทที่ดิน <span className="req">*</span></label>
                <select id="p_type" {...bind("landType")}>
                  <option value="">— เลือก —</option>
                  {LAND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="err">{errors.landType}</div>
              </div>
              <div className="field">
                <label htmlFor="p_prov">จังหวัด <span className="req">*</span></label>
                <select id="p_prov" {...bind("province")}>
                  <option value="">— เลือก —</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="err">{errors.province}</div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="p_dist">อำเภอ / ตำบล <span className="opt">(ไม่บังคับ)</span></label>
              <input id="p_dist" maxLength={100} {...bind("district")} />
            </div>

            <div className="field">
              <label>ขนาดที่ดิน <span className="req">*</span></label>
              <div className="row3">
                <div><input type="number" min="0" step="any" placeholder="0" aria-label="ไร่" {...bind("rai")} /><label style={{ marginTop: 4 }}>ไร่</label></div>
                <div><input type="number" min="0" step="any" placeholder="0" aria-label="งาน" {...bind("ngan")} /><label style={{ marginTop: 4 }}>งาน</label></div>
                <div><input type="number" min="0" step="any" placeholder="0" aria-label="ตารางวา" {...bind("wah")} /><label style={{ marginTop: 4 }}>ตร.วา</label></div>
              </div>
              <div className="err">{errors.area}</div>
            </div>

            <div className="field">
              <label htmlFor="p_price">ราคาขาย <span className="req">*</span></label>
              <div className="row2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <input id="p_price" type="number" min="0" step="any" placeholder="0" {...bind("price")} />
                <select aria-label="หน่วยราคา" {...bind("priceUnit")}>
                  {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div className="err">{errors.price}</div>
            </div>

            <LocationField
              id="p_loc"
              label={<>ตำแหน่งที่ดิน <span className="opt">(ไม่บังคับ แต่ช่วยให้ขายง่ายขึ้นมาก)</span></>}
              value={values.location}
              onChange={(text) => setValues((v) => ({ ...v, location: text }))}
              error={errors.location}
              onError={(msg) => setErrors((prev) => ({ ...prev, location: msg }))}
            />

            <div className="field">
              <label htmlFor="p_desc">รายละเอียดเพิ่มเติม <span className="opt">(ไม่บังคับ)</span></label>
              <textarea
                id="p_desc"
                rows={5}
                maxLength={3000}
                placeholder="เช่น หน้ากว้างติดถนน, มีไฟฟ้า/ประปา, ถมแล้วหรือยัง, ใกล้สถานที่สำคัญ, เอกสารสิทธิ์ (โฉนด/น.ส.3)"
                {...bind("description")}
              />
            </div>

            <FileDropZone
              attachments={photos}
              id="p_photos"
              accept="image/*"
              label={<>รูปที่ดิน <span className="req">*</span></>}
              hint={`รูปภาพสูงสุด ${MAX_PHOTOS} รูป รูปแรกจะเป็นรูปหน้าปก`}
            >
              <b>เลือกรูป หรือถ่ายภาพที่ดิน</b>
            </FileDropZone>
            <div className="err">{errors.photos}</div>
          </div>
        </form>
      </div>
    </section>
  );
}
