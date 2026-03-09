import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./JobDetail.css";

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [statusText, setStatusText] = useState("Đang tải chi tiết công việc...");
  const [isSaved, setIsSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

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

  useEffect(() => {
    if (!user || !id) {
      setIsSaved(false);
      setSaveStatus("");
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setIsSaved(false);
      setSaveStatus("");
      return;
    }

    const loadSavedState = async () => {
      const { data, error } = await client
        .from("job_saves")
        .select("id")
        .eq("user_id", user.id)
        .eq("job_id", Number(id))
        .maybeSingle();

      if (error) {
        setSaveStatus(`Không kiểm tra được trạng thái đã lưu: ${error.message}`);
        setIsSaved(false);
        return;
      }

      setIsSaved(Boolean(data));
      setSaveStatus("");
    };

    void loadSavedState();
  }, [id, user]);

  const toggleSave = async () => {
    if (!id) return;

    if (!user) {
      navigate(`/auth?mode=signin&next=${encodeURIComponent(`/job/${id}`)}`);
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setSaveStatus("Chưa cấu hình Supabase để đồng bộ việc đã lưu.");
      return;
    }

    const jobId = Number(id);
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    setSaveStatus(wasSaved ? "Đã bỏ lưu công việc." : "Đã lưu công việc.");

    if (wasSaved) {
      const { error } = await client
        .from("job_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (!error) return;

      setIsSaved(true);
      setSaveStatus(`Bỏ lưu thất bại: ${error.message}`);
      return;
    }

    const { error } = await client.from("job_saves").upsert(
      { user_id: user.id, job_id: jobId },
      { onConflict: "user_id,job_id" }
    );

    if (!error) return;

    setIsSaved(false);
    setSaveStatus(`Lưu thất bại: ${error.message}`);
  };

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
            <button
              type="button"
              className={`job-detail-save-btn${isSaved ? " saved" : ""}`}
              onClick={() => void toggleSave()}
              aria-pressed={isSaved}
              title={user ? (isSaved ? "Bỏ lưu" : "Lưu công việc") : "Đăng nhập để lưu"}
            >
              {isSaved ? "Đã lưu" : "Lưu công việc"}
            </button>
            <Link to={`/apply/${job.id}`} className="job-detail-apply-btn">
              Ứng tuyển ngay
            </Link>
            <Link to="/" className="job-detail-secondary">
              Xem việc làm khác
            </Link>
            {saveStatus && <p className="job-detail-save-status">{saveStatus}</p>}
          </div>
        </aside>
      </section>
    </div>
  );
}

export default JobDetail;
