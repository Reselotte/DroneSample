/** 3 ขั้นตอนในหน้า "ขั้นตอนการทำงาน" (highlight = ข้อความที่เน้นสี) */
const processSteps = [
  { no: 1, title: "ติดต่อผ่าน LINE", before: "ส่ง", highlight: "พิกัดที่ดิน", after: "ให้ทีมงาน", tabLabel: "1 · ติดต่อ LINE" },
  { no: 2, title: "ทีมงานดำเนินการ", before: "บินโดรน", highlight: "สำรวจและเก็บข้อมูล", after: "ภาคสนาม", tabLabel: "2 · บินโดรน" },
  { no: 3, title: "รับผลลัพธ์ผ่าน LINE", before: "เปิดดูได้", highlight: "ทุกที่ทุกเวลา", after: "", tabLabel: "3 · รับผลลัพธ์" },
];

export default processSteps;
