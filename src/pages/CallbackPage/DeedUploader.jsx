import FileDropZone from "../../components/common/FileDropZone";

/** ช่องแนบสำเนาโฉนด (ใช้ในฟอร์มให้ทีมงานติดต่อกลับ) */
export default function DeedUploader({ deed }) {
  return (
    <FileDropZone
      attachments={deed}
      id="f_files"
      label={<>แนบสำเนาโฉนดที่ดิน <span className="opt">(ไม่บังคับ)</span></>}
      hint="รองรับรูปภาพและ PDF สูงสุด 5 ไฟล์ (PDF ไม่เกิน 4 MB ต่อไฟล์)"
      note="ใช้เพื่อตรวจสอบข้อมูลที่ดินเท่านั้น แนะนำให้ปิดบังเลขบัตรประชาชนก่อนแนบ"
    >
      <b>เลือกไฟล์ หรือถ่ายภาพสำเนาโฉนด</b>
    </FileDropZone>
  );
}
