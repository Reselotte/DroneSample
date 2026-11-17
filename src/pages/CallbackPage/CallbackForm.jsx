import { useState } from "react";
import siteConfig from "../../config/siteConfig";
import useDeedFiles from "../../hooks/useDeedFiles";
import DeedUploader from "./DeedUploader";
import LocationField from "../../components/common/LocationField";

/** ลักษณะงานที่ลูกค้าสนใจ (ช่วยให้ทีมงานเตรียมข้อมูลก่อนโทรกลับ) */
const PURPOSES = [
  "ตรวจสอบที่ดินก่อนซื้อ-ขาย",
  "ทำเกษตร / ขุดสระ / วางระบบน้ำ",
  "จัดสรร / อสังหาริมทรัพย์",
  "สร้างโรงงาน / งานก่อสร้าง",
  "เหมือง / พื้นที่ขนาดใหญ่",
  "อื่น ๆ / ยังไม่แน่ใจ",
];

/** ปุ่มลัดช่วงเวลาที่สะดวกให้ติดต่อกลับ (กดแล้วใส่ในช่อง แก้ต่อเองได้) */
const CONTACT_TIME_CHIPS = ["ได้ทุกเวลา", "ช่วงเช้า 9–12 น.", "ช่วงบ่าย 13–17 น.", "หลังเลิกงาน 17–20 น.", "เสาร์-อาทิตย์"];

const EMPTY_VALUES = {
  name: "", phone: "", lineId: "", contactTime: "", purpose: "",
  province: "", location: "", rai: "", ngan: "", wah: "", deed: "", note: "", consent: false,
};

/**
 * ฟอร์มขอให้ทีมงานติดต่อกลับ: ลูกค้าทิ้งชื่อและเบอร์ไว้ ทีมงานโทรกลับเพื่อสอบถามและนัดบินโดรนสำรวจพื้นที่
 * ตรวจข้อมูล แล้วส่งไปที่ siteConfig.formEndpoint
 */
export default function CallbackForm({ hidden, onSent }) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const deed = useDeedFiles();

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => setValues((v) => ({ ...v, [field]: e.target.value })),
  });

  const submit = async (e) => {
    e.preventDefault();
    const name = values.name.trim();
    const phone = values.phone.trim().replace(/[\s-]/g, "");

    const nextErrors = {
      name: name ? "" : "กรุณาระบุชื่อ",
      phone: /^0\d{8,9}$/.test(phone) ? "" : "หมายเลขโทรศัพท์ไม่ถูกต้อง กรุณากรอกใหม่ เช่น 0812345678",
      consent: values.consent ? "" : "กรุณาให้ความยินยอมก่อนส่งข้อมูล",
      send: "",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const payload = {
      type: "survey_callback",
      name,
      phone,
      lineId: values.lineId.trim(),
      contactTime: values.contactTime.trim() || "ไม่ได้ระบุ",
      purpose: values.purpose,
      province: values.province.trim(),
      location: values.location.trim(),
      rai: values.rai.trim(),
      ngan: values.ngan.trim(),
      wah: values.wah.trim(),
      deed: values.deed.trim(),
      note: values.note.trim(),
      deedFiles: deed.files.map(({ name: n, type, data }) => ({ name: n, type, data })),
      submittedAt: new Date().toISOString(),
    };
    if (JSON.stringify(payload).length > 9e6) {
      deed.setError("ไฟล์แนบมีขนาดรวมใหญ่เกินไป กรุณาลดจำนวนไฟล์");
      return;
    }

    setSending(true);
    try {
      if (siteConfig.formEndpoint) {
        const res = await fetch(siteConfig.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("send failed");
      } else {
        console.warn("ยังไม่ได้ตั้งค่า siteConfig.formEndpoint ข้อมูล:", payload);
      }
      onSent();
    } catch {
      setErrors((prev) => ({ ...prev, send: "ส่งข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผ่าน LINE" }));
    }
    setSending(false);
  };

  return (
    <form className="card" id="callbackForm" noValidate hidden={hidden} onSubmit={submit}>
      <div className="row2 f-full">
        <div className="field">
          <label htmlFor="f_name">ชื่อ <span className="req">*</span></label>
          <input id="f_name" autoComplete="name" {...bind("name")} />
          <div className="err" id="e_name">{errors.name}</div>
        </div>
        <div className="field">
          <label htmlFor="f_phone">หมายเลขโทรศัพท์ <span className="req">*</span></label>
          <input id="f_phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" {...bind("phone")} />
          <div className="err" id="e_phone">{errors.phone}</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f_line">LINE ID <span className="opt">(ไม่บังคับ)</span></label>
        <input id="f_line" {...bind("lineId")} />
      </div>

      <div className="field">
        <label htmlFor="f_prov">จังหวัด / อำเภอ ของพื้นที่ <span className="opt">(ไม่บังคับ)</span></label>
        <input id="f_prov" {...bind("province")} />
      </div>

      <div className="field f-full">
        <label htmlFor="f_time">สะดวกให้ติดต่อกลับเวลาไหน <span className="opt">(พิมพ์เองหรือกดเลือก)</span></label>
        <input id="f_time" placeholder="เช่น วันธรรมดาหลัง 17:00, เสาร์เช้า" maxLength={120} {...bind("contactTime")} />
        <div className="time-chips" role="group" aria-label="ช่วงเวลาที่ใช้บ่อย">
          {CONTACT_TIME_CHIPS.map((t) => (
            <button
              key={t}
              type="button"
              className={values.contactTime === t ? "on" : undefined}
              aria-pressed={values.contactTime === t}
              onClick={() => setValues((v) => ({ ...v, contactTime: v.contactTime === t ? "" : t }))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field f-full">
        <label htmlFor="f_purpose">สนใจสำรวจพื้นที่เพื่อ <span className="opt">(ไม่บังคับ)</span></label>
        <select id="f_purpose" {...bind("purpose")}>
          <option value="">— เลือก —</option>
          {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <LocationField
        id="f_loc"
        className="f-full"
        label={<>ตำแหน่งที่ดิน <span className="opt">(ไม่บังคับ)</span></>}
        value={values.location}
        onChange={(text) => setValues((v) => ({ ...v, location: text }))}
        error={errors.location}
        onError={(msg) => setErrors((prev) => ({ ...prev, location: msg }))}
      />

      <div className="field">
        <label>ขนาดพื้นที่ <span className="opt">(โปรดระบุเท่าที่ทราบ)</span></label>
        <div className="row3">
          <div><input id="s_rai" type="number" min="0" step="any" placeholder="0" aria-label="ไร่" {...bind("rai")} /><label style={{ marginTop: 4 }}>ไร่</label></div>
          <div><input id="s_ngan" type="number" min="0" step="any" placeholder="0" aria-label="งาน" {...bind("ngan")} /><label style={{ marginTop: 4 }}>งาน</label></div>
          <div><input id="s_wah" type="number" min="0" step="any" placeholder="0" aria-label="ตารางวา" {...bind("wah")} /><label style={{ marginTop: 4 }}>ตร.วา</label></div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f_deed">เลขโฉนด <span className="opt">(ไม่บังคับ)</span></label>
        <input id="f_deed" placeholder="เช่น 12345" {...bind("deed")} />
      </div>

      <div className="f-full">
        <DeedUploader deed={deed} />
      </div>

      <div className="field f-full">
        <label htmlFor="f_note">รายละเอียดเพิ่มเติม / คำถาม <span className="opt">(ไม่บังคับ)</span></label>
        <textarea id="f_note" rows={3} placeholder="เช่น อยากรู้ว่าต้องถมดินเท่าไร, อยากนัดบินช่วงต้นเดือนหน้า" {...bind("note")} />
      </div>

      <div className="field f-full">
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--tx)" }}>
          <input
            type="checkbox"
            id="f_ok"
            style={{ width: "auto", marginTop: 5 }}
            checked={values.consent}
            onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
          />
          <span>ยินยอมให้ใช้ข้อมูลนี้เพื่อให้ทีมงานติดต่อกลับ <span className="req">*</span></span>
        </label>
        <div className="err" id="e_ok">{errors.consent}</div>
      </div>

      <button className="btn btn-line f-full" type="submit" id="sendBtn" disabled={sending} style={{ width: "100%", background: "var(--g)" }}>
        {sending ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล ให้ทีมงานติดต่อกลับ"}
      </button>
      <div className="err f-full" id="e_send">{errors.send}</div>
    </form>
  );
}
