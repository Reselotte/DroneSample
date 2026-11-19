import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FileDropZone from "../../components/common/FileDropZone";
import PhotoSlots, { missingRequired, orderedPhotos } from "./PhotoSlots";
import LineLink from "../../components/common/LineLink";
import useFileAttachments from "../../hooks/useFileAttachments";
import useThaiAddress from "../../hooks/useThaiAddress";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { ListingLimitError, submitListing } from "../../lib/listingsApi";
import { LAND_TYPES, PRICE_UNITS, PROVINCES } from "../../data/landListingOptions";
import { districtText, isInThailand, listingCode, parseLatLng } from "../../utils/listingFormat";
import SetupNotice from "../LandsPage/SetupNotice";
import { CheckCircleIcon, LockIcon } from "../../components/common/Icons";
import LocationField from "../../components/common/LocationField";
import { PHONE_ERROR, PHONE_PLACEHOLDER, formatThaiPhone, isIntlFormat, isThaiPhone, normalizeThaiPhone } from "../../utils/thaiPhone";
import PriceSummaryPanel, { areaText, calcPrice } from "./PriceSummaryPanel";

// ── กันสแปม (ฝั่งหน้าเว็บ) ──
// ส่งเร็วกว่านี้หลังเปิดหน้า = ไม่ใช่คนกรอก (ฟอร์มนี้ต้องแนบรูป คนจริงใช้เวลาเป็นนาที)
const MIN_FILL_MS = 6000;
// ข้อความเมื่อเกินโควตาจากฐานข้อมูล (supabase/schema.sql)
const LIMIT_MESSAGES = {
  RATE_PHONE: "เบอร์โทรนี้ลงประกาศครบ 3 รายการใน 24 ชั่วโมงแล้ว กรุณาลองใหม่พรุ่งนี้ หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
  RATE_GLOBAL: "ขณะนี้มีประกาศรอตรวจสอบจำนวนมาก กรุณาลองใหม่ภายหลัง หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
  RATE_UPLOAD: "ขณะนี้มีการอัปโหลดรูปจำนวนมาก กรุณาลองใหม่ในอีกสักครู่ หรือส่งข้อมูลที่ดินให้ทีมงานทาง LINE",
};

/** ขั้นตอนการกรอก (กด "ถัดไป" ตรวจเฉพาะช่องของขั้นนั้น) */
const STEPS = [
  { n: 1, title: "ข้อมูลผู้ขาย" },
  { n: 2, title: "ข้อมูลที่ดิน" },
  { n: 3, title: "รูปและยืนยัน" },
];
const STEP_FIELDS = {
  1: ["sellerName", "phone"],
  2: ["title", "landType", "province", "district", "subdistrict", "area", "price", "location"],
  3: ["photos", "consent"],
};
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.4,0,.2,1)";

/** ย้าย/ย่อจากกรอบ a ไปกรอบ b (มุมซ้ายบนเป็นจุดอ้างอิง) */
const toRect = (a, b) => `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width},${b.height / a.height})`;

/** การ์ดขั้นเดิม "ย่อตัวลอยเข้า" กล่องเล็กของมันทางซ้าย (ใช้สำเนาการ์ดลอยทับ แล้วลบทิ้ง) */
function flyIntoBox(card, box) {
  if (!card || !box || reduceMotion() || !card.animate) return;
  const a = card.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.remove("is-fwd", "is-back", "is-grow");
  ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    margin: "0", zIndex: "30", pointerEvents: "none", transformOrigin: "0 0", overflow: "hidden",
  });
  document.body.appendChild(ghost);
  ghost.animate(
    [{ transform: "none", opacity: 1, borderRadius: "20px" }, { transform: toRect(a, b), opacity: 0.15, borderRadius: "40px" }],
    { duration: 480, easing: EASE },
  ).onfinish = () => ghost.remove();
}

/** ช่องที่ใช้ข้อความเตือนร่วมกัน (ขนาด 3 ช่อง → "area", หน่วยราคา → "price") */
const ERROR_KEY = { rai: "area", ngan: "area", wah: "area", priceUnit: "price" };

const pickErrors = (errors, n) => Object.fromEntries(STEP_FIELDS[n].filter((k) => errors[k]).map((k) => [k, errors[k]]));

const EMPTY_VALUES = {
  title: "", landType: "", province: "", subdistrict: "", district: "",
  rai: "", ngan: "", wah: "", price: "", priceUnit: "total",
  location: "", description: "",
  sellerName: "", phone: "", lineId: "", deedNo: "", consent: false,
  website: "", // ช่องดักบอท: ซ่อนจากคน บอทที่กรอกทุกช่องจะใส่ค่าลงมา
};

/** ตรวจค่าในฟอร์ม คืน { errors, listing } (listing = ค่าที่พร้อมส่ง) */
function validate(values, photoSlots) {
  const errors = {};
  const num = (v) => (v === "" ? 0 : Number(v));
  const rai = num(values.rai);
  const ngan = num(values.ngan);
  const wah = num(values.wah);
  const price = Number(values.price);
  const phone = normalizeThaiPhone(values.phone);
  const title = values.title.trim();
  let coords = null;

  if (title.length < 5) errors.title = "กรุณาใส่หัวข้อประกาศอย่างน้อย 5 ตัวอักษร";
  if (!values.landType) errors.landType = "กรุณาเลือกประเภทที่ดิน";
  if (!values.province) errors.province = "กรุณาเลือกจังหวัด";
  const bkk = values.province === "กรุงเทพมหานคร";
  if (values.province && !values.district) errors.district = bkk ? "กรุณาเลือกเขต" : "กรุณาเลือกอำเภอ";
  if (values.province && !values.subdistrict) errors.subdistrict = bkk ? "กรุณาเลือกแขวง" : "กรุณาเลือกตำบล";
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
  const missing = missingRequired(photoSlots);
  if (missing.length) errors.photos = `กรุณาใส่รูป${missing.map((m) => `"${m.label}"`).join(", ")}`;
  if (!values.sellerName.trim()) errors.sellerName = "กรุณาระบุชื่อ";
  if (!isThaiPhone(phone)) errors.phone = PHONE_ERROR;
  if (!values.consent) errors.consent = "กรุณายืนยันก่อนส่งประกาศ";

  const listing = {
    title,
    landType: values.landType,
    province: values.province,
    district: districtText(values),
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
  const [photoSlots, setPhotoSlots] = useState({}); // หัวข้อรูป → รูป (หัวข้อละ 1 รูป)
  const [coverKey, setCoverKey] = useState("overview");
  const photoCount = Object.keys(photoSlots).length;
  const address = useThaiAddress();
  const deed = useFileAttachments({ maxFiles: 5, allowPdf: true });
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1); // ขั้นไกลสุดที่ไปถึงแล้ว (จิ้มกลับไปได้)
  const [dir, setDir] = useState(1); // ทิศทางเลื่อน: 1 = ถัดไป, -1 = ย้อนกลับ
  const [justDone, setJustDone] = useState(null); // ขั้นที่เพิ่งเสร็จ (กล่องเล็กเด้งให้เห็น)
  const stageRef = useRef(null);
  const moved = useRef(false);
  const railRefs = useRef({}); // เลขขั้น → กล่องเล็กทางซ้าย (จุดหมายของแอนิเมชัน)
  const growFrom = useRef(null); // ขั้นที่ต้อง "ขยายออกจากกล่องเล็ก" หลังเปลี่ยนขั้น

  // จิ้มกล่องเล็ก/ย้อนกลับ: การ์ดขั้นใหม่ขยายออกมาจากกล่องเล็กของมัน
  useLayoutEffect(() => {
    const n = growFrom.current;
    growFrom.current = null;
    const card = stageRef.current;
    const box = railRefs.current[n];
    if (!n || !card || !box || reduceMotion() || !card.animate) return;
    const a = card.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    card.animate(
      [{ transform: toRect(a, b), opacity: 0.2, transformOrigin: "0 0" }, { transform: "none", opacity: 1, transformOrigin: "0 0" }],
      { duration: 480, easing: EASE },
    );
  }, [step]);

  // เปลี่ยนขั้นแล้ว: เลื่อนจอขึ้นมาให้เห็นหัวขั้น (เฉพาะเมื่อหัวขั้นอยู่นอกจอ)
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    const el = stageRef.current;
    if (el && el.getBoundingClientRect().top < 70) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
    }
  }, [step]);

  const scrollToError = () =>
    requestAnimationFrame(() => document.querySelector(".post .err:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  const goTo = (n) => {
    if (n === step || n < 1 || n > maxStep) return;
    flyIntoBox(stageRef.current, railRefs.current[step]);
    growFrom.current = n;
    setDir(n > step ? 1 : -1);
    setErrors({});
    setStep(n);
  };

  const goNext = () => {
    const stepErrors = pickErrors(validate(values, photoSlots).errors, step);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) { scrollToError(); return; }
    flyIntoBox(stageRef.current, railRefs.current[step]);
    setDir(1);
    setJustDone(step);
    setStep(step + 1);
    setMaxStep((m) => Math.max(m, step + 1));
  };

  // แก้ช่องไหน → เอาข้อความเตือน (และกรอบแดง) ของช่องนั้นออกทันที
  const clearError = (key) => setErrors((er) => (er[key] ? { ...er, [key]: undefined } : er));
  // เปลี่ยนจังหวัด → ล้างอำเภอ/ตำบล, เปลี่ยนอำเภอ → ล้างตำบล (กันเลือกไม่ตรงกัน)
  const RESETS = { province: { district: "", subdistrict: "" }, district: { subdistrict: "" } };
  const bind = (field) => ({
    value: values[field],
    onChange: (e) => {
      setValues((v) => ({ ...v, [field]: e.target.value, ...RESETS[field] }));
      clearError(ERROR_KEY[field] || field);
    },
  });

  // แนบรูปแล้ว → เอาเตือน "กรุณาแนบรูป" ออก
  useEffect(() => { if (!missingRequired(photoSlots).length) clearError("photos"); }, [photoSlots]);

  const submit = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, listing } = validate(values, photoSlots);
    if (Object.values(nextErrors).some(Boolean)) {
      // พาไปขั้นแรกที่ยังผิด แล้วเลื่อนไปที่ช่องนั้น
      const bad = STEPS.find((s) => Object.keys(pickErrors(nextErrors, s.n)).length);
      if (bad && bad.n !== step) {
        flyIntoBox(stageRef.current, railRefs.current[step]);
        growFrom.current = bad.n;
        setDir(-1);
        setStep(bad.n);
      }
      setErrors(pickErrors(nextErrors, bad?.n ?? step));
      scrollToError();
      return;
    }
    setErrors({});

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
      const id = await submitListing(listing, orderedPhotos(photoSlots, coverKey), deed.files);
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

  const r = calcPrice({ rai: values.rai, ngan: values.ngan, wah: values.wah, price: values.price, unit: values.priceUnit });
  const stepSummary = {
    1: [values.sellerName.trim(), values.phone.trim()].filter(Boolean).join(" · ") || "ยังไม่ได้กรอก",
    2: values.title.trim()
      ? `${values.title.trim()}${r.areaWah ? ` · ${areaText(r.areaWah)}` : ""}${values.province ? ` · ${values.province}` : ""}`
      : "ยังไม่ได้กรอก",
    3: photoCount ? `แนบรูปแล้ว ${photoCount} รูป` : "ยังไม่ได้แนบรูป",
  };
  const next = STEPS[step]; // ขั้นถัดไป (undefined = ขั้นสุดท้าย)
  const bkk = values.province === "กรุงเทพมหานคร";
  const districts = Object.keys(address?.[values.province] || {});
  const subdistricts = address?.[values.province]?.[values.district] || [];

  return (
    <section className="alt post" data-page="post">
      <div className="wrap">
        <h2>ลงประกาศขายที่ดินฟรี</h2>
        <p className="sub">กรอกข้อมูลทีละขั้น <span className="hl">ระบบคำนวณราคาให้ทันที</span> ทีมงานตรวจสอบก่อนเผยแพร่ ข้อมูลติดต่อของท่านไม่แสดงบนเว็บ</p>

        <form className="post-form post-steps" noValidate onSubmit={submit}>
          {/* ช่องดักบอท: คนมองไม่เห็นและกด Tab ข้าม — อย่าใช้ display:none (บอทบางตัวข้ามช่องแบบนั้น) */}
          <div className="post-hp" aria-hidden="true">
            <label htmlFor="p_website">เว็บไซต์ (ไม่ต้องกรอก)</label>
            <input id="p_website" name="website" type="text" tabIndex={-1} autoComplete="off" {...bind("website")} />
          </div>

          {/* ซ้าย: ทุกขั้นเป็นกล่องเล็ก ขั้นที่เสร็จแล้วสรุปข้อมูลไว้ จิ้มเพื่อกลับไปแก้ */}
          <ol className="post-rail" aria-label="ขั้นตอนการลงประกาศ">
            {STEPS.map((s) => {
              const current = s.n === step;
              const done = s.n < maxStep && !current;
              const reachable = s.n <= maxStep;
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    className={`post-mini${current ? " is-current" : ""}${done ? " is-done" : ""}${s.n === justDone ? " is-new" : ""}`}
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    onClick={() => goTo(s.n)}
                    ref={(el) => { railRefs.current[s.n] = el; }}
                  >
                    <span className="post-mini-no" aria-hidden="true">{done ? "✓" : s.n}</span>
                    <span className="post-mini-tx">
                      <b>{s.title}</b>
                      <small>{current ? "กำลังกรอก" : stepSummary[s.n]}</small>
                    </span>
                    {done && <span className="post-mini-edit">แก้ไข</span>}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* กลาง: ขั้นที่กำลังกรอก (เลื่อนเข้ามาจากขวาเมื่อกดถัดไป / จากซ้ายเมื่อย้อนกลับ) */}
          <div className="post-stage">
            <div key={step} className={`card post-block post-step ${growFrom.current ? "is-grow" : dir > 0 ? "is-fwd" : "is-back"}`} ref={stageRef}>
              <div className="post-step-head">
                {step > 1 && (
                  <button type="button" className="post-back" onClick={() => goTo(step - 1)} aria-label="ย้อนกลับขั้นก่อนหน้า">‹</button>
                )}
                <h3>{step}. {STEPS[step - 1].title}</h3>
                <span className="post-step-count">ขั้นที่ {step} จาก {STEPS.length}</span>
              </div>

              {step === 1 && (
                <>
                  <p className="post-private"><LockIcon /> ข้อมูลส่วนนี้ทีมงานเห็นเท่านั้น ไม่แสดงบนเว็บ</p>
                  <div className="row2">
                    <div className="field">
                      <label htmlFor="p_name">ชื่อ <span className="req">*</span></label>
                      <input id="p_name" autoComplete="name" maxLength={100} {...bind("sellerName")} />
                      <div className="err">{errors.sellerName}</div>
                    </div>
                    <div className="field">
                      <label htmlFor="p_phone">หมายเลขโทรศัพท์ <span className="req">*</span></label>
                      <input id="p_phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder={PHONE_PLACEHOLDER} {...bind("phone")} />
                      {isIntlFormat(values.phone) && isThaiPhone(values.phone) && <small className="phone-hint">✓ บันทึกเป็น {formatThaiPhone(values.phone)}</small>}

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
                </>
              )}

              {step === 2 && (
                <>
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
                  <div className="row2">
                    <div className="field">
                      <label htmlFor="p_dist">{bkk ? "เขต" : "อำเภอ"} <span className="req">*</span></label>
                      <select id="p_dist" disabled={!values.province || !address} {...bind("district")}>
                        <option value="">{!values.province ? "— เลือกจังหวัดก่อน —" : !address ? "กำลังโหลด…" : "— เลือก —"}</option>
                        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <div className="err">{errors.district}</div>
                    </div>
                    <div className="field">
                      <label htmlFor="p_sub">{bkk ? "แขวง" : "ตำบล"} <span className="req">*</span></label>
                      <select id="p_sub" disabled={!values.district} {...bind("subdistrict")}>
                        <option value="">{values.district ? "— เลือก —" : `— เลือก${bkk ? "เขต" : "อำเภอ"}ก่อน —`}</option>
                        {subdistricts.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="err">{errors.subdistrict}</div>
                    </div>
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
                    onChange={(text) => { setValues((v) => ({ ...v, location: text })); clearError("location"); }}
                    error={errors.location}
                    onError={(msg) => setErrors((prev) => ({ ...prev, location: msg }))}
                  />
                  <div className="field">
                    <label htmlFor="p_desc">รายละเอียดเพิ่มเติม / จุดขาย <span className="opt">(ไม่บังคับ)</span></label>
                    <textarea
                      id="p_desc"
                      rows={4}
                      maxLength={3000}
                      placeholder="จุดขายของที่ดิน เช่น หน้ากว้างติดถนน, ใกล้รถไฟฟ้า/ตลาด/โรงเรียน, มีไฟฟ้า/ประปา, ถมแล้ว, น้ำไม่ท่วม, เอกสารสิทธิ์ (โฉนด/น.ส.3)"
                      {...bind("description")}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="field">
                    <label className="pslots-label">รูปที่ดิน <span className="opt">(<span className="req">*</span> = ต้องใส่)</span></label>
                    <p className="pslots-intro">แตะช่องเพื่อดูตัวอย่างและเพิ่มรูป · กด <b>☆</b> เลือกรูปหน้าปก</p>
                    <PhotoSlots slots={photoSlots} onChange={setPhotoSlots} coverKey={coverKey} onCover={setCoverKey} />
                  </div>
                  <div className="err">{errors.photos}</div>
                  <div className="field post-consent">
                    <label>
                      <input
                        type="checkbox"
                        checked={values.consent}
                        onChange={(e) => { setValues((v) => ({ ...v, consent: e.target.checked })); clearError("consent"); }}
                      />
                      <span>
                        ข้าพเจ้าเป็นเจ้าของที่ดินหรือได้รับมอบอำนาจให้ขาย และยินยอมให้ทีมงานใช้ข้อมูลนี้เพื่อตรวจสอบและติดต่อกลับ <span className="req">*</span>
                      </span>
                    </label>
                    <div className="err">{errors.consent}</div>
                  </div>
                </>
              )}

              <div className="post-nav">
                {step > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>‹ ย้อนกลับ</button>
                )}
                {next ? (
                  <button type="button" className="btn post-next" onClick={goNext}>ถัดไป: {next.title} ›</button>
                ) : (
                  <button className="btn btn-line post-next" type="submit" disabled={sending}>
                    {sending ? "กำลังส่งประกาศ…" : "ส่งประกาศให้ทีมงานตรวจสอบ"}
                  </button>
                )}
              </div>
              <div className="err">{errors.send}</div>
            </div>
          </div>

          {/* ขวา: คำนวณราคาจากข้อมูลที่กรอก (ไม่ต้องกรอกซ้ำ) */}
          <aside className="post-calc" aria-label="คำนวณราคา">
            <PriceSummaryPanel values={values} onEdit={step !== 2 && maxStep >= 2 ? () => goTo(2) : undefined} />
          </aside>
        </form>
      </div>
    </section>
  );
}
