import { useEffect } from "react";
import { WarningIcon } from "../../components/common/Icons";

/** ป๊อปอัปเตือนว่า "ไม่ใช่ราคาซื้อขายจริง" ก่อนส่งตัวเลขเข้า LINE */
export default function PriceDisclaimerDialog({ onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      id="dlg"
      className="show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlgT"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="box">
        <div className="ic"><WarningIcon /></div>
        <h3 id="dlgT">โปรดทราบก่อนส่ง</h3>
        <p>
          ตัวเลขนี้คำนวณจากที่ท่านกรอกเท่านั้น<br />
          <span style={{ color: "var(--c-red-ink)" }}>ไม่ใช่ราคาซื้อขายจริงของที่ดิน</span>
        </p>
        <div className="btns">
          <button type="button" className="btn btn-line" id="dlgOk" autoFocus onClick={onConfirm}>รับทราบ และส่งทาง LINE</button>
          <button type="button" className="btn btn-ghost" id="dlgNo" onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}
