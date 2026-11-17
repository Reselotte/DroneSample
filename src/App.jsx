import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";
import FloatingLineButton from "./components/layout/FloatingLineButton";
import ThemeToggle from "./components/layout/ThemeToggle";
import TextSizeToggle from "./components/layout/TextSizeToggle";
import ScrollCue from "./components/layout/ScrollCue";
import useHashRoute from "./hooks/useHashRoute";
import HomePage from "./pages/HomePage/HomePage";
import LandsPage from "./pages/LandsPage/LandsPage";
import LandDetailPage from "./pages/LandsPage/LandDetailPage";
import PostListingPage from "./pages/PostListingPage/PostListingPage";
import WorksPage from "./pages/WorksPage/WorksPage";
import StepsPage from "./pages/StepsPage/StepsPage";
import CallbackPage from "./pages/CallbackPage/CallbackPage";
import CalcPage from "./pages/CalcPage/CalcPage";
import FaqPage from "./pages/FaqPage/FaqPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import AdminPage from "./pages/AdminPage/AdminPage";

/** ชื่อหน้าใน URL (#/ชื่อ) → หน้านั้น */
const PAGE_COMPONENTS = {
  home: HomePage,
  lands: LandsPage,
  post: PostListingPage,
  works: WorksPage,
  steps: StepsPage,
  callback: CallbackPage,
  calc: CalcPage,
  faq: FaqPage,
  contact: ContactPage,
  admin: AdminPage,
};

export default function App() {
  const { page, param } = useHashRoute();
  // #/lands/<รหัส> = หน้ารายละเอียดประกาศ
  const Page = page === "lands" && param ? LandDetailPage : PAGE_COMPONENTS[page];

  return (
    <>
      <SiteHeader currentPage={page} />
      {/* อยู่นอก header เพื่อให้ลอยค้างมุมขวาบนตลอด แม้แถบเมนูจะซ่อนตอนเลื่อนลง */}
      <ThemeToggle />
      <TextSizeToggle />
      {/* key ของแต่ละชิ้นต้องไม่ซ้ำกัน (ถ้าซ้ำ React จะไม่ลบหน้าเก่า หน้าใหม่ไปต่อท้ายหน้าเก่า) */}
      <Page key={`page:${page}/${param}`} param={param} />
      <SiteFooter />
      {page !== "admin" && <FloatingLineButton />}
      {/* key: เปลี่ยนหน้าแล้วเริ่มนับใหม่ (บนสุดของหน้าใหม่แสดงป้ายเต็มอีกครั้ง) */}
      <ScrollCue key={`cue:${page}/${param}`} showLabel={page === "home"} />
    </>
  );
}
