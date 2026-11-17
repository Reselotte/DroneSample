import useFileAttachments from "./useFileAttachments";

/** จัดการไฟล์สำเนาโฉนดที่ผู้ใช้แนบ (รูปภาพหรือ PDF สูงสุด 5 ไฟล์) */
export default function useDeedFiles() {
  return useFileAttachments({ maxFiles: 5, allowPdf: true });
}
