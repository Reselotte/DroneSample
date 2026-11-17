import { forwardRef } from "react";
// ย่อจาก CenReview1.mp4 (56 MB) ด้วย ffmpeg: 1280px, ไม่มีเสียง, crf 28, faststart → ~3.6 MB
import heroVideo from "../../assets/media/hero-bg.mp4";
// เฟรมแรกของวิดีโอ แสดงทันทีระหว่างรอวิดีโอโหลด
import heroPoster from "../../assets/media/hero-poster.jpg";

/** วิดีโอพื้นหลังแบบวนซ้ำไม่มีเสียง (ใช้ไฟล์เดียวกันทุกที่ จึงโหลดครั้งเดียว) */
const BackgroundVideo = forwardRef(function BackgroundVideo({ className, preload = "metadata", poster = heroPoster }, ref) {
  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      poster={poster}
      src={heroVideo}
      aria-hidden="true"
    />
  );
});

export default BackgroundVideo;
