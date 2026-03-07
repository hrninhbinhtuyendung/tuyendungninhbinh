import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import "./ApplicationNotification.css";

type ApplicationRecord = {
  id: number;
  job_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  experience: string | null;
  expected_salary: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  cv_file_name: string | null;
  created_at: string;
};

export default function ApplicationNotification() {
  const { id } = useParams();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [statusText, setStatusText] = useState("Đang tải chi tiết thông báo...");

  useEffect(() => {
    const loadDetail = async () => {
      if (!id) {
        setStatusText("Không tìm thấy thông báo.");
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setStatusText("Chưa cấu hình Supabase.");
        return;
      }

      const applicationResult = await supabase
        .from("job_applications")
        .select(
          "id, job_id, full_name, email, phone, experience, expected_salary, cover_letter, cv_url, cv_file_name, created_at"
        )
        .eq("id", Number(id))
        .single();

      if (applicationResult.error || !applicationResult.data) {
        setStatusText("Không tìm thấy hồ sơ ứng tuyển.");
        return;
      }

      const applicationData = applicationResult.data as ApplicationRecord;
      setApplication(applicationData);

      const jobResult = await supabase
        .from("jobs")
        .select("title")
        .eq("id", applicationData.job_id)
        .single();

      setJobTitle((jobResult.data as { title?: string } | null)?.title || "Vị trí tuyển dụng");
      setStatusText("");
    };

    void loadDetail();
  }, [id]);

  if (!application) {
    return (
      <div className="app-notification-page">
        <div className="app-notification-empty">
          <h1>Chi tiết thông báo</h1>
          <p>{statusText}</p>
          <Link to="/" className="app-notification-back">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-notification-page">
      <section className="app-notification-card">
        <p className="app-notification-breadcrumb">
          <Link to="/">Trang chủ</Link> / Chi tiết thông báo
        </p>
        <h1>{application.full_name}</h1>
        <p className="app-notification-subtitle">
          Đã ứng tuyển vào: <strong>{jobTitle}</strong>
        </p>
        <p className="app-notification-time">
          Thời gian: {new Date(application.created_at).toLocaleString("vi-VN")}
        </p>

        <div className="app-notification-grid">
          <div>
            <span>Email</span>
            <p>{application.email || "Chưa cập nhật"}</p>
          </div>
          <div>
            <span>Số điện thoại</span>
            <p>{application.phone || "Chưa cập nhật"}</p>
          </div>
          <div>
            <span>Kinh nghiệm</span>
            <p>{application.experience || "Chưa cập nhật"}</p>
          </div>
          <div>
            <span>Lương mong muốn</span>
            <p>{application.expected_salary || "Chưa cập nhật"}</p>
          </div>
          <div className="full">
            <span>Thư giới thiệu</span>
            <p>{application.cover_letter || "Chưa cập nhật"}</p>
          </div>
        </div>

        {application.cv_url && (
          <a
            className="app-notification-cv"
            href={application.cv_url}
            target="_blank"
            rel="noreferrer"
          >
            Xem CV {application.cv_file_name ? `(${application.cv_file_name})` : ""}
          </a>
        )}

        <Link to="/" className="app-notification-back">
          Quay lại trang chủ
        </Link>
      </section>
    </div>
  );
}
