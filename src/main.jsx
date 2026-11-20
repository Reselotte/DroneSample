import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./hooks/useToast";
import { ConfirmProvider } from "./hooks/useConfirm";
import "./styles/index.css";

// กลับจาก Google / LINE แบบไม่สำเร็จ: Supabase พามาที่ Site URL พร้อม ?error=... (บางทีไม่ใช่หน้า /login)
// → พาไปหน้าเข้าสู่ระบบ เพื่อแสดงข้อความแจ้งผู้ใช้
if (/[?&]error_description=/.test(window.location.search) && !/^\/login\/?$/.test(window.location.pathname)) {
  window.history.replaceState(null, "", `/login${window.location.search}`);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>
);
