import { supabase } from "./supabaseClient";

/** ทุกอย่างที่คุยกับ Supabase เรื่องประกาศขายที่ดิน (โครงสร้างตารางดูที่ supabase/schema.sql) */

const PHOTO_BUCKET = "listing-photos";
const DEED_BUCKET = "deed-files";
const BASE_COLUMNS =
  "id,created_at,status,title,description,land_type,province,district,rai,ngan,wah,area_wah,price,price_unit,total_price,lat,lng,photos";

// highlights = จุดเด่นจากเช็กลิสต์ฝ่ายขาย (คอลัมน์ใหม่ใน supabase/schema.sql)
// ถ้ายังไม่ได้รัน SQL ใหม่ เว็บยังทำงานต่อได้ แค่ไม่มีจุดเด่น (ถอยไปใช้คอลัมน์เดิมอัตโนมัติ)
let hasHighlights = true;
const publicColumns = () => (hasHighlights ? `${BASE_COLUMNS},highlights` : BASE_COLUMNS);
const isMissingColumn = (error) => error?.code === "42703";

/** รันคำสั่ง (build สร้าง query ใหม่ทุกครั้ง) ถ้าฐานข้อมูลยังไม่มีคอลัมน์ highlights ให้ลองใหม่แบบไม่มี */
async function run(build) {
  const res = await build();
  if (!hasHighlights || !isMissingColumn(res.error)) return res;
  hasHighlights = false;
  console.warn("ฐานข้อมูลยังไม่มีคอลัมน์ highlights — รัน supabase/schema.sql ใหม่เพื่อใช้จุดเด่นที่ดิน");
  return build();
}

/** ข้อผิดพลาดเมื่อบันทึกจุดเด่นแต่ฐานข้อมูลยังไม่ได้อัปเดต */
export class SchemaOutdatedError extends Error {}

export const PAGE_SIZE = 12;

function db() {
  if (!supabase) throw new Error("NOT_CONFIGURED");
  return supabase;
}

/** ลิงก์รูปที่ดิน (bucket สาธารณะ) */
export function photoUrl(path) {
  return db().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** การเรียง: [คอลัมน์, น้อยไปมาก?] (ชื่อต้องตรงกับ SORT_GROUPS ใน data/landListingOptions.js) */
const SORTS = {
  newest: ["created_at", false],
  oldest: ["created_at", true],
  area_desc: ["area_wah", false],
  area_asc: ["area_wah", true],
  price_asc: ["total_price", true],
  price_desc: ["total_price", false],
};

/**
 * รายการประกาศที่เผยแพร่แล้ว
 * filters: { province, landType, minPrice, maxPrice, minAreaWah, maxAreaWah, sort }   page เริ่มที่ 0
 * คืนค่า { items, total }
 */
export async function fetchListings(filters = {}, page = 0) {
  const from = page * PAGE_SIZE;
  const { data, error, count } = await run(() => listingsQuery(filters).range(from, from + PAGE_SIZE - 1));
  if (error) throw error;
  return { items: data, total: count ?? data.length };
}

function listingsQuery(filters) {
  let q = db().from("listings").select(publicColumns(), { count: "exact" }).eq("status", "approved");
  if (filters.province) q = q.eq("province", filters.province);
  if (filters.landType) q = q.eq("land_type", filters.landType);
  if (filters.minPrice) q = q.gte("total_price", filters.minPrice);
  if (filters.maxPrice) q = q.lte("total_price", filters.maxPrice);
  if (filters.minAreaWah) q = q.gte("area_wah", filters.minAreaWah);
  if (filters.maxAreaWah) q = q.lte("area_wah", filters.maxAreaWah);

  const [column, ascending] = SORTS[filters.sort] || SORTS.newest;
  return q.order(column, { ascending }).order("id", { ascending: false });
}

/** ประกาศเดียว (คืน null ถ้าไม่พบหรือยังไม่เผยแพร่) */
export async function fetchListing(id) {
  const { data, error } = await run(() => db().from("listings").select(publicColumns()).eq("id", id).maybeSingle());
  if (error) throw error;
  return data;
}

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

/** อัปโหลดไฟล์ (จาก useFileAttachments) ไปไว้ในโฟลเดอร์ uploads/<uuid>/ คืนรายการ path */
async function uploadFiles(bucket, folder, files) {
  const paths = [];
  for (const [i, file] of files.entries()) {
    const ext = file.type === "application/pdf" ? "pdf" : "jpg";
    const path = `${folder}/${i}.${ext}`;
    const { error } = await db()
      .storage.from(bucket)
      .upload(path, await dataUrlToBlob(file.data), { contentType: file.type, upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

/**
 * ส่งประกาศใหม่ (สถานะ "รอตรวจ") คืนรหัสประกาศ
 * listing = ค่าจากฟอร์ม, photos / deedFiles = ไฟล์จาก useFileAttachments
 */
/** ส่งไม่ได้เพราะเกินโควตากันสแปม (code = RATE_PHONE | RATE_GLOBAL | RATE_UPLOAD ดู supabase/schema.sql) */
export class ListingLimitError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const LIMIT_CODES = ["RATE_PHONE", "RATE_GLOBAL", "RATE_UPLOAD"];
const toLimitError = (error) => {
  const code = LIMIT_CODES.find((c) => error?.message?.includes(c));
  return code ? new ListingLimitError(code) : error;
};

/** เช็กโควตาก่อนอัปโหลดรูป (ไม่ให้ผู้ใช้รออัปโหลดเสร็จแล้วค่อยรู้ว่าส่งไม่ได้) */
async function checkQuota(phone) {
  const { data, error } = await db().rpc("listing_quota_error", { p_phone: phone });
  // ยังไม่ได้รัน SQL ส่วนกันสแปม (ไม่มีฟังก์ชันนี้) → ข้ามไป ให้ส่งได้ตามเดิม
  if (error) {
    if (error.code === "PGRST202") return;
    throw error;
  }
  if (data) throw new ListingLimitError(data);
}

export async function submitListing(listing, photos, deedFiles) {
  await checkQuota(listing.phone);
  const folder = `uploads/${crypto.randomUUID()}`;
  const photoPaths = await uploadFiles(PHOTO_BUCKET, folder, photos);
  const deedPaths = await uploadFiles(DEED_BUCKET, folder, deedFiles);

  const { data, error } = await db().rpc("submit_listing", {
    p_title: listing.title,
    p_description: listing.description,
    p_land_type: listing.landType,
    p_province: listing.province,
    p_district: listing.district,
    p_rai: listing.rai,
    p_ngan: listing.ngan,
    p_wah: listing.wah,
    p_price: listing.price,
    p_price_unit: listing.priceUnit,
    p_lat: listing.lat,
    p_lng: listing.lng,
    p_photos: photoPaths,
    p_seller_name: listing.sellerName,
    p_phone: listing.phone,
    p_line_id: listing.lineId,
    p_deed_no: listing.deedNo,
    p_deed_files: deedPaths,
  });
  if (error) throw toLimitError(error);
  return data;
}

// ── แอดมิน ──────────────────────────────────────────────────────────────────

export const signIn = async (email, password) => {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = () => db().auth.signOut();

export async function checkIsAdmin() {
  const { data, error } = await db().rpc("is_admin");
  if (error) throw error;
  return data === true;
}

const adminSelect = (join = "listing_private(*)") => `${publicColumns()},${join}`;
const ADMIN_LIMIT = 200;

/** เติมลิงก์ชั่วคราว (1 ชม.) ของสำเนาโฉนด ให้แต่ละประกาศ (deedLinks) */
async function withDeedLinks(rows) {
  const deedPaths = rows.flatMap((row) => row.listing_private?.deed_files || []);
  const signed = {};
  if (deedPaths.length) {
    const { data: urls, error: signError } = await db().storage.from(DEED_BUCKET).createSignedUrls(deedPaths, 3600);
    if (signError) throw signError;
    urls.forEach((u) => { if (u.signedUrl) signed[u.path] = u.signedUrl; });
  }
  return rows.map((row) => ({
    ...row,
    deedLinks: (row.listing_private?.deed_files || []).map((path) => ({ path, url: signed[path] })),
  }));
}

/** ประกาศตามสถานะ พร้อมข้อมูลผู้ขาย */
export async function fetchAdminListings(status) {
  const { data, error } = await run(() => db()
    .from("listings")
    .select(adminSelect())
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIMIT));
  if (error) throw error;
  return withDeedLinks(data);
}

/** ประกาศเดียว (ใช้โหลดใหม่หลังแก้ไข) */
async function fetchAdminListing(id) {
  const { data, error } = await run(() => db().from("listings").select(adminSelect()).eq("id", id).single());
  if (error) throw error;
  return (await withDeedLinks([data]))[0];
}

/** จำนวนประกาศแต่ละสถานะ เช่น { pending: 12, approved: 40, ... } */
export async function fetchStatusCounts(statuses) {
  const entries = await Promise.all(statuses.map(async (status) => {
    const { count, error } = await db()
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    return [status, count ?? 0];
  }));
  return Object.fromEntries(entries);
}

/** แต่ละเบอร์มีกี่ประกาศ (ทุกสถานะ) — ใช้เตือนเบอร์ซ้ำ */
export async function fetchPhoneCounts(phones) {
  const unique = [...new Set(phones.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await db().from("listing_private").select("phone").in("phone", unique);
  if (error) throw error;
  const counts = {};
  data.forEach(({ phone }) => { counts[phone] = (counts[phone] || 0) + 1; });
  return counts;
}

/**
 * ค้นหาทุกสถานะ: รหัสประกาศ (L00012 / 12) · เบอร์โทร (6 หลักขึ้นไป) · ชื่อผู้ขายหรือหัวข้อประกาศ
 */
export async function searchAdminListings(query) {
  const q = query.trim();
  const compact = q.replace(/[\s-]/g, "");
  const base = (join) => db()
    .from("listings").select(adminSelect(join)).order("created_at", { ascending: false }).limit(ADMIN_LIMIT);
  const INNER = "listing_private!inner(*)";

  const code = compact.match(/^L0*(\d{1,9})$/i) || compact.match(/^0*(\d{1,5})$/);
  let rows;
  if (code) {
    const { data, error } = await run(() => base().eq("id", Number(code[1])));
    if (error) throw error;
    rows = data;
  } else if (/^\d{6,10}$/.test(compact)) {
    const { data, error } = await run(() => base(INNER).ilike("listing_private.phone", `%${compact}%`));
    if (error) throw error;
    rows = data;
  } else {
    const pattern = `%${q.replace(/[%_\\]/g, "")}%`;
    const [byTitle, bySeller] = await Promise.all([
      run(() => base().ilike("title", pattern)),
      run(() => base(INNER).ilike("listing_private.seller_name", pattern)),
    ]);
    if (byTitle.error) throw byTitle.error;
    if (bySeller.error) throw bySeller.error;
    const seen = new Set();
    rows = [...byTitle.data, ...bySeller.data]
      .filter((row) => !seen.has(row.id) && seen.add(row.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return withDeedLinks(rows);
}

/**
 * แก้ไขประกาศ: fields = คอลัมน์ของ listings, seller = คอลัมน์ของ listing_private,
 * removedPhotos = path รูปที่เอาออก (ลบไฟล์ทิ้งด้วย) — คืนประกาศที่บันทึกแล้ว
 */
export async function updateListing(id, fields, seller, removedPhotos = []) {
  // PGRST204 = ไม่มีคอลัมน์ highlights / checklist (ยังไม่ได้รัน SQL ใหม่)
  const check = (error) => {
    if (!error) return;
    if (error.code === "PGRST204" || isMissingColumn(error)) throw new SchemaOutdatedError(error.message);
    throw error;
  };
  check((await db().from("listings").update(fields).eq("id", id)).error);
  check((await db().from("listing_private").update(seller).eq("listing_id", id)).error);
  if (removedPhotos.length) await removeFiles(PHOTO_BUCKET, removedPhotos);
  return fetchAdminListing(id);
}

/** ลบไฟล์ (ลบไม่สำเร็จไม่ถือว่าพัง แค่เตือนใน console — ข้อมูลประกาศสำคัญกว่า) */
async function removeFiles(bucket, paths) {
  const { data, error } = await db().storage.from(bucket).remove(paths);
  if (error || (data?.length ?? 0) < paths.length) {
    console.warn(`ลบไฟล์ใน ${bucket} ไม่ครบ`, error || `${data?.length ?? 0}/${paths.length}`);
  }
}

/** ลบประกาศถาวร พร้อมข้อมูลผู้ขาย รูป และสำเนาโฉนด */
export async function deleteListing(listing) {
  const { data, error } = await db().from("listings").delete().eq("id", listing.id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("ไม่มีสิทธิ์ลบ หรือประกาศถูกลบไปแล้ว");
  const photos = listing.photos || [];
  const deeds = listing.listing_private?.deed_files || [];
  await Promise.all([
    photos.length && removeFiles(PHOTO_BUCKET, photos),
    deeds.length && removeFiles(DEED_BUCKET, deeds),
  ]);
}

export async function setListingStatus(id, status) {
  const { error } = await db().from("listings").update({ status }).eq("id", id);
  if (error) throw error;
}

