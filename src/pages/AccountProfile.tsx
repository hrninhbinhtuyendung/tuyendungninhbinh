import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./AccountProfile.css";

type EditForm = {
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string;
  contactInfo: string;
  description: string;
};

type JobApplicationRecord = {
  id: number;
  job_id: number;
  full_name: string;
  email: string;
  phone: string;
  experience: string | null;
  expected_salary: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  cv_file_name: string | null;
  created_at: string;
};

type UserProfileForm = {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  address: string;
  bio: string;
};

type UserProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  bio: string | null;
};

const defaultEditForm: EditForm = {
  title: "",
  company: "",
  salary: "",
  location: "",
  tags: "",
  contactInfo: "",
  description: "",
};

const defaultProfileForm: UserProfileForm = {
  full_name: "",
  email: "",
  phone: "",
  company_name: "",
  address: "",
  bio: "",
};

function formatDate(date?: string | null) {
  if (!date) return "Chưa có";
  return new Date(date).toLocaleString("vi-VN");
}

function AccountProfile() {
  const { user, signOut } = useAuth();
  const [profileForm, setProfileForm] = useState<UserProfileForm>(defaultProfileForm);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(defaultEditForm);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationCountByJob, setApplicationCountByJob] = useState<
    Record<number, number>
  >({});

  const fullName = useMemo(() => {
    return (
      profileForm.full_name ||
      (user?.user_metadata?.full_name as string) ||
      "Chưa cập nhật"
    );
  }, [profileForm.full_name, user]);

  const email = profileForm.email || user?.email || "Chưa có email";
  const avatarLabel = email.charAt(0).toUpperCase();

  useEffect(() => {
    if (!user) {
      setProfileForm(defaultProfileForm);
      return;
    }

    const client = supabase;
    const fallbackProfile: UserProfileForm = {
      full_name: (user.user_metadata?.full_name as string) || "",
      email: user.email || "",
      phone: "",
      company_name: "",
      address: "",
      bio: "",
    };

    setProfileForm(fallbackProfile);

    if (!isSupabaseConfigured || !client) {
      return;
    }

    const loadUserProfile = async () => {
      setProfileLoading(true);
      setProfileStatus("");

      const { data, error } = await client
        .from("user_profiles")
        .select("id, full_name, email, phone, company_name, address, bio")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setProfileStatus(`Không tải được user_profiles: ${error.message}`);
        setProfileLoading(false);
        return;
      }

      if (!data) {
        setProfileLoading(false);
        return;
      }

      const profile = data as UserProfileRecord;
      setProfileForm({
        full_name: profile.full_name || fallbackProfile.full_name,
        email: profile.email || fallbackProfile.email,
        phone: profile.phone || "",
        company_name: profile.company_name || "",
        address: profile.address || "",
        bio: profile.bio || "",
      });
      setProfileLoading(false);
    };

    void loadUserProfile();
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!user || !isSupabaseConfigured || !client) {
      return;
    }

    const loadJobs = async () => {
      setLoadingJobs(true);
      setJobsError("");

      const byUserQuery = await client
        .from("jobs")
        .select(
          "id, user_id, title, company, salary, location, tags, contact_info, description, created_at"
        )
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (byUserQuery.error) {
        const fallbackQuery = await client
          .from("jobs")
          .select(
            "id, user_id, title, company, salary, location, tags, contact_info, description, created_at"
          )
          .order("id", { ascending: false });

        if (fallbackQuery.error) {
          setJobsError(`Không tải được danh sách việc làm: ${fallbackQuery.error.message}`);
          setLoadingJobs(false);
          return;
        }

        setJobs((fallbackQuery.data ?? []) as JobRecord[]);
        setJobsError(
          "Chưa lọc theo tài khoản. Hãy thêm cột user_id trong bảng jobs để quản lý theo từng user."
        );
        setLoadingJobs(false);
        return;
      }

      setJobs((byUserQuery.data ?? []) as JobRecord[]);
      setLoadingJobs(false);
    };

    void loadJobs();
  }, [user]);

  const onSelectJob = (job: JobRecord) => {
    setSelectedJob(job);
    setSaveStatus("");
    setEditForm({
      title: job.title,
      company: job.company,
      salary: job.salary,
      location: job.location,
      tags: (job.tags ?? []).join(", "),
      contactInfo: job.contact_info ?? "",
      description: job.description ?? "",
    });
  };

  useEffect(() => {
    const client = supabase;
    if (!selectedJob || !isSupabaseConfigured || !client) {
      setApplications([]);
      setApplicationsError("");
      return;
    }

    const loadApplications = async () => {
      setLoadingApplications(true);
      setApplicationsError("");

      const { data, error } = await client
        .from("job_applications")
        .select(
          "id, job_id, full_name, email, phone, experience, expected_salary, cover_letter, cv_url, cv_file_name, created_at"
        )
        .eq("job_id", selectedJob.id)
        .order("id", { ascending: false });

      if (error) {
        setApplicationsError(
          `Không tải được danh sách ứng tuyển: ${error.message}`
        );
        setApplications([]);
        setLoadingApplications(false);
        return;
      }

      setApplications((data ?? []) as JobApplicationRecord[]);
      setLoadingApplications(false);
    };

    void loadApplications();
  }, [selectedJob]);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client || jobs.length === 0) {
      setApplicationCountByJob({});
      return;
    }

    const loadApplicationCounts = async () => {
      const jobIds = jobs.map((job) => job.id);

      const { data, error } = await client
        .from("job_applications")
        .select("job_id")
        .in("job_id", jobIds);

      if (error) {
        return;
      }

      const map: Record<number, number> = {};
      for (const item of (data ?? []) as Array<{ job_id: number }>) {
        map[item.job_id] = (map[item.job_id] ?? 0) + 1;
      }
      setApplicationCountByJob(map);
    };

    void loadApplicationCounts();
  }, [jobs]);

  const onSaveJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedJob || !supabase || !user) return;

    setSaving(true);
    setSaveStatus("Đang lưu thay đổi...");

    const tags = editForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const updatePayload = {
      title: editForm.title,
      company: editForm.company,
      salary: editForm.salary,
      location: editForm.location,
      tags,
      contact_info: editForm.contactInfo || null,
      description: editForm.description || null,
    };

    const updateByOwner = await supabase
      .from("jobs")
      .update(updatePayload)
      .eq("id", selectedJob.id)
      .eq("user_id", user.id);

    if (updateByOwner.error) {
      const fallbackUpdate = await supabase
        .from("jobs")
        .update(updatePayload)
        .eq("id", selectedJob.id);

      if (fallbackUpdate.error) {
        setSaveStatus(`Lưu thất bại: ${fallbackUpdate.error.message}`);
        setSaving(false);
        return;
      }
    }

    const updatedJob: JobRecord = {
      ...selectedJob,
      ...updatePayload,
      tags,
    };

    setJobs((prev) => prev.map((job) => (job.id === selectedJob.id ? updatedJob : job)));
    setSelectedJob(updatedJob);
    setSaveStatus("Đã cập nhật công việc thành công.");
    setSaving(false);
  };

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !supabase) return;

    setProfileSaving(true);
    setProfileStatus("Đang lưu hồ sơ...");

    const payload = {
      id: user.id,
      full_name: profileForm.full_name || null,
      email: profileForm.email || user.email || null,
      phone: profileForm.phone || null,
      company_name: profileForm.company_name || null,
      address: profileForm.address || null,
      bio: profileForm.bio || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      setProfileStatus(`Cập nhật hồ sơ thất bại: ${error.message}`);
      setProfileSaving(false);
      return;
    }

    setProfileStatus("Đã cập nhật hồ sơ thành công.");
    setProfileSaving(false);
  };

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-empty">
          <h1>Hồ sơ tài khoản</h1>
          <p>Bạn chưa đăng nhập. Vui lòng đăng nhập để xem thông tin tài khoản.</p>
          <Link to="/auth?mode=signin" className="account-login-link">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-layout">
        <section className="account-hero">
          <div className="account-avatar">{avatarLabel}</div>
          <div>
            <p className="account-subtitle">Hồ sơ tài khoản</p>
            <h1>{fullName}</h1>
            <p className="account-email">{email}</p>
          </div>
        </section>

        <section className="account-grid">
          <article className="account-card">
            <h2>Thông tin cơ bản</h2>
            <div className="account-row">
              <span>Tên hiển thị</span>
              <strong>{fullName}</strong>
            </div>
            <div className="account-row">
              <span>Email</span>
              <strong>{email}</strong>
            </div>
            <div className="account-row">
              <span>Xác thực email</span>
              <strong>{user.email_confirmed_at ? "Đã xác thực" : "Chưa xác thực"}</strong>
            </div>
            <div className="account-row">
              <span>ID tài khoản</span>
              <strong>{user.id}</strong>
            </div>
          </article>

          <article className="account-card">
            <h2>Lịch sử truy cập</h2>
            <div className="account-row">
              <span>Ngày tạo</span>
              <strong>{formatDate(user.created_at)}</strong>
            </div>
            <div className="account-row">
              <span>Đăng nhập gần nhất</span>
              <strong>{formatDate(user.last_sign_in_at)}</strong>
            </div>
          </article>

          <article className="account-card account-actions">
            <h2>Thao tác nhanh</h2>
            <Link to="/post" className="account-btn primary">
              Đăng tin tuyển dụng
            </Link>
            <Link to="/" className="account-btn secondary">
              Về trang chủ
            </Link>
            <button type="button" className="account-btn ghost" onClick={() => void signOut()}>
              Đăng xuất
            </button>
          </article>
        </section>

        <section className="account-card profile-editor-card">
          <div className="profile-editor-head">
            <h2>Cập nhật hồ sơ user_profiles</h2>
            {profileLoading && <p>Đang tải hồ sơ...</p>}
          </div>

          <form onSubmit={onSaveProfile} className="profile-editor-form">
            <div className="profile-editor-row">
              <label>
                Họ và tên
                <input
                  value={profileForm.full_name}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, full_name: event.target.value })
                  }
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, email: event.target.value })
                  }
                  placeholder="example@gmail.com"
                />
              </label>
            </div>

            <div className="profile-editor-row">
              <label>
                Số điện thoại
                <input
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, phone: event.target.value })
                  }
                  placeholder="09xxxxxxxx"
                />
              </label>
              <label>
                Công ty
                <input
                  value={profileForm.company_name}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, company_name: event.target.value })
                  }
                  placeholder="Tên công ty đang làm việc"
                />
              </label>
            </div>

            <div className="profile-editor-row">
              <label>
                Địa chỉ
                <input
                  value={profileForm.address}
                  onChange={(event) =>
                    setProfileForm({ ...profileForm, address: event.target.value })
                  }
                  placeholder="Ninh Bình..."
                />
              </label>
            </div>

            <label>
              Giới thiệu ngắn
              <textarea
                rows={4}
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, bio: event.target.value })
                }
                placeholder="Mô tả ngắn về bạn..."
              />
            </label>

            <button type="submit" disabled={profileSaving} className="account-btn primary">
              {profileSaving ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
            {profileStatus && <p className="profile-save-status">{profileStatus}</p>}
          </form>
        </section>

        <section className="posted-jobs-section">
          <div className="posted-jobs-header">
            <h2>Công việc đã đăng</h2>
            {loadingJobs && <p>Đang tải danh sách...</p>}
          </div>
          {jobsError && <p className="posted-jobs-error">{jobsError}</p>}

          <div className="posted-jobs-grid">
            <div className="posted-jobs-list">
              {jobs.length === 0 && !loadingJobs ? (
                <p className="posted-jobs-empty">Bạn chưa có công việc nào được đăng.</p>
              ) : (
                jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className={`posted-job-item${selectedJob?.id === job.id ? " active" : ""}`}
                    onClick={() => onSelectJob(job)}
                  >
                    <div className="posted-job-item-head">
                      <strong>{job.title}</strong>
                      {(applicationCountByJob[job.id] ?? 0) > 0 && (
                        <span className="posted-job-apply-count">
                          {applicationCountByJob[job.id]}
                        </span>
                      )}
                    </div>
                    <span>{job.company}</span>
                    <small>
                      {job.salary} • {job.location}
                    </small>
                  </button>
                ))
              )}
            </div>

            <div className="posted-jobs-editor">
              {!selectedJob ? (
                <div className="posted-editor-placeholder">
                  Chọn một công việc bên trái để chỉnh sửa nội dung.
                </div>
              ) : (
                <form onSubmit={onSaveJob} className="posted-editor-form">
                  <h3>Chỉnh sửa công việc #{selectedJob.id}</h3>
                  <input
                    value={editForm.title}
                    onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                    placeholder="Tiêu đề việc làm"
                    required
                  />
                  <input
                    value={editForm.company}
                    onChange={(event) => setEditForm({ ...editForm, company: event.target.value })}
                    placeholder="Tên công ty"
                    required
                  />
                  <div className="posted-editor-row">
                    <input
                      value={editForm.salary}
                      onChange={(event) =>
                        setEditForm({ ...editForm, salary: event.target.value })
                      }
                      placeholder="Mức lương"
                      required
                    />
                    <input
                      value={editForm.location}
                      onChange={(event) =>
                        setEditForm({ ...editForm, location: event.target.value })
                      }
                      placeholder="Địa điểm"
                      required
                    />
                  </div>
                  <input
                    value={editForm.tags}
                    onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })}
                    placeholder="Tags, cách nhau dấu phẩy"
                  />
                  <input
                    value={editForm.contactInfo}
                    onChange={(event) =>
                      setEditForm({ ...editForm, contactInfo: event.target.value })
                    }
                    placeholder="Liên hệ ứng tuyển (SĐT / Email / Người phụ trách)"
                  />
                  <textarea
                    rows={5}
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm({ ...editForm, description: event.target.value })
                    }
                    placeholder="Mô tả công việc"
                  />

                  <button type="submit" disabled={saving} className="account-btn primary">
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  {saveStatus && <p className="posted-save-status">{saveStatus}</p>}
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="posted-jobs-section">
          <div className="posted-jobs-header">
            <h2>Ứng viên ứng tuyển</h2>
            {selectedJob && loadingApplications && <p>Đang tải danh sách...</p>}
          </div>

          {!selectedJob && (
            <p className="posted-jobs-empty">
              Chọn một công việc để xem danh sách ứng viên đã ứng tuyển.
            </p>
          )}

          {applicationsError && <p className="posted-jobs-error">{applicationsError}</p>}

          {selectedJob && !loadingApplications && applications.length === 0 && !applicationsError && (
            <p className="posted-jobs-empty">Chưa có ứng viên nào ứng tuyển công việc này.</p>
          )}

          {selectedJob && applications.length > 0 && (
            <div className="applications-grid">
              {applications.map((application) => (
                <article key={application.id} className="application-card">
                  <div className="application-head">
                    <h3>{application.full_name}</h3>
                    <small>{formatDate(application.created_at)}</small>
                  </div>
                  <p>{application.email}</p>
                  <p>{application.phone}</p>
                  {application.experience && <p>Kinh nghiệm: {application.experience}</p>}
                  {application.expected_salary && (
                    <p>Mức lương mong muốn: {application.expected_salary}</p>
                  )}
                  {application.cover_letter && (
                    <p className="application-cover">{application.cover_letter}</p>
                  )}
                  {application.cv_url ? (
                    <a href={application.cv_url} target="_blank" rel="noreferrer">
                      Xem CV{application.cv_file_name ? ` (${application.cv_file_name})` : ""}
                    </a>
                  ) : (
                    <span>Chưa có CV đính kèm</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AccountProfile;
