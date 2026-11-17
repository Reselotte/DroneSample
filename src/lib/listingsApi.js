import { supabase } from "./supabaseClient";

/** ทุกอย่างที่คุยกับ Supabase เรื่องประกาศขายที่ดิน (โครงสร้างตารางดูที่ supabase/schema.sql) */

const PHOTO_BUCKET = "listing-photos";
const DEED_BUCKET = "deed-files";
const PUBLIC_COLUMNS =
  "id,created_at,status,title,description,land_type,province,district,rai,ngan,wah,area_wah,price,price_unit,total_price,lat,lng,photos";

export const PAGE_SIZE = 12;

function db() {
  if (!supabase) throw new Error("NOT_CONFIGURED");
  return supabase;
}

/** ลิงก์รูปที่ดิน (bucket สาธารณะ) */
export function photoUrl(path) {
  return db().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

const SORTS = {
  newest: ["created_at", false],
  price_asc: ["total_price", true],
  price_desc: ["total_price", false],
  area_desc: ["area_wah", false],
};

/**
 * รายการประกาศที่เผยแพร่แล้ว
 * filters: { province, landType, minPrice, maxPrice, minAreaWah, sort }   page เริ่มที่ 0
 * คืนค่า { items, total }
 */
export async function fetchListings(filters = {}, page = 0) {
  let q = db().from("listings").select(PUBLIC_COLUMNS, { count: "exact" }).eq("status", "approved");
  if (filters.province) q = q.eq("province", filters.province);
  if (filters.landType) q = q.eq("land_type", filters.landType);
  if (filters.minPrice) q = q.gte("total_price", filters.minPrice);
  if (filters.maxPrice) q = q.lte("total_price", filters.maxPrice);
  if (filters.minAreaWah) q = q.gte("area_wah", filters.minAreaWah);

  const [column, ascending] = SORTS[filters.sort] || SORTS.newest;
  q = q.order(column, { ascending }).order("id", { ascending: false });

  const from = page * PAGE_SIZE;
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: data, total: count ?? data.length };
}

/** ประกาศเดียว (คืน null ถ้าไม่พบหรือยังไม่เผยแพร่) */
export async function fetchListing(id) {
  const { data, error } = await db().from("listings").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
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
export async function submitListing(listing, photos, deedFiles) {
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
  if (error) throw error;
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

/** ประกาศตามสถานะ พร้อมข้อมูลผู้ขาย และลิงก์ชั่วคราว (1 ชม.) ของสำเนาโฉนด */
export async function fetchAdminListings(status) {
  const { data, error } = await db()
    .from("listings")
    .select(`${PUBLIC_COLUMNS},listing_private(*)`)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const deedPaths = data.flatMap((row) => row.listing_private?.deed_files || []);
  const signed = {};
  if (deedPaths.length) {
    const { data: urls, error: signError } = await db().storage.from(DEED_BUCKET).createSignedUrls(deedPaths, 3600);
    if (signError) throw signError;
    urls.forEach((u) => { if (u.signedUrl) signed[u.path] = u.signedUrl; });
  }
  return data.map((row) => ({
    ...row,
    deedLinks: (row.listing_private?.deed_files || []).map((path) => ({ path, url: signed[path] })),
  }));
}

export async function setListingStatus(id, status) {
  const { error } = await db().from("listings").update({ status }).eq("id", id);
  if (error) throw error;
}
