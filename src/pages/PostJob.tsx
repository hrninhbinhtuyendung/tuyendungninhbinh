import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import "./PostJob.css";

type JobForm = {
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string;
  jobRequirement: string;
  languageRequirement: string;
  contactInfo: string;
  description: string;
};

const defaultForm: JobForm = {
  title: "",
  company: "",
  salary: "",
  location: "Ninh Bình",
  tags: "",
  jobRequirement: "",
  languageRequirement: "",
  contactInfo: "",
  description: "",
};

function PostJob() {
  const { user } = useAuth();
  const [form, setForm] = useState<JobForm>(defaultForm);
  const [statusText, setStatusText] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [submitting, setSubmitting] = useState(false);

  const tagCount = useMemo(
    () =>
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean).length,
    [form.tags]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setStatusType("error");
      setStatusText("Chưa cấu hình Supabase. Hãy thêm biến môi trường trước.");
      return;
    }

    if (!user) {
      setStatusType("error");
      setStatusText("Bạn cần đăng nhập trước khi đăng tin tuyển dụng.");
      return;
    }

    if (!form.title || !form.company || !form.salary || !form.location) {
      setStatusType("error");
      setStatusText("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    setSubmitting(true);
    setStatusType("info");
    setStatusText("Đang đăng tin...");

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      user_id: user.id,
      title: form.title,
      company: form.company,
      salary: form.salary,
      location: form.location,
      tags,
      job_requirement: form.jobRequirement || null,
      language_requirement: form.languageRequirement || null,
      contact_info: form.contactInfo || null,
      description: form.description || null,
    };

    const { error } = await supabase.from("jobs").insert(payload);

    if (error) {
      const missingUserIdColumn =
        error.message.includes("user_id") &&
        error.message.toLowerCase().includes("column");

      if (!missingUserIdColumn) {
        setStatusType("error");
        setStatusText(`Đăng tin thất bại: ${error.message}`);
        setSubmitting(false);
        return;
      }

      const fallbackInsert = await supabase.from("jobs").insert({
        title: form.title,
        company: form.company,
        salary: form.salary,
        location: form.location,
        tags,
        job_requirement: form.jobRequirement || null,
        language_requirement: form.languageRequirement || null,
        contact_info: form.contactInfo || null,
        description: form.description || null,
      });

      if (fallbackInsert.error) {
        setStatusType("error");
        setStatusText(`Đăng tin thất bại: ${fallbackInsert.error.message}`);
        setSubmitting(false);
        return;
      }

      setStatusType("info");
      setStatusText(
        "Đăng tin thành công. Lưu ý: bảng jobs chưa có cột user_id nên chưa gắn được theo tài khoản."
      );
      setForm(defaultForm);
      setSubmitting(false);
      return;
    }

    setStatusType("success");
    setStatusText("Đăng tin thành công.");
    setForm(defaultForm);
    setSubmitting(false);
  };

  return (
    <div className="post-job-page">
      <div className="post-job-layout">
        <section className="post-job-form-card">
          <h1>Đăng tuyển dụng</h1>
          <p>Tạo tin tuyển dụng mới để tiếp cận ứng viên phù hợp tại Ninh Bình.</p>
          {!user && (
            <p className="post-job-login-note">
              Bạn chưa đăng nhập. <Link to="/auth?mode=signin">Đăng nhập ngay</Link>
            </p>
          )}

          <form onSubmit={onSubmit} className="post-job-form">
            <label>
              Tiêu đề việc làm
              <input
                placeholder="Ví dụ: Nhân viên kinh doanh"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              Tên công ty
              <input
                placeholder="Ví dụ: Công ty ABC"
                value={form.company}
                onChange={(event) =>
                  setForm({ ...form, company: event.target.value })
                }
              />
            </label>

            <div className="post-job-row">
              <label>
                Mức lương
                <input
                  placeholder="Ví dụ: 12 - 20 triệu"
                  value={form.salary}
                  onChange={(event) =>
                    setForm({ ...form, salary: event.target.value })
                  }
                />
              </label>
              <label>
                Địa điểm
                <input
                  placeholder="Ninh Bình"
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                />
              </label>
            </div>

            <label>
              Tags (phân cách bằng dấu phẩy)
              <input
                placeholder="Ví dụ: Full-time, Sales, 1-2 năm"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
            </label>

            <label>
              Yêu cầu công việc
              <textarea
                placeholder="Ví dụ: Tối thiểu 1 năm kinh nghiệm, kỹ năng giao tiếp tốt..."
                rows={4}
                value={form.jobRequirement}
                onChange={(event) =>
                  setForm({ ...form, jobRequirement: event.target.value })
                }
              />
            </label>

            <label>
              Yêu cầu ngoại ngữ
              <input
                placeholder="Ví dụ: Tiếng Anh giao tiếp, tiếng Trung HSK4..."
                value={form.languageRequirement}
                onChange={(event) =>
                  setForm({ ...form, languageRequirement: event.target.value })
                }
              />
            </label>

            <label>
              Liên hệ ứng tuyển
              <input
                placeholder="Ví dụ: 09xxxxxxx - hr@congty.com - Chị Lan"
                value={form.contactInfo}
                onChange={(event) =>
                  setForm({ ...form, contactInfo: event.target.value })
                }
              />
            </label>

            <label>
              Mô tả công việc
              <textarea
                placeholder="Mô tả nhiệm vụ chính, yêu cầu, quyền lợi..."
                rows={6}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>

            <button type="submit" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Đăng tin"}
            </button>
          </form>

          {statusText && <p className={`post-job-status ${statusType}`}>{statusText}</p>}
        </section>

        <aside className="post-job-side">
          <div className="post-job-side-card">
            <h2>Xem nhanh tin đăng</h2>
            <strong>{form.title || "Chưa nhập tiêu đề"}</strong>
            <p>{form.company || "Chưa nhập tên công ty"}</p>
            <div className="post-job-side-meta">
              <span>{form.salary || "Mức lương"}</span>
              <span>{form.location || "Địa điểm"}</span>
            </div>
            <p>
              <strong>Yêu cầu công việc:</strong> {form.jobRequirement || "Chưa nhập"}
            </p>
            <p>
              <strong>Yêu cầu ngoại ngữ:</strong>{" "}
              {form.languageRequirement || "Chưa nhập"}
            </p>
            <p>
              <strong>Liên hệ ứng tuyển:</strong> {form.contactInfo || "Chưa nhập"}
            </p>
          </div>

          <div className="post-job-side-card">
            <h3>Chất lượng nội dung</h3>
            <p>Số tags: {tagCount}</p>
            <p>Độ dài mô tả: {form.description.trim().length} ký tự</p>
            <small>
              Gợi ý: Mô tả trên 150 ký tự và có ít nhất 3 tags sẽ tăng khả năng tiếp
              cận ứng viên.
            </small>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PostJob;
