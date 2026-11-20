-- ════════════════════════════════════════════════════════════════════════════
-- ระบบประกาศขายที่ดิน (DroneSample)
-- วิธีใช้: เปิด Supabase → SQL Editor → วางไฟล์นี้ทั้งไฟล์ → Run (รันซ้ำได้ ไม่พัง)
--
-- หลักการ
--  • ลงประกาศต้องเข้าสู่ระบบ ผ่านฟังก์ชัน submit_listing() เท่านั้น (บันทึกบัญชีเจ้าของไว้ใน listings.user_id)
--  • เจ้าของแก้ประกาศของตัวเองได้ผ่าน update_my_listing() (แก้แล้วกลับไปรอตรวจ) คนอื่นแก้ไม่ได้
--    ประกาศใหม่จะเป็นสถานะ 'pending' เสมอ จนกว่าแอดมินจะอนุมัติ
--  • หน้าเว็บเห็นเฉพาะประกาศที่ 'approved' หรือ 'sold'
--  • ข้อมูลผู้ขาย (ชื่อ เบอร์ LINE เลขโฉนด สำเนาโฉนด) อยู่ในตาราง listing_private
--    มีแต่ทีมงาน (staff / admin) ที่อ่านได้ ไม่ขึ้นหน้าเว็บ (ผู้ซื้อติดต่อผ่าน LINE ทีมงาน)
--  • เบอร์มือถือของบัญชีเก็บที่ profiles.phone — 1 เบอร์ใช้ได้ 1 บัญชี (บันทึกผ่าน claim_phone() เท่านั้น)
--  • ทุกบัญชีมีระดับสิทธิ์ใน profiles.role: user (ผู้ใช้งานทั่วไป) / agent (นายหน้า) / dealer (ดีลเลอร์) / staff (ทีมงาน) / admin (ผู้ดูแลระบบ)
-- ════════════════════════════════════════════════════════════════════════════
  
-- ── บัญชีผู้ใช้ + ระดับสิทธิ์ (role) ─────────────────────────────────────────
-- ทุกบัญชีมี 1 แถวใน profiles (สร้างให้อัตโนมัติตอนสมัคร)
--   user  = ผู้ใช้งานทั่วไป (ลงประกาศ / ขอให้ติดต่อกลับ)
--   agent = นายหน้า (สิทธิ์เท่าผู้ใช้งานทั่วไป มีป้ายบอกว่าเป็นนายหน้า)
--   dealer = ดีลเลอร์ (สิทธิ์เท่าผู้ใช้งานทั่วไป มีป้าย + เพชรที่รูปโปรไฟล์)
--   staff = ทีมงาน / ฝ่ายขาย: เข้าหลังบ้าน ดู-อนุมัติ-แก้ไขประกาศ เห็นข้อมูลผู้ขาย (ลบไม่ได้)
--   admin = ผู้ดูแลระบบ: ทำได้ทุกอย่าง + ลบประกาศ + เปลี่ยนระดับสิทธิ์ของบัญชีอื่น
-- แอดมินเดิมในตาราง admins ถูกย้ายมาเป็น role 'admin' ให้อัตโนมัติ (ตาราง admins เก็บไว้เฉย ๆ ไม่ได้ใช้แล้ว)
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null default 'user' check (role in ('user', 'agent', 'dealer', 'staff', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- เพิ่มระดับ agent / dealer ให้ตารางที่สร้างไว้ก่อนแล้ว
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'dealer' where role = 'vip'; -- เดิมชื่อ VIP → เปลี่ยนเป็นดีลเลอร์
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'agent', 'dealer', 'staff', 'admin'));
-- ล้างระบบกรอบรูปโปรไฟล์ที่เคยทดลอง (ยกเลิกแล้ว)
drop function if exists public.set_my_frame(text);
drop trigger if exists profiles_sync_role on public.profiles;
alter table public.profiles drop column if exists avatar_frame;

-- เบอร์มือถือของบัญชี (0812345678) — ห้ามซ้ำกัน 1 เบอร์ = 1 บัญชี
alter table public.profiles add column if not exists phone text;
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check check (phone is null or phone ~ '^0[0-9]{9}$');
create unique index if not exists profiles_phone_key on public.profiles (phone) where phone is not null;

-- สมัครใหม่ → สร้างแถวใน profiles เป็น 'user'
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- บัญชีที่มีอยู่ก่อนแล้ว → เติมแถวให้ครบ + ย้ายแอดมินเดิม
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
update public.profiles set role = 'admin'
  where id in (select user_id from public.admins) and role <> 'admin';

-- ย้ายเบอร์ที่เคยกรอกไว้ (user_metadata.phone) มาเก็บที่ profiles.phone
-- เบอร์ซ้ำกันหลายบัญชี → บัญชีที่สมัครก่อนได้เบอร์ไป บัญชีหลัง ๆ ถูกล้างเบอร์ (ระบบจะขอให้กรอกเบอร์ใหม่ตอนเข้าใช้)
update public.profiles p set phone = r.phone
  from (
    select u.id, u.raw_user_meta_data->>'phone' as phone,
           row_number() over (partition by u.raw_user_meta_data->>'phone' order by u.created_at) as rn
      from auth.users u
     where coalesce(u.raw_user_meta_data->>'phone', '') ~ '^0[0-9]{9}$'
  ) r
 where p.id = r.id and r.rn = 1 and p.phone is null
   and not exists (select 1 from public.profiles x where x.phone = r.phone);
update auth.users u
   set raw_user_meta_data = u.raw_user_meta_data - 'phone' - 'phone_verified'
 where u.raw_user_meta_data ? 'phone'
   and exists (select 1 from public.profiles p where p.phone = u.raw_user_meta_data->>'phone' and p.id <> u.id);

-- ระดับสิทธิ์ของคนที่เรียก ('guest' = ยังไม่เข้าสู่ระบบ)
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()),
                  case when auth.uid() is null then 'guest' else 'user' end);
$$;

-- เข้าหลังบ้านได้ (staff หรือ admin)
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

-- ผู้ดูแลระบบเท่านั้น
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.my_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.my_role() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ป้ายระดับสิทธิ์ในหน้า Supabase
--  1) คัดลอก role ไปไว้ที่ app_metadata ของบัญชี → Authentication → Users → กดที่บัญชี → เห็น "role": "admin"
--     (ผู้ใช้แก้ app_metadata เองไม่ได้ จึงเชื่อถือได้)
create or replace function public.sync_role_to_auth()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role, 'phone', new.phone)
   where id = new.id;
  return new;
end;
$$;
drop trigger if exists profiles_sync_role on public.profiles;
create trigger profiles_sync_role after insert or update of role, phone on public.profiles
  for each row execute function public.sync_role_to_auth();
update auth.users u
   set raw_app_meta_data = (coalesce(u.raw_app_meta_data, '{}'::jsonb) - 'frame') || jsonb_build_object('role', p.role, 'phone', p.phone)
  from public.profiles p
 where p.id = u.id
   and ((u.raw_app_meta_data->>'role') is distinct from p.role
        or (u.raw_app_meta_data->>'phone') is distinct from p.phone
        or u.raw_app_meta_data ? 'frame');

--  2) ตารางดูรวม อีเมล + ชื่อ + ระดับสิทธิ์ → Table Editor → เลือก schema "admin_views" → users_with_roles
--     อยู่นอก schema public จึงไม่เปิดให้หน้าเว็บ/API อ่านได้ (เห็นเฉพาะในหน้า Supabase)
create schema if not exists admin_views;
revoke all on schema admin_views from anon, authenticated;
create or replace view admin_views.users_with_roles as
  select coalesce(p.role, 'user') as role,
         u.email,
         coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') as name,
         coalesce(nullif(u.phone, ''), u.raw_user_meta_data->>'phone', '') as phone,
         coalesce(u.raw_app_meta_data->>'provider', '') as provider,
         u.created_at,
         u.last_sign_in_at,
         u.id
    from auth.users u
    left join public.profiles p on p.id = u.id
   order by (p.role = 'admin') desc, (p.role = 'staff') desc, (p.role = 'dealer') desc, (p.role = 'agent') desc, u.created_at desc;
revoke all on admin_views.users_with_roles from anon, authenticated;

-- อ่าน profiles: ของตัวเอง หรือแอดมินอ่านได้ทั้งหมด · แก้ role ผ่าน set_user_role() เท่านั้น
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- รายชื่อสมาชิก (หน้าแอดมิน → สมาชิก) — แอดมินเท่านั้น
create or replace function public.admin_list_users(p_search text default null)
returns table (
  id uuid, email text, name text, phone text, provider text, role text,
  created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text,
           coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::text,
           coalesce(nullif(u.phone, ''), u.raw_user_meta_data->>'phone', '')::text,
           coalesce(u.raw_app_meta_data->>'provider', '')::text,
           coalesce(p.role, 'user'),
           u.created_at, u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p_search is null or p_search = ''
       or u.email ilike '%' || p_search || '%'
       or coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', '') ilike '%' || p_search || '%'
       or coalesce(u.raw_user_meta_data->>'phone', u.phone, '') ilike '%' || p_search || '%'
    order by (p.role = 'admin') desc, (p.role = 'staff') desc, (p.role = 'dealer') desc, (p.role = 'agent') desc, u.created_at desc
    limit 500;
end;
$$;
revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to authenticated;

-- เปลี่ยนระดับสิทธิ์ — แอดมินเท่านั้น, ลดสิทธิ์ตัวเองไม่ได้ (กันหลังบ้านไม่มีแอดมินเหลือ)
create or replace function public.set_user_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  if p_role not in ('user', 'agent', 'dealer', 'staff', 'admin') then raise exception 'BAD_ROLE' using errcode = '22023'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'SELF_DEMOTE' using errcode = '42501'; end if;
  insert into public.profiles (id, role) values (p_user, p_role)
    on conflict (id) do update set role = excluded.role, updated_at = now();
end;
$$;
revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- บันทึก / เปลี่ยนเบอร์มือถือของบัญชีตัวเอง — เบอร์ที่บัญชีอื่นใช้อยู่แล้ว = PHONE_TAKEN
create or replace function public.claim_phone(p_phone text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null then raise exception 'LOGIN_REQUIRED' using errcode = '42501'; end if;
  if v !~ '^0[689][0-9]{8}$' then raise exception 'BAD_PHONE' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where phone = v and id <> auth.uid()) then
    raise exception 'PHONE_TAKEN' using errcode = '23505';
  end if;
  insert into public.profiles (id, phone) values (auth.uid(), v)
    on conflict (id) do update set phone = excluded.phone, updated_at = now();
  -- ให้หน้าเว็บอ่านเบอร์ได้จากบัญชีเหมือนเดิม (เปลี่ยนเบอร์ = ยังไม่ได้ยืนยัน)
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', v, 'phone_verified', false)
   where id = auth.uid() and coalesce(raw_user_meta_data->>'phone', '') <> v;
exception
  when unique_violation then raise exception 'PHONE_TAKEN' using errcode = '23505'; -- กดพร้อมกัน 2 บัญชี
end;
$$;
revoke all on function public.claim_phone(text) from public;
grant execute on function public.claim_phone(text) to authenticated;

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
  using (status in ('approved', 'sold') or public.is_staff());

-- เจ้าของประกาศ (บัญชีที่ลงประกาศ) — ประกาศเก่าก่อนมีระบบสมาชิกจะเป็นค่าว่าง
alter table public.listings add column if not exists user_id uuid references auth.users on delete set null;
create index if not exists listings_user_idx on public.listings (user_id, created_at desc);

-- เจ้าของเห็นประกาศของตัวเองทุกสถานะ (หน้า "ประกาศของฉัน")
drop policy if exists "owners read own listings" on public.listings;
create policy "owners read own listings" on public.listings
  for select to authenticated
  using (user_id = auth.uid());
-- เจ้าของแก้ไขผ่านฟังก์ชัน update_my_listing() เท่านั้น (ไม่มี policy update ให้เจ้าของโดยตรง → แก้สถานะเองไม่ได้)

drop policy if exists "admins update listings" on public.listings;
drop policy if exists "staff update listings" on public.listings;
create policy "staff update listings" on public.listings
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

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
drop policy if exists "staff manage private info" on public.listing_private;
create policy "staff manage private info" on public.listing_private
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- เจ้าของอ่านข้อมูลผู้ขายของประกาศตัวเองได้ (ไว้แสดงในหน้าแก้ไข)
drop policy if exists "owners read own private info" on public.listing_private;
create policy "owners read own private info" on public.listing_private
  for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()));

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
  -- ต้องเข้าสู่ระบบก่อนลงประกาศ (บังคับที่ฐานข้อมูล ไม่ใช่แค่หน้าเว็บ)
  if auth.uid() is null then
    raise exception 'LOGIN_REQUIRED' using errcode = '42501';
  end if;

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
    (user_id, title, description, land_type, province, district, rai, ngan, wah,
     price, price_unit, lat, lng, photos)
  values
    (auth.uid(), trim(p_title), trim(coalesce(p_description, '')), p_land_type, trim(p_province),
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

-- ── เจ้าของแก้ไขประกาศของตัวเอง ─────────────────────────────────────────────
-- • แก้ได้เฉพาะประกาศที่บัญชีนี้ลงเอง (คนอื่นแก้ไม่ได้ แม้รู้รหัสประกาศ) · ทีมงานแก้ได้ทุกประกาศทางหลังบ้านเหมือนเดิม
-- • แก้แล้วประกาศกลับไป "รอตรวจ" (หายจากหน้าเว็บจนทีมงานอนุมัติอีกครั้ง) · ประกาศที่ขายแล้วแก้ไม่ได้
-- • จุดเด่น (highlights) และข้อมูลภายในเป็นของทีมงาน เจ้าของแก้ไม่ได้
create or replace function public.update_my_listing(
  p_id bigint, p_title text, p_description text, p_land_type text, p_province text, p_district text,
  p_rai numeric, p_ngan numeric, p_wah numeric, p_price numeric, p_price_unit text,
  p_lat double precision, p_lng double precision, p_photos text[],
  p_seller_name text, p_phone text, p_line_id text
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  cur_owner uuid;
  cur_status text;
  path_re constant text := '^uploads/[0-9a-f-]{36}/[A-Za-z0-9._-]+$';
begin
  if auth.uid() is null then
    raise exception 'LOGIN_REQUIRED' using errcode = '42501';
  end if;
  select user_id, status into cur_owner, cur_status from public.listings where id = p_id for update;
  if not found or cur_owner is distinct from auth.uid() then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  if cur_status = 'sold' then
    raise exception 'SOLD_LOCKED';
  end if;
  if cardinality(coalesce(p_photos, '{}')) < 1 then
    raise exception 'ต้องมีรูปที่ดินอย่างน้อย 1 รูป';
  end if;
  if exists (select 1 from unnest(p_photos) as p where p !~ path_re) then
    raise exception 'invalid file path';
  end if;

  update public.listings set
    title = trim(p_title), description = trim(coalesce(p_description, '')), land_type = p_land_type,
    province = trim(p_province), district = trim(coalesce(p_district, '')),
    rai = coalesce(p_rai, 0), ngan = coalesce(p_ngan, 0), wah = coalesce(p_wah, 0),
    price = p_price, price_unit = p_price_unit, lat = p_lat, lng = p_lng, photos = p_photos,
    status = 'pending'
  where id = p_id;

  update public.listing_private set
    seller_name = trim(p_seller_name), phone = p_phone, line_id = trim(coalesce(p_line_id, ''))
  where listing_id = p_id;

  return 'pending';
end $$;
revoke all on function public.update_my_listing(
  bigint, text, text, text, text, text, numeric, numeric, numeric, numeric, text,
  double precision, double precision, text[], text, text, text) from public;
grant execute on function public.update_my_listing(
  bigint, text, text, text, text, text, numeric, numeric, numeric, numeric, text,
  double precision, double precision, text[], text, text, text) to authenticated;

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
  using (bucket_id in ('listing-photos', 'deed-files') and public.is_staff());

drop policy if exists "admins delete listing files" on storage.objects;
create policy "admins delete listing files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('listing-photos', 'deed-files') and public.is_admin());

-- avatars : รูปโปรไฟล์ (สาธารณะ) — แต่ละคนอัปโหลด/ลบได้เฉพาะในโฟลเดอร์ของตัวเอง avatars/<user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload own avatar" on storage.objects;
create policy "members upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members read own avatar" on storage.objects;
create policy "members read own avatar" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "members delete own avatar" on storage.objects;
create policy "members delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════════════
-- เพิ่มแอดมินคนแรก (ทำหลังรันไฟล์นี้):
--  1) Authentication → Users → Add user  (ใส่อีเมล + รหัสผ่าน, ติ๊ก Auto Confirm)
--     หรือให้คนนั้นเข้าสู่ระบบด้วย Google ที่หน้าเว็บก่อน 1 ครั้ง
--  2) รันคำสั่งนี้ โดยเปลี่ยนอีเมลเป็นของแอดมิน
--     update public.profiles set role = 'admin'
--     where id = (select id from auth.users where email = 'admin@example.com');
--  หลังจากนั้นแอดมินเปลี่ยนระดับสิทธิ์คนอื่นได้เองในหน้าเว็บ: หลังบ้าน → สมาชิก
-- ════════════════════════════════════════════════════════════════════════════

