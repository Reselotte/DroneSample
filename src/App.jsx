import SiteHeader from "./components/layout/SiteHeader";
import SiteFooter from "./components/layout/SiteFooter";
import FloatingLineButton from "./components/layout/FloatingLineButton";
import ThemeToggle from "./components/layout/ThemeToggle";
import TextSizeToggle from "./components/layout/TextSizeToggle";
import AuthButton from "./components/layout/AuthButton";
import ScrollCue from "./components/layout/ScrollCue";
import RequireLogin from "./components/common/RequireLogin";
import MfaGate from "./components/common/MfaGate";
import useHashRoute from "./hooks/useHashRoute";
import HomePage from "./pages/HomePage/HomePage";
import LandsPage from "./pages/LandsPage/LandsPage";
import LandDetailPage from "./pages/LandsPage/LandDetailPage";
import PostListingPage from "./pages/PostListingPage/PostListingPage";
import WorksPage from "./pages/WorksPage/WorksPage";
import StepsPage from "./pages/StepsPage/StepsPage";
import CallbackPage from "./pages/CallbackPage/CallbackPage";
import FaqPage from "./pages/FaqPage/FaqPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import AdminPage from "./pages/AdminPage/AdminPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import MyListingsPage from "./pages/MyListingsPage/MyListingsPage";

/** หน้าที่ต้องเข้าสู่ระบบก่อนใช้ (ส่งข้อมูลเข้าระบบ) */
const LOGIN_REQUIRED = ["post", "callback", "mylistings"];
// หน้าที่ใช้บัญชี: บัญชีที่เปิด 2FA ต้องกรอกรหัสจากแอปก่อน
const MFA_PAGES = [...LOGIN_REQUIRED, "login", "profile", "admin"];

/** ชื่อหน้าใน URL (/ชื่อ) → หน้านั้น */
const PAGE_COMPONENTS = {
  home: HomePage,
  lands: LandsPage,
  post: PostListingPage,
  works: WorksPage,
  steps: StepsPage,
  callback: CallbackPage,
  faq: FaqPage,
  contact: ContactPage,
  admin: AdminPage,
  login: LoginPage,
  profile: ProfilePage,
  mylistings: MyListingsPage,
};

export default function App() {
  const { page, param } = useHashRoute();
  // /lands/<รหัส> = หน้ารายละเอียดประกาศ
  const Page = page === "lands" && param ? LandDetailPage : PAGE_COMPONENTS[page];

  return (
    <>
      <SiteHeader currentPage={page} currentParam={param} />
      {/* อยู่นอก header เพื่อให้ลอยค้างมุมขวาบนตลอด แม้แถบเมนูจะซ่อนตอนเลื่อนลง */}
      <ThemeToggle />
      <AuthButton currentPage={page} />
      {/* ปุ่มปรับขนาดตัวอักษร: ลอยมุมขวาล่าง */}
      <TextSizeToggle />
      {/* key ของแต่ละชิ้นต้องไม่ซ้ำกัน (ถ้าซ้ำ React จะไม่ลบหน้าเก่า หน้าใหม่ไปต่อท้ายหน้าเก่า) */}
      {(() => {
        const content = LOGIN_REQUIRED.includes(page)
          ? <RequireLogin key={`gate:${page}`} page={page}><Page key={`page:${page}/${param}`} param={param} /></RequireLogin>
          : <Page key={`page:${page}/${param}`} param={param} />;
        return MFA_PAGES.includes(page) ? <MfaGate key={`mfa:${page}`}>{content}</MfaGate> : content;
      })()}
      <SiteFooter />
      {page !== "admin" && <FloatingLineButton />}
      {/* key: เปลี่ยนหน้าแล้วเริ่มนับใหม่ (บนสุดของหน้าใหม่แสดงป้ายเต็มอีกครั้ง) */}
      <ScrollCue key={`cue:${page}/${param}`} showLabel={page === "home"} />
    </>
  );
}
