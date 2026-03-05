import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./ApplyJob.css";

type ApplyForm = {
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  expectedSalary: string;
  coverLetter: string;
};

const defaultForm: ApplyForm = {
  fullName: "",
  email: "",
  phone: "",
  experience: "",
  expectedSalary: "",
  coverLetter: "",
};

function ApplyJob() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [form, setForm] = useState<ApplyForm>(defaultForm);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        setStatusType("error");
        setStatusText("Không tìm thấy tin tuyển dụng.");
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setStatusType("error");
        setStatusText("Chưa cấu hình Supabase.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error || !data) {
        setStatusType("error");
        setStatusText("Không tìm thấy tin tuyển dụng.");
        setLoading(false);
        return;
      }

      setJob(data as JobRecord);
      setLoading(false);
      setStatusText("");
    };

    void loadJob();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email || "",
    }));
  }, [user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase || !job) {
      setStatusType("error");
      setStatusText("Chưa sẵn sàng để gửi ứng tuyển.");
      return;
    }

    if (!form.fullName || !form.email || !form.phone) {
      setStatusType("error");
      setStatusText("Vui lòng nhập đầy đủ họ tên, email và số điện thoại.");
      return;
    }

    setSubmitting(true);
    setStatusType("info");
    setStatusText("Đang gửi hồ sơ ứng tuyển...");

    let cvUrl: string | null = null;
    let cvFileName: string | null = null;

    if (cvFile) {
      const cleanFileName = cvFile.name.replace(/\s+/g, "-").toLowerCase();
      const filePath = `job-${job.id}/${Date.now()}-${cleanFileName}`;

      const uploadResult = await supabase.storage
        .from("application-cvs")
        .upload(filePath, cvFile, { upsert: false });

      if (uploadResult.error) {
        setStatusType("error");
        setStatusText(`Upload CV thất bại: ${uploadResult.error.message}`);
        setSubmitting(false);
        return;
      }

      cvUrl = supabase.storage.from("application-cvs").getPublicUrl(filePath).data.publicUrl;
      cvFileName = cvFile.name;
    }

    const payload = {
      job_id: job.id,
      user_id: user?.id || null,
      full_name: form.fullName,
      email: form.email,
      phone: form.phone,
      experience: form.experience || null,
      expected_salary: form.expectedSalary || null,
      cover_letter: form.coverLetter || null,
      cv_url: cvUrl,
      cv_file_name: cvFileName,
    };

    const { error } = await supabase.from("job_applications").insert(payload);

    if (error) {
      setStatusType("error");
      setStatusText(`Gửi ứng tuyển thất bại: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setStatusType("success");
    setStatusText("Ứng tuyển thành công. Nhà tuyển dụng có thể xem CV của bạn.");
    setForm((prev) => ({
      ...defaultForm,
      email: user?.email || prev.email || "",
    }));
    setCvFile(null);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="apply-job-page">
        <div className="apply-job-empty">
          <h1>Ứng tuyển công việc</h1>
          <p>Đang tải thông tin tin tuyển dụng...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="apply-job-page">
        <div className="apply-job-empty">
          <h1>Ứng tuyển công việc</h1>
          <p>{statusText || "Không tìm thấy tin tuyển dụng."}</p>
          <Link to="/" className="apply-job-back">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-job-page">
      <section className="apply-job-hero">
        <p className="apply-job-breadcrumb">
          <Link to="/">Trang chủ</Link> / <Link to={`/job/${job.id}`}>Chi tiết công việc</Link> /
          Ứng tuyển
        </p>
        <h1>Ứng tuyển ngay</h1>
        <p className="apply-job-role">{job.title}</p>
        <p className="apply-job-company">{job.company}</p>
      </section>

      <section className="apply-job-layout">
        <form className="apply-job-form" onSubmit={onSubmit}>
          <h2>Thông tin ứng viên</h2>

          <label>
            Họ và tên *
            <input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              placeholder="Ví dụ: Nguyễn Văn A"
            />
          </label>

          <div className="apply-job-row">
            <label>
              Email *
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="example@gmail.com"
              />
            </label>
            <label>
              Số điện thoại *
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="09xxxxxxxx"
              />
            </label>
          </div>

          <div className="apply-job-row">
            <label>
              Kinh nghiệm
              <input
                value={form.experience}
                onChange={(event) => setForm({ ...form, experience: event.target.value })}
                placeholder="Ví dụ: 2 năm kinh nghiệm bán hàng"
              />
            </label>
            <label>
              Mức lương mong muốn
              <input
                value={form.expectedSalary}
                onChange={(event) => setForm({ ...form, expectedSalary: event.target.value })}
                placeholder="Ví dụ: 12 - 15 triệu"
              />
            </label>
          </div>

          <label>
            Upload CV (PDF/DOC) (không bắt buộc)
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <label>
            Giới thiệu ngắn / Thư ứng tuyển
            <textarea
              rows={6}
              value={form.coverLetter}
              onChange={(event) => setForm({ ...form, coverLetter: event.target.value })}
              placeholder="Giới thiệu ngắn về kinh nghiệm, thế mạnh và lý do bạn phù hợp với vị trí này..."
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi ứng tuyển"}
          </button>

          {statusText && <p className={`apply-job-status ${statusType}`}>{statusText}</p>}
        </form>

        <aside className="apply-job-side">
          <h3>Tóm tắt vị trí</h3>
          <p>
            <strong>Vị trí:</strong> {job.title}
          </p>
          <p>
            <strong>Công ty:</strong> {job.company}
          </p>
          <p>
            <strong>Mức lương:</strong> {job.salary}
          </p>
          <p>
            <strong>Địa điểm:</strong> {job.location}
          </p>
          <Link to={`/job/${job.id}`} className="apply-job-back">
            Quay lại tin tuyển dụng
          </Link>
        </aside>
      </section>
    </div>
  );
}

export default ApplyJob;
