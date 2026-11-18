-- ════════════════════════════════════════════════════════════════════════════
-- ระบบประกาศขายที่ดิน (DroneSample)
-- วิธีใช้: เปิด Supabase → SQL Editor → วางไฟล์นี้ทั้งไฟล์ → Run (รันซ้ำได้ ไม่พัง)
--
-- หลักการ
--  • คนทั่วไปลงประกาศได้โดยไม่ต้องล็อกอิน ผ่านฟังก์ชัน submit_listing() เท่านั้น
--    ประกาศใหม่จะเป็นสถานะ 'pending' เสมอ จนกว่าแอดมินจะอนุมัติ
--  • หน้าเว็บเห็นเฉพาะประกาศที่ 'approved' หรือ 'sold'
--  • ข้อมูลผู้ขาย (ชื่อ เบอร์ LINE เลขโฉนด สำเนาโฉนด) อยู่ในตาราง listing_private
--    มีแต่แอดมินที่อ่านได้ ไม่ขึ้นหน้าเว็บ (ผู้ซื้อติดต่อผ่าน LINE ทีมงาน)
-- ════════════════════════════════════════════════════════════════════════════
  
-- ── แอดมิน ──────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security; -- ไม่มี policy = ไม่มีใครอ่านผ่าน API ได้

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ── ประกาศ (ข้อมูลที่แสดงบนเว็บ) ────────────────────────────────────────────
create table if not exists public.listings (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected', 'sold')),
  title       text not null check (char_length(title) between 5 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  land_type   text not null
              check (land_type in ('agri', 'residential', 'industrial', 'commercial', 'other')),
  province    text not null check (char_length(province) between 2 and 50),
  district    text not null default '' check (char_length(district) <= 100),
  rai         numeric not null default 0 check (rai >= 0),
  ngan        numeric not null default 0 check (ngan >= 0),
  wah         numeric not null default 0 check (wah >= 0),
  -- ขนาดรวมเป็นตารางวา และราคารวม คำนวณให้อัตโนมัติ (ใช้กรอง/เรียง)
  area_wah    numeric generated always as (rai * 400 + ngan * 100 + wah) stored,
  price       numeric not null check (price > 0),
  price_unit  text not null check (price_unit in ('total', 'rai', 'wah')),
  total_price numeric generated always as (
                case price_unit
                  when 'total' then price
                  when 'rai'   then price * (rai * 400 + ngan * 100 + wah) / 400
                  else              price * (rai * 400 + ngan * 100 + wah)
                end) stored,
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  photos      text[] not null default '{}' check (cardinality(photos) <= 10),
  check (rai * 400 + ngan * 100 + wah > 0)
);

-- จุดเด่นจากเช็กลิสต์ฝ่ายขาย (แสดงบนเว็บ): { "near_rail": "BTS สำโรง 500 ม.", "chanote": "" }
-- รายชื่อ key อยู่ใน src/data/landChecklist.js — แอดมินเป็นคนกรอก
alter table public.listings add column if not exists highlights jsonb not null default '{}'::jsonb;
alter table public.listings drop constraint if exists listings_highlights_check;
alter table public.listings add constraint listings_highlights_check
  check (jsonb_typeof(highlights) = 'object' and pg_column_size(highlights) <= 8000);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_province_idx on public.listings (province);

alter table public.listings enable row level security;

drop policy if exists "public reads published listings" on public.listings;
create policy "public reads published listings" on public.listings
  for select to anon, authenticated
  using (status in ('approved', 'sold') or public.is_admin());

drop policy if exists "admins update listings" on public.listings;
create policy "admins update listings" on public.listings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete listings" on public.listings;
create policy "admins delete listings" on public.listings
  for delete to authenticated
  using (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- ── ข้อมูลผู้ขาย (แอดมินเท่านั้น) ──────────────────────────────────────────
create table if not exists public.listing_private (
  listing_id  bigint primary key references public.listings on delete cascade,
  seller_name text not null check (char_length(seller_name) between 1 and 100),
  phone       text not null check (phone ~ '^0[0-9]{8,9}$'),
  line_id     text not null default '' check (char_length(line_id) <= 50),
  deed_no     text not null default '' check (char_length(deed_no) <= 50),
  deed_files  text[] not null default '{}' check (cardinality(deed_files) <= 5)
);

-- คำตอบเช็กลิสต์ส่วนที่ไม่แสดงบนเว็บ (ติดจำนอง ราคาต่ำสุด เหตุผลที่ขาย …) รูปแบบเดียวกับ highlights
alter table public.listing_private add column if not exists checklist jsonb not null default '{}'::jsonb;
alter table public.listing_private drop constraint if exists listing_private_checklist_check;
alter table public.listing_private add constraint listing_private_checklist_check
  check (jsonb_typeof(checklist) = 'object' and pg_column_size(checklist) <= 8000);

alter table public.listing_private enable row level security;

drop policy if exists "admins manage private info" on public.listing_private;
create policy "admins manage private info" on public.listing_private
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── กันสแปม: จำกัดจำนวนประกาศ / ไฟล์ ───────────────────────────────────────
--  • เบอร์โทรเดียวกัน ลงได้ไม่เกิน 3 ประกาศ ใน 24 ชั่วโมง          → 'RATE_PHONE'
--  • ประกาศรอตรวจทั้งเว็บ ไม่เกิน 50 รายการ (แอดมินตรวจแล้วจึงรับเพิ่ม) → 'RATE_GLOBAL'
--  • ไฟล์อัปโหลดทั้งเว็บ ไม่เกิน 300 ไฟล์ ต่อชั่วโมง                  → 'RATE_UPLOAD'
--  ปรับตัวเลขได้ในฟังก์ชันด้านล่าง แล้วรันไฟล์นี้ใหม่
create index if not exists listing_private_phone_idx on public.listing_private (phone);

create or replace function public.upload_quota_ok()
returns boolean
language sql stable security definer set search_path = public, storage
as $$
  select count(*) < 300
  from storage.objects
  where bucket_id in ('listing-photos', 'deed-files')
    and created_at > now() - interval '1 hour';
$$;
revoke all on function public.upload_quota_ok() from public;
grant execute on function public.upload_quota_ok() to anon, authenticated;

-- คืนรหัสเหตุผลที่ส่งไม่ได้ หรือ null = ส่งได้ (หน้าเว็บเรียกก่อนอัปโหลดรูป)
create or replace function public.listing_quota_error(p_phone text, p_check_uploads boolean default true)
returns text
language plpgsql stable security definer set search_path = public
as $$
begin
  if (select count(*)
      from public.listing_private lp
      join public.listings l on l.id = lp.listing_id
      where lp.phone = p_phone and l.created_at > now() - interval '24 hours') >= 3 then
    return 'RATE_PHONE';
  end if;
  if (select count(*) from public.listings where status = 'pending') >= 50 then
    return 'RATE_GLOBAL';
  end if;
  if p_check_uploads and not public.upload_quota_ok() then
    return 'RATE_UPLOAD';
  end if;
  return null;
end $$;
revoke all on function public.listing_quota_error(text, boolean) from public;
grant execute on function public.listing_quota_error(text, boolean) to anon, authenticated;

-- ── ส่งประกาศใหม่ (ช่องทางเดียวที่คนทั่วไปเขียนข้อมูลได้) ───────────────────
create or replace function public.submit_listing(
  p_title text, p_description text, p_land_type text, p_province text, p_district text,
  p_rai numeric, p_ngan numeric, p_wah numeric, p_price numeric, p_price_unit text,
  p_lat double precision, p_lng double precision, p_photos text[],
  p_seller_name text, p_phone text, p_line_id text, p_deed_no text, p_deed_files text[]
)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  new_id bigint;
  path_re constant text := '^uploads/[0-9a-f-]{36}/[A-Za-z0-9._-]+$';
  quota_err text;
begin
  -- กันสแปม: เช็กจำนวนอีกรอบตอนบันทึกจริง (ล็อกตามเบอร์ กันยิงพร้อมกันหลายครั้ง)
  -- ไม่เช็กโควตาไฟล์ซ้ำ เพราะรูปของประกาศนี้อัปโหลดไปแล้ว
  perform pg_advisory_xact_lock(hashtext('submit_listing:' || coalesce(p_phone, '')));
  quota_err := public.listing_quota_error(p_phone, false);
  if quota_err is not null then
    raise exception '%', quota_err;
  end if;

  if cardinality(coalesce(p_photos, '{}')) < 1 then
    raise exception 'ต้องมีรูปที่ดินอย่างน้อย 1 รูป';
  end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) as p where p !~ path_re)
     or exists (select 1 from unnest(coalesce(p_deed_files, '{}')) as p where p !~ path_re) then
    raise exception 'invalid file path';
  end if;

  insert into public.listings
    (title, description, land_type, province, district, rai, ngan, wah,
     price, price_unit, lat, lng, photos)
  values
    (trim(p_title), trim(coalesce(p_description, '')), p_land_type, trim(p_province),
     trim(coalesce(p_district, '')), coalesce(p_rai, 0), coalesce(p_ngan, 0), coalesce(p_wah, 0),
     p_price, p_price_unit, p_lat, p_lng, p_photos)
  returning id into new_id; -- status = 'pending' จากค่าเริ่มต้นเสมอ

  insert into public.listing_private (listing_id, seller_name, phone, line_id, deed_no, deed_files)
  values (new_id, trim(p_seller_name), p_phone, trim(coalesce(p_line_id, '')),
          trim(coalesce(p_deed_no, '')), coalesce(p_deed_files, '{}'));

  return new_id;
end $$;

revoke all on function public.submit_listing(
  text, text, text, text, text, numeric, numeric, numeric, numeric, text,
  double precision, double precision, text[], text, text, text, text, text[]) from public;
grant execute on function public.submit_listing(
  text, text, text, text, text, numeric, numeric, numeric, numeric, text,
  double precision, double precision, text[], text, text, text, text, text[]) to anon, authenticated;

-- ── ที่เก็บไฟล์ ─────────────────────────────────────────────────────────────
-- listing-photos : รูปที่ดิน (สาธารณะ เปิดดูได้จากลิงก์)
-- deed-files     : สำเนาโฉนด (ส่วนตัว แอดมินเท่านั้น)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('deed-files',     'deed-files',     false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone uploads listing files" on storage.objects;
create policy "anyone uploads listing files" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id in ('listing-photos', 'deed-files')
    and (storage.foldername(name))[1] = 'uploads'
    and public.upload_quota_ok() -- กันสแปม: เกินโควตาไฟล์ต่อชั่วโมง = อัปโหลดไม่ได้
  );

-- แอดมินอ่านไฟล์ได้ทั้ง 2 bucket (ต้องมีสิทธิ์อ่านด้วย ถึงจะลบไฟล์ได้ตอนลบประกาศ)
drop policy if exists "admins read deed files" on storage.objects;
drop policy if exists "admins read listing files" on storage.objects;
create policy "admins read listing files" on storage.objects
  for select to authenticated
  using (bucket_id in ('listing-photos', 'deed-files') and public.is_admin());

drop policy if exists "admins delete listing files" on storage.objects;
create policy "admins delete listing files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('listing-photos', 'deed-files') and public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- เพิ่มแอดมิน (ทำหลังรันไฟล์นี้):
--  1) Authentication → Users → Add user  (ใส่อีเมล + รหัสผ่าน, ติ๊ก Auto Confirm)
--  2) รันคำสั่งนี้ โดยเปลี่ยนอีเมลเป็นของแอดมิน
--     insert into public.admins (user_id)
--     select id from auth.users where email = 'admin@example.com'
--     on conflict do nothing;
-- ════════════════════════════════════════════════════════════════════════════

