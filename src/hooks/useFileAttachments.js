import { useState } from "react";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1800;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** ย่อรูปให้ด้านยาวไม่เกิน 1800px และแปลงเป็น JPEG เพื่อให้ไฟล์เล็กลงก่อนส่ง */
const shrinkImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    img.src = url;
  });

/**
 * จัดการไฟล์ที่ผู้ใช้แนบ: รูปภาพ (ย่อเป็น JPEG ให้อัตโนมัติ) และ PDF (ถ้า allowPdf)
 * คืน { files, error, setError, addFiles, removeFile }  แต่ละไฟล์ = { name, type, data (data URL) }
 */
export default function useFileAttachments({ maxFiles = 5, allowPdf = true } = {}) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const addFiles = async (fileList) => {
    setError("");
    const next = [...files];
    const rejected = [];
    let limitMessage = "";

    for (const file of fileList) {
      if (next.length >= maxFiles) {
        limitMessage = `แนบได้สูงสุด ${maxFiles} ไฟล์`;
        break;
      }
      try {
        if (allowPdf && file.type === "application/pdf") {
          if (file.size > MAX_PDF_BYTES) {
            rejected.push(`${file.name} (ขนาดเกิน 4 MB)`);
            continue;
          }
          next.push({ name: file.name, type: file.type, data: await readAsDataUrl(file) });
        } else if (file.type.startsWith("image/")) {
          next.push({ name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: await shrinkImage(file) });
        } else {
          rejected.push(`${file.name} (${allowPdf ? "รองรับเฉพาะรูปภาพและ PDF" : "รองรับเฉพาะรูปภาพ"})`);
        }
      } catch {
        rejected.push(`${file.name} (ไม่สามารถอ่านไฟล์ได้)`);
      }
    }

    setError(rejected.length ? "ไม่สามารถแนบ: " + rejected.join(", ") : limitMessage);
    setFiles(next);
  };

  const removeFile = (index) => setFiles((list) => list.filter((_, i) => i !== index));

  return { files, error, setError, addFiles, removeFile };
}
