# DroneSample

เว็บบริการบินโดรนสำรวจที่ดิน + ระบบประกาศซื้อขายที่ดิน (React + Vite + Supabase)

## 1. รันในเครื่อง (2 นาที)

ต้องมี [Node.js](https://nodejs.org) 18 ขึ้นไป

```bash
git clone https://github.com/Reselotte/DroneSample.git
cd DroneSample
npm install
npm run dev          # เปิด http://localhost:5173
```

เท่านี้ทุกหน้าใช้ได้แล้ว **ยกเว้นซื้อขายที่ดิน** (ต้องทำข้อ 2)

## 2. เปิดระบบซื้อขายที่ดิน (5 นาที)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. **SQL Editor** → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run**
3. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจาก **Project Settings → API**
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
4. สร้างแอดมิน: **Authentication → Users → Add user** (ติ๊ก Auto Confirm) แล้วรันใน SQL Editor
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'อีเมลแอดมิน';
   ```
5. ปิด `npm run dev` แล้วเปิดใหม่ → เข้าหน้าแอดมินที่ `/#/admin`

## 3. ขึ้นเว็บจริง

```bash
npm run build        # ได้โฟลเดอร์ dist/ → อัปโหลดขึ้นโฮสต์ใดก็ได้
```

ถ้าใช้ Vercel / Netlify: เชื่อม repo นี้ → Build command `npm run build` → Output `dist` → ใส่ตัวแปร `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ในหน้าตั้งค่าของโฮสต์

## แก้อะไร → ไฟล์ไหน

| แก้ | ไฟล์ |
|---|---|
| เบอร์ อีเมล LINE ID รูป QR ลิงก์รับฟอร์มติดต่อกลับ | `src/config/siteConfig.js` |
| ข้อความ / FAQ / เมนู / ขั้นตอน | `src/data/` |
| จังหวัด ประเภทที่ดิน ช่วงราคา (หน้าซื้อขาย) | `src/data/landListingOptions.js` |
| วิดีโอพื้นหลัง + รูปปก | `src/assets/media/hero-bg.mp4`, `hero-poster.jpg` |
| สีธีมสว่าง / มืด | `src/styles/theme-light.css`, `theme-dark.css` |
| ชื่อเว็บ / คำอธิบาย (SEO) | `index.html` |

## หน้าในเว็บ

`#/home` หน้าแรก · `#/lands` ซื้อขายที่ดิน · `#/post` ลงประกาศ · `#/works` ตัวอย่างผลงาน · `#/steps` ขั้นตอน · `#/callback` ให้ทีมงานติดต่อกลับ · `#/calc` คำนวณราคา · `#/faq` คำถาม · `#/contact` ติดต่อเรา · `#/admin` แอดมิน (ไม่อยู่ในเมนู)

> ประกาศใหม่ต้องรอแอดมินอนุมัติก่อนขึ้นเว็บ ข้อมูลผู้ขาย (ชื่อ เบอร์ โฉนด) แอดมินเห็นคนเดียว ไม่แสดงบนเว็บ
