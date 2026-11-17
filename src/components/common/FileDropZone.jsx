import { useState } from "react";

/**
 * ช่องแนบไฟล์: กดเลือกไฟล์/ถ่ายรูป หรือลากมาวางได้ พร้อมรูปตัวอย่างและปุ่มลบ
 *  attachments = ค่าจาก useFileAttachments()
 *  id, label, hint, note, accept = ข้อความ/การตั้งค่าของช่องนี้
 */
export default function FileDropZone({ attachments, id, label, hint, note, accept = "image/*,application/pdf", children }) {
  const { files, error, addFiles, removeFile } = attachments;
  const [dragging, setDragging] = useState(false);

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.getElementById(id).click();
    }
  };
  const stop = (e) => e.preventDefault();

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={async (e) => {
          await addFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
      <label
        className={`upz${dragging ? " drag" : ""}`}
        htmlFor={id}
        tabIndex={0}
        role="button"
        onKeyDown={onKeyDown}
        onDragEnter={(e) => { stop(e); setDragging(true); }}
        onDragOver={(e) => { stop(e); setDragging(true); }}
        onDragLeave={(e) => { stop(e); setDragging(false); }}
        onDrop={(e) => { stop(e); setDragging(false); addFiles([...e.dataTransfer.files]); }}
      >
        {children}
        <span>{hint}</span>
      </label>
      <div className="uplist" aria-live="polite">
        {files.map((file, i) => (
          <div className="upi" key={`${file.name}-${i}`}>
            {file.type === "application/pdf" ? (
              <div className="pdf">PDF<small>{file.name}</small></div>
            ) : (
              <img src={file.data} alt={`ไฟล์แนบ ${i + 1}`} />
            )}
            <button type="button" aria-label={`ลบไฟล์ ${file.name}`} onClick={() => removeFile(i)}>×</button>
          </div>
        ))}
      </div>
      {note && <div className="note" style={{ marginTop: 6 }}>{note}</div>}
      <div className="err" id={`${id}_err`}>{error}</div>
    </div>
  );
}
