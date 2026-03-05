import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./JobDetail.css";

function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [statusText, setStatusText] = useState("Đang tải chi tiết công việc...");

  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        setStatusText("Không tìm thấy ID công việc.");
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setStatusText("Chưa cấu hình Supabase.");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !data) {
        setStatusText("Không tìm thấy công việc này.");
        return;
      }

      setJob(data as JobRecord);
      setStatusText("");
    };

    void loadJob();
  }, [id]);

  if (!job) {
    return (
      <div className="job-detail-page">
        <div className="job-detail-empty">
          <h1>Chi tiết công việc</h1>
          <p>{statusText}</p>
          <Link className="job-detail-back" to="/">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(job.tags) ? job.tags : [];
  const createdDate = new Date(job.created_at).toLocaleDateString("vi-VN");

  return (
    <div className="job-detail-page">
      <header className="job-detail-hero">
        <p className="job-detail-breadcrumb">
          <Link to="/">Trang chủ</Link> / Chi tiết công việc
        </p>
        <h1>{job.title}</h1>
        <p className="job-detail-company">{job.company}</p>
        <div className="job-detail-meta">
          <span>{job.salary}</span>
          <span>{job.location}</span>
          <span>Đăng ngày {createdDate}</span>
        </div>
      </header>

      <section className="job-detail-grid">
        <article className="job-detail-main">
          <div className="job-detail-section">
            <h2>Mô tả công việc</h2>
            <p>{job.description || "Nhà tuyển dụng chưa cập nhật mô tả chi tiết."}</p>
          </div>

          <div className="job-detail-section">
            <h2>Kỹ năng và yêu cầu</h2>
            <p>{job.job_requirement || "Đang cập nhật yêu cầu cho vị trí này."}</p>

            {tags.length > 0 ? (
              <ul>
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="job-detail-section">
            <h2>Yêu cầu ngoại ngữ</h2>
            <p>{job.language_requirement || "Không yêu cầu ngoại ngữ cụ thể."}</p>
          </div>

          <div className="job-detail-section">
            <h2>Quyền lợi</h2>
            <ul>
              <li>Thu nhập cạnh tranh theo năng lực.</li>
              <li>Môi trường làm việc chuyên nghiệp, ổn định.</li>
              <li>Đầy đủ chế độ bảo hiểm và phúc lợi theo quy định.</li>
            </ul>
          </div>

          <div className="job-detail-section job-detail-contact">
            <h2>Liên hệ ứng tuyển</h2>
            <p>{job.contact_info || "Nhà tuyển dụng chưa cập nhật thông tin liên hệ."}</p>
          </div>
        </article>

        <aside className="job-detail-side">
          <div className="job-detail-card">
            <h3>Tóm tắt vị trí</h3>
            <p>
              <strong>Công ty:</strong> {job.company}
            </p>
            <p>
              <strong>Địa điểm:</strong> {job.location}
            </p>
            <p>
              <strong>Mức lương:</strong> {job.salary}
            </p>
            {job.contact_info && (
              <p>
                <strong>Liên hệ:</strong> {job.contact_info}
              </p>
            )}
            <Link to={`/apply/${job.id}`} className="job-detail-apply-btn">
              Ứng tuyển ngay
            </Link>
            <Link to="/" className="job-detail-secondary">
              Xem việc làm khác
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default JobDetail;
