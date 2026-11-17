import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" ทำให้ไฟล์ที่ build แล้วเปิดจากโฟลเดอร์ย่อยหรือโฮสต์ฟรีได้ทันที
export default defineConfig({
  base: "./",
  plugins: [react()],
});
