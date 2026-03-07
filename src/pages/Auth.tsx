import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

type AuthMode = "signin" | "signup";

function resolveMode(search: string): AuthMode {
  const mode = new URLSearchParams(search).get("mode");
  return mode === "signup" ? "signup" : "signin";
}

function resolveNextPath(search: string): string {
  const next = new URLSearchParams(search).get("next");
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(resolveMode(location.search));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusText, setStatusText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const nextPath = resolveNextPath(location.search);

  useEffect(() => {
    setMode(resolveMode(location.search));
  }, [location.search]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatusText("");

    if (mode === "signin") {
      const result = await signIn(email, password);
      if (result.error) {
        setStatusText(`Đăng nhập thất bại: ${result.error}`);
        setSubmitting(false);
        return;
      }

      setStatusText("Đăng nhập thành công.");
      navigate(nextPath);
      return;
    }

    const result = await signUp(email, password, fullName);
    if (result.error) {
      setStatusText(`Đăng ký thất bại: ${result.error}`);
      setSubmitting(false);
      return;
    }

    if (result.needsEmailConfirm) {
      setStatusText(
        "Đăng ký thành công. Vui lòng mở email để xác nhận tài khoản trước khi đăng nhập."
      );
    } else {
      setStatusText("Đăng ký thành công. Bạn đã được đăng nhập.");
      navigate(nextPath);
    }
    setSubmitting(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-breadcrumb">
          <Link to="/">Trang chủ</Link> / {mode === "signin" ? "Đăng nhập" : "Đăng ký"}
        </p>
        <h1>{mode === "signin" ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}</h1>
        <p className="auth-subtitle">
          {mode === "signin"
            ? "Đăng nhập để ứng tuyển và quản lý tin tuyển dụng."
            : "Tạo tài khoản để bắt đầu ứng tuyển công việc tại Ninh Bình."}
        </p>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "signup" && (
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Họ và tên"
            />
          )}

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu"
            type="password"
            minLength={6}
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting
              ? "Đang xử lý..."
              : mode === "signin"
              ? "Đăng nhập"
              : "Đăng ký tài khoản"}
          </button>
        </form>

        {statusText && <p className="auth-status">{statusText}</p>}
        <p className="auth-alt-action">
          {mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button
            type="button"
            className="auth-alt-link"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
