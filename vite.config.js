import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "/" — ที่อยู่หน้าเป็นแบบ /lands/12 (ไม่มี #) ไฟล์ของเว็บต้องโหลดจาก root เสมอ
// (ถ้าใช้ "./" หน้า /lands/12 จะไปหาไฟล์ที่ /lands/assets/... แล้วหน้าขาว)
export default defineConfig({
  base: "/",
  plugins: [react()],
});
