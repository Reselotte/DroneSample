import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { fetchListings, PAGE_SIZE } from "../../lib/listingsApi";
import { formatNumber } from "../../utils/formatNumber";
import ListingCard from "./ListingCard";
import ListingFilters, { EMPTY_FILTERS, toQuery } from "./ListingFilters";
import SetupNotice from "./SetupNotice";

// จำตัวกรองล่าสุดไว้ เวลากดเข้าไปดูประกาศแล้วกดกลับมา จะไม่ต้องเลือกใหม่
let lastFilters = EMPTY_FILTERS;

/** หน้ารายการที่ดินประกาศขาย (#/lands) */
export default function LandsPage() {
  const [filters, setFilters] = useState(lastFilters);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error | more
  const requestId = useRef(0);

  const load = async (nextFilters, nextPage) => {
    const id = ++requestId.current;
    setStatus(nextPage === 0 ? "loading" : "more");
    try {
      const result = await fetchListings(toQuery(nextFilters), nextPage);
      if (id !== requestId.current) return; // มีการค้นหาใหม่กว่าแล้ว
      setItems((prev) => (nextPage === 0 ? result.items : [...prev, ...result.items]));
      setTotal(result.total);
      setPage(nextPage);
      setStatus("ready");
    } catch (err) {
      if (id !== requestId.current) return;
      console.error(err);
      setStatus("error");
    }
  };

  useEffect(() => {
    lastFilters = filters;
    if (isSupabaseConfigured) load(filters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const hasMore = items.length < total;

  return (
    <section className="alt lands" data-page="lands">
      <div className="wrap">
        <div className="lands-head">
          <div>
            <p className="eyebrow">ซื้อขายที่ดิน</p>
            <h2>ที่ดินประกาศขาย</h2>
            <p className="sub">ทุกประกาศผ่านการตรวจสอบจากทีมงาน สนใจแปลงไหน ติดต่อทีมงานทาง LINE ได้เลย</p>
          </div>
          <a className="btn btn-line" href="#/post">+ ลงประกาศขายฟรี</a>
        </div>

        {!isSupabaseConfigured ? (
          <SetupNotice />
        ) : (
          <>
            <ListingFilters filters={filters} onChange={setFilters} />

            {status === "loading" && <div className="lands-msg">กำลังโหลดประกาศ…</div>}

            {status === "error" && (
              <div className="lands-msg">
                <b>โหลดประกาศไม่สำเร็จ</b>
                <button type="button" className="btn btn-ghost" onClick={() => load(filters, 0)}>ลองอีกครั้ง</button>
              </div>
            )}

            {(status === "ready" || status === "more") && (
              items.length === 0 ? (
                <div className="lands-msg">
                  <b>ยังไม่มีประกาศที่ตรงกับเงื่อนไข</b>
                  <span>ลองเปลี่ยนตัวกรอง หรือเป็นคนแรกที่ลงประกาศในพื้นที่นี้</span>
                  <a className="btn btn-line" href="#/post">ลงประกาศขายฟรี</a>
                </div>
              ) : (
                <>
                  <p className="lands-count">พบ {formatNumber(total)} ประกาศ</p>
                  <div className="lgrid">
                    {items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
                  </div>
                  {hasMore && (
                    <div className="lands-more">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={status === "more"}
                        onClick={() => load(filters, page + 1)}
                      >
                        {status === "more" ? "กำลังโหลด…" : `ดูเพิ่มอีก ${Math.min(PAGE_SIZE, total - items.length)} ประกาศ`}
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}
      </div>
    </section>
  );
}
