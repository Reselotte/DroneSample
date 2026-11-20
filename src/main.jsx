import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./hooks/useToast";
import "./styles/index.css";

// กลับจาก Google / LINE แบบไม่สำเร็จ: Supabase พามาที่ Site URL พร้อม ?error=... (บางทีไม่มี #/login)
// → พาไปหน้าเข้าสู่ระบบ เพื่อแสดงข้อความแจ้งผู้ใช้
if (/[?&]error_description=/.test(window.location.search) && !window.location.hash.startsWith("#/login")) {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/login`);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
