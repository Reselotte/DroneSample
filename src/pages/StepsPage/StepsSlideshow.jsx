import { useEffect, useRef, useState } from "react";
import processSteps from "../../data/processSteps";
import { ChatStepSlide, SurveyVideoStepSlide, ResultStepSlide } from "./StepSlides";

const SLIDE_COMPONENTS = [ChatStepSlide, SurveyVideoStepSlide, ResultStepSlide];
const AUTO_ADVANCE_MS = 6000;

/**
 * สไลด์โชว์ 3 ขั้นตอน
 * - เลื่อนอัตโนมัติทุก 6 วินาที (แถบความคืบหน้าด้านบน)
 * - กดจุด/ปุ่มลูกศร หรือปัดซ้าย-ขวาเพื่อเปลี่ยนสไลด์
 */
export default function StepsSlideshow() {
  const [index, setIndex] = useState(0);
  const swipeStartX = useRef(null);
  const count = processSteps.length;

  const goTo = (i) => setIndex((i + count) % count);

  // ตั้งเวลาเลื่อนอัตโนมัติใหม่ทุกครั้งที่สไลด์เปลี่ยน
  useEffect(() => {
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, count]);

  const onPointerDown = (e) => { swipeStartX.current = e.clientX; };
  const onPointerUp = (e) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className="show"
      id="show"
      role="region"
      aria-roledescription="carousel"
      aria-label="ขั้นตอนการใช้งาน"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="bar" id="bar" key={index} />
      {processSteps.map((step, i) => {
        const Slide = SLIDE_COMPONENTS[i];
        return <Slide key={step.no} step={step} active={i === index} />;
      })}
      <button type="button" className="arw p" aria-label="ก่อนหน้า" onClick={() => goTo(index - 1)}>&#8249;</button>
      <button type="button" className="arw n" aria-label="ถัดไป" onClick={() => goTo(index + 1)}>&#8250;</button>
      <div className="dots2">
        {processSteps.map((step, i) => (
          <button
            key={step.no}
            type="button"
            className={i === index ? "on" : undefined}
            aria-label={step.tabLabel}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
