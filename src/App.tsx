import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import hrLogo from "./assets/logo_HR.jpg";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AccountProfile from "./pages/AccountProfile";
import ApplicationNotification from "./pages/ApplicationNotification";
import ApplyJob from "./pages/ApplyJob";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import JobDetail from "./pages/JobDetail";
import Messages from "./pages/Messages";
import PostJob from "./pages/PostJob";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SavedJobs from "./pages/SavedJobs";
import UploadCv from "./pages/UploadCv";

function AppLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const showTopbar = location.pathname !== "/";

  return (
    <div className="app-shell">
      {showTopbar && (
        <header className="app-topbar">
          <div className="app-brand">
            <img src={hrLogo} alt="HR Ninh Bình" className="app-brand-logo" />
            Tuyển dụng <span>Ninh Bình</span>
          </div>

          <nav className="app-nav">
            <NavLink
              to="/"
              className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/post"
              className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
            >
              Đăng tuyển
            </NavLink>
            {user && (
              <NavLink
                to="/account"
                className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
              >
                Hồ sơ
              </NavLink>
            )}
            {user && (
              <NavLink
                to="/saved"
                className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
              >
                Đã lưu
              </NavLink>
            )}
            {user && (
              <NavLink
                to="/messages"
                className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
              >
                Tin nhắn
              </NavLink>
            )}
            {!user ? (
              <Link className="app-link" to="/auth?mode=signin">
                Đăng nhập
              </Link>
            ) : (
              <button
                className="app-link app-link-button"
                onClick={() => void signOut()}
              >
                Đăng xuất
              </button>
            )}
          </nav>
        </header>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/apply/:id" element={<ApplyJob />} />
          <Route path="/application-notification/:id" element={<ApplicationNotification />} />
          <Route path="/post" element={<PostJob />} />
          <Route path="/upload-cv" element={<UploadCv />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/account" element={<AccountProfile />} />
          <Route path="/saved" element={<SavedJobs />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
