# DroneSample – เว็บไซต์ (React + Vite)

แปลงมาจากไฟล์ `index.html` ไฟล์เดียว เป็นโปรเจกต์ React ที่แยกเป็นหมวดหมู่ ชื่อไฟล์บอกหน้าที่ชัดเจน
หน้าตาและการทำงานเหมือนเดิมทุกอย่าง (URL แบบ `#/home`, `#/works`, ... ใช้เหมือนเดิม)

## วิธีใช้

```bash
npm install        # ติดตั้งครั้งแรกครั้งเดียว
npm run dev        # เปิดทดลองแก้ไข (http://localhost:5173)
npm run build      # สร้างเว็บจริงไว้ในโฟลเดอร์ dist/ (อัปโหลดโฟลเดอร์นี้ขึ้นโฮสต์ได้เลย)
npm run preview    # ลองเปิดเว็บที่ build แล้ว
```

## ระบบประกาศขายที่ดิน (Supabase)

หน้าที่เกี่ยวข้อง:

| URL | หน้า |
|---|---|
| `#/lands` | รายการที่ดินประกาศขาย พร้อมตัวกรอง (จังหวัด ประเภท ราคา ขนาด) |
| `#/lands/<รหัส>` | รายละเอียดแปลง: รูป แผนที่ ปุ่มติดต่อทาง LINE และปุ่มขอ Contour |
| `#/post` | ลงประกาศ (ใครก็ลงได้ ไม่ต้องสมัคร) ประกาศจะขึ้นเว็บเมื่อแอดมินอนุมัติ |
| `#/admin` | แอดมินตรวจประกาศ (ไม่มีในเมนู พิมพ์ URL เข้าเอง) |

ข้อมูลผู้ขาย (ชื่อ เบอร์ LINE เลขโฉนด สำเนาโฉนด) **ไม่แสดงบนเว็บ** แอดมินเห็นคนเดียว ผู้ซื้อติดต่อผ่าน LINE ทีมงาน

### ตั้งค่าครั้งแรก

1. สมัคร [supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่
2. เปิด **SQL Editor** แล้ววางไฟล์ `supabase/schema.sql` ทั้งไฟล์ แล้วกด Run (รันซ้ำได้)
3. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจาก **Project Settings → API** (Project URL และ anon/publishable key)
4. สร้างบัญชีแอดมิน: **Authentication → Users → Add user** (ติ๊ก Auto Confirm) แล้วรันใน SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'อีเมลแอดมิน' on conflict do nothing;
   ```
5. รัน `npm run dev` ใหม่ (ถ้าเปิดค้างไว้ต้องปิดแล้วเปิดใหม่ เพื่อให้อ่านไฟล์ .env)

ตอน deploy ต้องตั้งตัวแปร `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ให้โฮสต์ด้วย (หรือมีไฟล์ `.env` ตอนสั่ง `npm run build`)

## ต้องการแก้อะไร → ไปที่ไฟล์ไหน

| ต้องการแก้ | ไฟล์ |
|---|---|
| เบอร์โทร อีเมล LINE ID เวลาทำการ ลิงก์รับฟอร์ม | `src/config/siteConfig.js` |
| ใส่รูป QR ของ LINE OA จริง | `src/config/siteConfig.js` (ช่อง `qrImage`) |
| คำถามที่พบบ่อย | `src/data/faqItems.js` |
| ข้อความในแท็บอสังหา/เกษตร/โรงงาน | `src/data/landTypeTabs.js` |
| การ์ดประเภทที่ดินในหน้าแรก | `src/data/serviceTypes.js` |
| 3 ขั้นตอนในหน้าขั้นตอนการทำงาน | `src/data/processSteps.js` |
| รายการเมนูด้านบน | `src/data/navigationMenu.js` |
| เปลี่ยนวิดีโอพื้นหลัง (หน้าแรก, ขั้นตอน, ติดต่อเรา) | `src/assets/media/CenReview1.mp4` (เปลี่ยนชื่อไฟล์ที่ `src/components/common/BackgroundVideo.jsx`) |
| ชื่อและคำอธิบายเว็บ (SEO) | `index.html` |
| ประเภทที่ดิน จังหวัด ช่วงราคาในตัวกรอง | `src/data/landListingOptions.js` |
| ตาราง/สิทธิ์ของระบบประกาศ | `supabase/schema.sql` |
| ค่าเชื่อมต่อ Supabase | `.env` (ดูตัวอย่าง `.env.example`) |

## โครงสร้างโฟลเดอร์

```
index.html                       หน้าเว็บหลัก (ชื่อเว็บ, ฟอนต์, meta)
src/
├─ main.jsx                      จุดเริ่มต้นของโปรแกรม
├─ App.jsx                       เลือกว่าจะแสดงหน้าไหน ตาม URL
│
├─ config/
│  └─ siteConfig.js              ข้อมูลติดต่อและการตั้งค่า (แก้ที่เดียวจบ)
│
├─ data/                         ข้อความ/รายการต่าง ๆ แยกออกจากหน้าตา
│  ├─ navigationMenu.js          เมนูด้านบน
│  ├─ heroHighlights.js          ป้ายจุดเด่น 4 อันในหน้าแรก
│  ├─ serviceTypes.js            ประเภทที่ดินที่ให้บริการ
│  ├─ sampleMapTypes.js          ภาพตัวอย่าง 4 แบบ
│  ├─ landTypeTabs.js            แท็บ อสังหา/เกษตร/โรงงาน
│  ├─ processSteps.js            ขั้นตอนการทำงาน 3 ขั้น
│  └─ faqItems.js                คำถามที่พบบ่อย
│
├─ pages/                        แต่ละหน้าของเว็บ
│  ├─ HomePage/                  หน้าแรก
│  │  ├─ HomePage.jsx
│  │  ├─ HeroSection.jsx         หัวข้อใหญ่ + วิดีโอพื้นหลัง
│  │  └─ ServiceTypesSection.jsx การ์ดประเภทที่ดิน
│  ├─ WorksPage/                 ตัวอย่างผลงาน
│  │  ├─ WorksPage.jsx
│  │  ├─ SampleGallerySection.jsx  แกลเลอรี + แท็บ Contour
│  │  └─ CustomersSection.jsx    ลูกค้าของเรา
│  ├─ StepsPage/                 ขั้นตอนการทำงาน
│  │  ├─ StepsPage.jsx
│  │  ├─ StepsSlideshow.jsx      สไลด์โชว์ (เลื่อนเอง/กดจุด/ปัด)
│  │  └─ StepSlides.jsx          สไลด์ทั้ง 3 ขั้น
│  ├─ CallbackPage/              ให้ทีมงานติดต่อกลับ (#/callback)
│  │  ├─ CallbackPage.jsx
│  │  ├─ CallbackForm.jsx        ฟอร์มขอให้ติดต่อกลับ (นัดบินสำรวจ) + ตรวจข้อมูล + ส่ง
│  │  └─ DeedUploader.jsx        ช่องแนบสำเนาโฉนด
│  ├─ CalcPage/                  คำนวณราคาที่ดิน (#/calc)
│  │  ├─ CalcPage.jsx
│  │  ├─ PriceCalculator.jsx     เครื่องคำนวณราคา
│  │  └─ PriceDisclaimerDialog.jsx  ป๊อปอัปเตือน "ไม่ใช่ราคาซื้อขายจริง"
│  ├─ FaqPage/FaqPage.jsx        คำถามที่พบบ่อย
│  ├─ ContactPage/ContactPage.jsx  ติดต่อเรา
│  ├─ LandsPage/                 ซื้อขายที่ดิน
│  │  ├─ LandsPage.jsx           รายการประกาศ + ตัวกรอง + โหลดเพิ่ม
│  │  ├─ ListingFilters.jsx      แถบตัวกรอง
│  │  ├─ ListingCard.jsx         การ์ดประกาศ
│  │  ├─ LandDetailPage.jsx      หน้ารายละเอียดแปลง
│  │  └─ SetupNotice.jsx         ข้อความเมื่อยังไม่ตั้งค่า Supabase
│  ├─ PostListingPage/PostListingPage.jsx  ฟอร์มลงประกาศ
│  └─ AdminPage/AdminPage.jsx    แอดมินอนุมัติ/ซ่อน/ทำเครื่องหมายขายแล้ว
│
├─ lib/
│  ├─ supabaseClient.js          เชื่อมต่อ Supabase (อ่านค่าจาก .env)
│  └─ listingsApi.js             โหลด/ส่ง/อัปเดตประกาศ อัปโหลดรูป
│
├─ components/                   ชิ้นส่วนที่ใช้ซ้ำหลายหน้า
│  ├─ layout/
│  │  ├─ SiteHeader.jsx          แถบเมนูด้านบน
│  │  ├─ SiteFooter.jsx          ส่วนท้ายเว็บ
│  │  └─ FloatingLineButton.jsx  ปุ่ม LINE ลอยด้านล่าง
│  └─ common/
│     ├─ LineLink.jsx            ปุ่มพาไปแอด LINE
│     ├─ LineQrCode.jsx          QR Code
│     ├─ ContourMapSvg.jsx       รูปแผนที่จำลอง
│     └─ BackgroundVideo.jsx     วิดีโอพื้นหลัง
│
├─ hooks/                        ฟังก์ชันพฤติกรรมที่ใช้ซ้ำ
│  ├─ useHashRoute.js            อ่านหน้าปัจจุบันจาก URL
│  ├─ useMediaQuery.js           ตรวจขนาดหน้าจอ
│  ├─ useNavMagnify.js           เมนูขยายเมื่อเมาส์เข้าใกล้
│  ├─ useDeedFiles.js            จัดการไฟล์โฉนดที่แนบ
│  └─ useToast.jsx               ป้ายแจ้งเตือนสั้น ๆ
│
├─ utils/
│  ├─ contourMapGenerator.js     สร้างแผนที่ภูมิประเทศจำลอง (SVG)
│  ├─ formatNumber.js            จัดรูปตัวเลขแบบไทย
│  └─ trackLineClick.js          ส่งสถิติการกดปุ่ม LINE
│
├─ assets/media/                 CenReview1.mp4 (วิดีโอพื้นหลัง), CenReview2.mp4
│
└─ styles/                       CSS แยกตามส่วน
   ├─ index.css                  รวมทุกไฟล์ (ลำดับ import สำคัญ อย่าสลับ)
   ├─ base/                      พื้นฐาน: ตัวแปรสี/ฟอนต์, ปุ่ม, ช่องกรอก, การ์ด
   ├─ components/                หัวเว็บ, ท้ายเว็บ, ปุ่มลอย, ป๊อปอัป
   └─ pages/                     CSS ของแต่ละหน้า
```

## ที่ปรับเพิ่มจากไฟล์เดิม

- ลบ CSS ที่ไม่มีส่วนไหนใช้แล้ว (`.banner`, `.contactinfo`, `.vframe`, `.chips`, `.g3`)
- หน้า "ติดต่อเรา": ไฟล์เดิมจะไฮไลต์เมนู "หน้าแรก" ผิดหน้า ตอนนี้ไม่ไฮไลต์เมนูใด และบนมือถือมีปุ่ม "เมนู" ให้กางรายการแทน
- QR Code ใช้แพ็กเกจ `qrcode.react` แทนการโหลดสคริปต์จากอินเทอร์เน็ต
#   D r o n e S a m p l e  
 