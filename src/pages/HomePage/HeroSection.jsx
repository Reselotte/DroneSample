import { useRef, useState } from "react";
import BackgroundVideo from "../../components/common/BackgroundVideo";
import LineLink from "../../components/common/LineLink";
import Term from "../../components/common/Term";
import { HERO_POINTS } from "../../data/heroHighlights";

/** ส่วนบนสุดของหน้าแรก: หัวข้อใหญ่ + วิดีโอพื้นหลัง + ปุ่มแอด LINE */
export default function HeroSection() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <section className="hero" data-page="home">
      <div className="bg">
        <BackgroundVideo ref={videoRef} preload="auto" />
      </div>
      <button
        type="button"
        className="vbtn"
        id="vBtn"
        aria-label={playing ? "หยุดวิดีโอพื้นหลัง" : "เล่นวิดีโอพื้นหลัง"}
        onClick={togglePlay}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="wrap">
        <h1>
          ตรวจสอบที่ดินให้แน่ชัด<br />ก่อนตัดสินใจซื้อ-ขาย<br />
          <span>ด้วยแผนที่ <Term id="contour">Contour</Term></span>
        </h1>
        <p className="lead">
          ทราบสภาพพื้นที่จริงก่อนตัดสินใจลงทุน<br />
          ทั้ง<span className="hl" style={{ whiteSpace: "nowrap" }}>ระดับความสูงต่ำ</span>{" "}
          <span className="hl" style={{ whiteSpace: "nowrap" }}><Term id="slope">ความลาดชัน</Term></span> และ
          <span className="hl" style={{ whiteSpace: "nowrap" }}>โอกาสเกิดน้ำท่วมขัง</span>
        </p>
        <div className="pts">
          {HERO_POINTS.map((text) => (
            <div key={text}><b>{text}</b></div>
          ))}
        </div>
        <div className="cta">
          <LineLink variant="btn-w">ขอรับ Contour ฟรีผ่าน LINE</LineLink>
          <a className="btn btn-k" href="#/works">ชมตัวอย่างผลงาน</a>
        </div>
      </div>
    </section>
  );
}
