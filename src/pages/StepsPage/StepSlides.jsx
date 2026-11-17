import BackgroundVideo from "../../components/common/BackgroundVideo";
import ContourMapSvg from "../../components/common/ContourMapSvg";

/** ข้อความหัวข้อของแต่ละสไลด์: เลขขั้น + ชื่อขั้น + คำอธิบาย (มีคำที่เน้นสี) */
function StepText({ step }) {
  return (
    <div className="tx1">
      <div className="big">{step.no}</div>
      <h3>{step.title}</h3>
      <p>{step.before}<span className="hl">{step.highlight}</span>{step.after}</p>
    </div>
  );
}

/** ขั้น 1: จอ LINE จำลอง กำลังส่งพิกัดที่ดิน */
export function ChatStepSlide({ step, active }) {
  return (
    <div className={`sl${active ? " on" : ""}`}>
      <div className="wrap sg">
        <StepText step={step} />
        <div className="phone">
          <div className="top">LINE OA</div>
          <div className="bub me b1">ส่งพิกัดที่ดินให้ครับ</div>
          <div className="bub bot b2">รับทราบครับ</div>
          <div className="bub bot b3">ทีมงานจะจัดทำ Contour ให้ครับ</div>
        </div>
      </div>
    </div>
  );
}

/** ขั้น 2: วิดีโอการสำรวจภาคสนาม */
export function SurveyVideoStepSlide({ step, active }) {
  return (
    <div className={`sl${active ? " on" : ""}`}>
      <div className="wrap sg">
        <StepText step={step} />
        <div className="vf"><BackgroundVideo className="rv" /></div>
      </div>
    </div>
  );
}

/** ขั้น 3: จอ LINE จำลอง แสดงแผนที่ Contour ที่เสร็จแล้ว */
export function ResultStepSlide({ step, active }) {
  return (
    <div className={`sl${active ? " on" : ""}`}>
      <div className="wrap sg">
        <StepText step={step} />
        <div className="phone">
          <div className="top">LINE OA</div>
          <div className="mp" id="stepMap"><ContourMapSvg mode="contour" parcel={1} cover /></div>
          <div className="bub bot b1">จัดทำ Contour เสร็จสมบูรณ์แล้วครับ</div>
        </div>
      </div>
    </div>
  );
}
