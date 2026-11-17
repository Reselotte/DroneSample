import ContourMapSvg from "../../components/common/ContourMapSvg";
import serviceTypes from "../../data/serviceTypes";

/** การ์ด "รองรับที่ดินทุกประเภท" ในหน้าแรก */
export default function ServiceTypesSection() {
  return (
    <section data-page="home">
      <div className="wrap">
        <p className="eyebrow">ประเภทที่ดินที่ให้บริการ</p>
        <h2>รองรับที่ดินทุกประเภท</h2>
        <div className="grid g5" style={{ marginTop: 22 }}>
          {serviceTypes.map(({ title, text, mapMode }) => (
            <div className="card tile" key={title}>
              <div className="im"><ContourMapSvg mode={mapMode} cover /></div>
              <div className="tx">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
