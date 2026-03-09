import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import "./UploadCv.css";

type CandidateCv = {
  id: number;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  position: string;
  work_experience: string | null;
  salary_range: string | null;
  salary_detail: string | null;
  language: string | null;
  language_level: string | null;
  cv_url: string;
  file_name: string;
  created_at: string;
};

type CandidateForm = {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  workExperience: string;
  salaryRange: string;
  salaryDetail: string;
  language: string;
  languageLevel: string;
};

const defaultForm: CandidateForm = {
  fullName: "",
  email: "",
  phone: "",
  position: "",
  workExperience: "",
  salaryRange: "5-10",
  salaryDetail: "",
  language: "tieng-anh",
  languageLevel: "so-cap",
};

const salaryOptions = [
  { value: "5-10", label: "Từ 5.000.000 đến 10.000.000" },
  { value: "10-15", label: "Từ 10.000.000 đến 15.000.000" },
  { value: "15-20", label: "Từ 15.000.000 đến 20.000.000" },
  { value: "20+", label: "Trên 20.000.000" },
  { value: "custom", label: "Chi tiết (tự nhập mức lương mong muốn)" },
];

const languageOptions = [
  { value: "khong-co", label: "Không có ngoại ngữ" },
  { value: "tieng-anh", label: "Tiếng Anh" },
  { value: "tieng-trung", label: "Tiếng Trung" },
];

const languageLevelOptions = [
  { value: "so-cap", label: "Sơ cấp" },
  { value: "trung-cap", label: "Trung cấp" },
  { value: "cao-cap", label: "Cao cấp" },
];

function formatDate(date?: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("vi-VN");
}

function formatLanguageLabel(language?: string | null) {
  if (language === "khong-co") return "Không có ngoại ngữ";
  if (language === "tieng-trung") return "Tiếng Trung";
  if (language === "tieng-anh") return "Tiếng Anh";
  return "";
}

function formatLanguageLevelLabel(level?: string | null) {
  if (level === "so-cap") return "Sơ cấp";
  if (level === "trung-cap") return "Trung cấp";
  if (level === "cao-cap") return "Cao cấp";
  return "";
}

function buildSafeStorageFileName(originalName: string) {
  const dotIndex = originalName.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex < originalName.length - 1;
  const baseName = hasExtension ? originalName.slice(0, dotIndex) : originalName;
  const extension = hasExtension ? originalName.slice(dotIndex).toLowerCase() : "";

  const safeBase = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return `${safeBase || "cv"}${extension}`;
}

function UploadCv() {
  const { user } = useAuth();
  const [candidateList, setCandidateList] = useState<CandidateCv[]>([]);
  const [candidateStatus, setCandidateStatus] = useState("");
  const [candidateForm, setCandidateForm] = useState<CandidateForm>(defaultForm);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateCv | null>(null);

  useEffect(() => {
    const loadCandidateCvs = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setCandidateStatus(
          "Chưa cấu hình Supabase nên chưa hiển thị được danh sách CV ứng viên."
        );
        return;
      }

      const { data, error } = await supabase
        .from("candidate_cvs")
        .select(
          "id, user_id, full_name, email, phone, position, work_experience, salary_range, salary_detail, language, language_level, cv_url, file_name, created_at"
        )
        .order("id", { ascending: false })
        .limit(20);

      if (error) {
        setCandidateStatus(
          "Chưa tải được danh sách CV. Hãy tạo bảng candidate_cvs trong Supabase."
        );
        return;
      }

      setCandidateList((data ?? []) as CandidateCv[]);
    };

    void loadCandidateCvs();
  }, []);

  const resetForm = () => {
    setCandidateForm(defaultForm);
    setCandidateFile(null);
    setEditingCandidate(null);
  };

  const onEditCandidate = (candidate: CandidateCv) => {
    setEditingCandidate(candidate);
    setCandidateForm({
      fullName: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      position: candidate.position,
      workExperience: candidate.work_experience ?? "",
      salaryRange: candidate.salary_range ?? "5-10",
      salaryDetail: candidate.salary_detail ?? "",
      language: candidate.language ?? "tieng-anh",
      languageLevel: candidate.language_level ?? "so-cap",
    });
    setCandidateFile(null);
    setCandidateStatus("Đã nạp thông tin CV vào form. Bạn có thể chỉnh sửa và lưu.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmitCv = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setCandidateStatus("Chưa cấu hình Supabase.");
      return;
    }

    if (!candidateForm.fullName || !candidateForm.email || !candidateForm.position) {
      setCandidateStatus("Vui lòng nhập đầy đủ thông tin ứng viên.");
      return;
    }

    if (candidateForm.salaryRange === "custom" && !candidateForm.salaryDetail.trim()) {
      setCandidateStatus("Vui lòng nhập mức lương mong muốn chi tiết.");
      return;
    }

    setUploadingCv(true);

    let cvUrl = editingCandidate?.cv_url ?? "";
    let fileName = editingCandidate?.file_name ?? "";

    if (candidateFile) {
      const cleanFileName = buildSafeStorageFileName(candidateFile.name);
      const filePath = `${Date.now()}-${cleanFileName}`;

      const uploadResult = await supabase.storage
        .from("cvs")
        .upload(filePath, candidateFile, { upsert: false });

      if (uploadResult.error) {
        setCandidateStatus(`Upload CV thất bại: ${uploadResult.error.message}`);
        setUploadingCv(false);
        return;
      }

      cvUrl = supabase.storage.from("cvs").getPublicUrl(filePath).data.publicUrl;
      fileName = candidateFile.name;
    }

    if (!editingCandidate && !candidateFile) {
      setCandidateStatus("Vui lòng chọn file CV trước khi upload.");
      setUploadingCv(false);
      return;
    }

    if (editingCandidate) {
      const updateResult = await supabase
        .from("candidate_cvs")
        .update({
          user_id: user?.id ?? editingCandidate.user_id ?? null,
          full_name: candidateForm.fullName,
          email: candidateForm.email,
          phone: candidateForm.phone || null,
          position: candidateForm.position,
          work_experience: candidateForm.workExperience || null,
          salary_range: candidateForm.salaryRange,
          salary_detail:
            candidateForm.salaryRange === "custom"
              ? candidateForm.salaryDetail
              : null,
          language: candidateForm.language,
          language_level:
            candidateForm.language === "khong-co"
              ? null
              : candidateForm.languageLevel,
          cv_url: cvUrl,
          file_name: fileName,
        })
        .eq("id", editingCandidate.id)
        .select(
          "id, user_id, full_name, email, phone, position, work_experience, salary_range, salary_detail, language, language_level, cv_url, file_name, created_at"
        )
        .single();

      if (updateResult.error) {
        setCandidateStatus(`Cập nhật CV thất bại: ${updateResult.error.message}`);
        setUploadingCv(false);
        return;
      }

      const updated = updateResult.data as CandidateCv;
      setCandidateList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setCandidateStatus("Cập nhật CV thành công.");
      resetForm();
      setUploadingCv(false);
      return;
    }

    const insertResult = await supabase
      .from("candidate_cvs")
      .insert({
        user_id: user?.id ?? null,
        full_name: candidateForm.fullName,
        email: candidateForm.email,
        phone: candidateForm.phone || null,
        position: candidateForm.position,
        work_experience: candidateForm.workExperience || null,
        salary_range: candidateForm.salaryRange,
        salary_detail:
          candidateForm.salaryRange === "custom"
            ? candidateForm.salaryDetail
            : null,
        language: candidateForm.language,
        language_level:
          candidateForm.language === "khong-co"
            ? null
            : candidateForm.languageLevel,
        cv_url: cvUrl,
        file_name: fileName,
      })
      .select(
        "id, user_id, full_name, email, phone, position, work_experience, salary_range, salary_detail, language, language_level, cv_url, file_name, created_at"
      )
      .single();

    if (insertResult.error) {
      setCandidateStatus(`Lưu thông tin ứng viên thất bại: ${insertResult.error.message}`);
      setUploadingCv(false);
      return;
    }

    setCandidateList((prev) => [insertResult.data as CandidateCv, ...prev]);
    setCandidateStatus("Upload CV thành công. Ứng viên đã hiển thị bên dưới.");
    resetForm();
    setUploadingCv(false);
  };

  return (
    <div className="upload-cv-page">
      <section className="upload-cv-hero">
        <h1>Đăng CV miễn phí</h1>
        <p>Nộp hồ sơ nhanh để nhà tuyển dụng tại Ninh Bình tìm thấy bạn.</p>
      </section>

      <section className="candidate-section">
        <div className="job-heading candidate-header">
          <h2>Ứng viên nộp CV</h2>
          <span>Khi ứng viên upload CV sẽ hiển thị tại đây</span>
        </div>

        <form className="candidate-form" onSubmit={onSubmitCv}>
          <label>
            Họ và tên
            <input
              value={candidateForm.fullName}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, fullName: event.target.value })
              }
              placeholder="Nguyễn Văn A"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={candidateForm.email}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, email: event.target.value })
              }
              placeholder="example@gmail.com"
            />
          </label>
          <label>
            Số điện thoại
            <input
              value={candidateForm.phone}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, phone: event.target.value })
              }
              placeholder="Ví dụ: 09xxxxxxxx"
            />
          </label>
          <label>
            Vị trí ứng tuyển
            <input
              value={candidateForm.position}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, position: event.target.value })
              }
              placeholder="Frontend Developer"
            />
          </label>
          <label>
            Kinh nghiệm làm việc
            <input
              value={candidateForm.workExperience}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, workExperience: event.target.value })
              }
              placeholder="Ví dụ: 2 năm React, 1 năm Node.js"
            />
          </label>
          <label>
            Ngoại ngữ
            <select
              value={candidateForm.language}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, language: event.target.value })
              }
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trình độ ngoại ngữ
            <select
              disabled={candidateForm.language === "khong-co"}
              value={candidateForm.languageLevel}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, languageLevel: event.target.value })
              }
            >
              {languageLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mức lương mong muốn
            <select
              value={candidateForm.salaryRange}
              onChange={(event) =>
                setCandidateForm({ ...candidateForm, salaryRange: event.target.value })
              }
            >
              {salaryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {candidateForm.salaryRange === "custom" && (
            <label>
              Mức lương mong muốn chi tiết
              <input
                value={candidateForm.salaryDetail}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, salaryDetail: event.target.value })
                }
                placeholder="Ví dụ: 12.500.000 VNĐ"
              />
            </label>
          )}
          <label>
            Upload CV (PDF/DOC)
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => setCandidateFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <button type="submit" disabled={uploadingCv}>
            {uploadingCv
              ? "Đang xử lý..."
              : editingCandidate
              ? "Lưu thay đổi CV"
              : "Upload CV"}
          </button>

          {editingCandidate && (
            <button
              type="button"
              className="candidate-cancel-btn"
              onClick={resetForm}
              disabled={uploadingCv}
            >
              Hủy chỉnh sửa
            </button>
          )}

          {candidateStatus && <p className="candidate-status">{candidateStatus}</p>}
        </form>

        <div className="job-grid candidate-job-grid">
          {candidateList.length === 0 ? (
            <p className="candidate-empty">Chưa có ứng viên nào upload CV.</p>
          ) : (
            candidateList.map((candidate) => (
              <article key={candidate.id} className="job-card candidate-item">
                <h3>{candidate.full_name}</h3>
                <p className="company">
                  {candidate.email}
                  {candidate.phone ? ` - ${candidate.phone}` : ""}
                </p>
                <div className="tags">
                  <span>{candidate.position}</span>
                  <span>{formatDate(candidate.created_at)}</span>
                </div>
                <div className="skills">
                  {candidate.work_experience && <small>{candidate.work_experience}</small>}
                  {candidate.language === "khong-co" && (
                    <small>Không có ngoại ngữ</small>
                  )}
                  {candidate.language &&
                    candidate.language !== "khong-co" &&
                    candidate.language_level && (
                    <small>
                      {formatLanguageLabel(candidate.language)} -{" "}
                      {formatLanguageLevelLabel(candidate.language_level)}
                    </small>
                    )}
                  <small>
                    {candidate.salary_range === "custom" && candidate.salary_detail
                      ? candidate.salary_detail
                      : candidate.salary_range ?? "Chưa chọn mức lương"}
                  </small>
                  <small>{candidate.file_name}</small>
                </div>
                <div className="candidate-item-actions">
                  <a className="job-link" href={candidate.cv_url} target="_blank" rel="noreferrer">
                    Xem CV
                  </a>
                  <button type="button" className="job-link edit-link" onClick={() => onEditCandidate(candidate)}>
                    Chỉnh sửa
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default UploadCv;
