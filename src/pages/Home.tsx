import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import hrLogo from "../assets/logo_HR.jpg";
import logoGmail from "../assets/logo_gmail.png";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./Home.css";

type JobView = {
  id: number;
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string[];
  viewCount: number;
};

type QuickApplyState = {
  jobId: number;
  jobTitle: string;
  company: string;
};

type CandidatePreview = {
  id: number;
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

type ApplicationNotification = {
  id: number;
  job_id: number;
  full_name: string;
  created_at: string;
  job_title: string;
};

const fallbackJobs: JobView[] = [
  {
    id: 1,
    title: "Nhân viên kinh doanh",
    company: "Công ty CP Du lịch Ninh Bình",
    salary: "10 - 18 triệu",
    location: "Ninh Bình",
    tags: ["Full-time", "1-2 năm", "Sales"],
    viewCount: 0,
  },
  {
    id: 2,
    title: "Kế toán tổng hợp",
    company: "Doanh nghiệp Xây dựng Hoa Lư",
    salary: "12 - 20 triệu",
    location: "Ninh Bình",
    tags: ["Onsite", "2+ năm", "Accounting"],
    viewCount: 0,
  },
  {
    id: 3,
    title: "Nhân viên marketing",
    company: "Tam Coc Travel Agency",
    salary: "9 - 16 triệu",
    location: "Ninh Bình",
    tags: ["Full-time", "Content", "Social"],
    viewCount: 0,
  },
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

function formatSalaryLabel(candidate: CandidatePreview) {
  if (candidate.salary_range === "custom" && candidate.salary_detail) {
    return candidate.salary_detail;
  }
  if (candidate.salary_range === "5-10") return "5.000.000 - 10.000.000";
  if (candidate.salary_range === "10-15") return "10.000.000 - 15.000.000";
  if (candidate.salary_range === "15-20") return "15.000.000 - 20.000.000";
  if (candidate.salary_range === "20+") return "Trên 20.000.000";
  return "Chưa chọn mức lương";
}

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const postJobLink = user ? "/post" : "/auth?mode=signin&next=%2Fpost";

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const sortJobsByViews = (jobList: JobView[]) =>
    [...jobList].sort((a, b) => b.viewCount - a.viewCount);

  const [jobs, setJobs] = useState<JobView[]>([]);
  const [statusText, setStatusText] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [candidateList, setCandidateList] = useState<CandidatePreview[]>([]);
  const [candidateStatus, setCandidateStatus] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationItems, setNotificationItems] = useState<ApplicationNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<number[]>([]);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarLabel = (user?.email?.trim().charAt(0) || "U").toUpperCase();
  const readNotificationStorageKey = user
    ? `home_read_notifications_${user.id}`
    : "";
  const [quickApply, setQuickApply] = useState<QuickApplyState | null>(null);
  const [quickApplyContact, setQuickApplyContact] = useState("");
  const [quickApplySubmitting, setQuickApplySubmitting] = useState(false);
  const [quickApplyStatus, setQuickApplyStatus] = useState("");

  const unreadNotificationCount = useMemo(() => {
    if (notificationItems.length === 0) return 0;
    const readSet = new Set(readNotificationIds);
    return notificationItems.filter((item) => !readSet.has(item.id)).length;
  }, [notificationItems, readNotificationIds]);

  useEffect(() => {
    setJobs(sortJobsByViews(fallbackJobs));

    const loadJobs = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setStatusText(
          "Chưa cấu hình Supabase. Đang hiển thị dữ liệu mẫu cho trang chủ."
        );
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company, salary, location, tags, view_count")
        .order("view_count", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(50);

      if (error) {
        setStatusText(
          "Không tải được dữ liệu từ Supabase. Đang hiển thị dữ liệu mẫu."
        );
        return;
      }

      const records = (data ?? []) as JobRecord[];
      if (records.length === 0) {
        setStatusText("Supabase đã kết nối, nhưng bảng jobs chưa có dữ liệu.");
        return;
      }

      setJobs(
        sortJobsByViews(
          records.map((job) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            salary: job.salary,
            location: job.location,
            tags: Array.isArray(job.tags) ? job.tags : [],
            viewCount: job.view_count ?? 0,
          }))
        )
      );
      setStatusText("Đã tải dữ liệu việc làm mới nhất từ Supabase.");
    };

    void loadJobs();
  }, []);

  const incrementViewCount = async (jobId: number) => {
    let optimisticCount = 0;

    setJobs((prev) => {
      const updated = prev.map((job) => {
        if (job.id !== jobId) return job;
        optimisticCount = job.viewCount + 1;
        return { ...job, viewCount: optimisticCount };
      });
      return sortJobsByViews(updated);
    });

    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from("jobs")
      .update({ view_count: optimisticCount })
      .eq("id", jobId)
      .select("id, view_count")
      .single();

    if (error) {
      setStatusText(`Không đồng bộ được lượt xem: ${error.message}`);
      return;
    }

    const syncedCount = Number((data as { view_count?: number } | null)?.view_count ?? optimisticCount);
    setJobs((prev) =>
      sortJobsByViews(
        prev.map((job) =>
          job.id === jobId ? { ...job, viewCount: syncedCount } : job
        )
      )
    );
  };

  const handleJobClick = async (jobId: number) => {
    await incrementViewCount(jobId);
    navigate(`/job/${jobId}`);
  };

  const applySearch = () => {
    setSearchKeyword(keywordInput.trim());
    setSearchLocation(locationInput.trim());
    setShowKeywordSuggestions(false);
    setShowLocationSuggestions(false);
  };

  const onSearchEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applySearch();
  };

  const rankedKeywordSuggestions = useMemo(() => {
    const counts = new Map<string, number>();

    jobs.forEach((job) => {
      const candidates = [job.title, job.company, ...(job.tags || [])];
      candidates.forEach((item) => {
        const label = item.trim();
        if (!label) return;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
      .map(([label]) => label);
  }, [jobs]);

  const rankedLocationSuggestions = useMemo(() => {
    const counts = new Map<string, number>();

    jobs.forEach((job) => {
      const location = (job.location || "").trim();
      if (!location) return;
      counts.set(location, (counts.get(location) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
      .map(([label]) => label);
  }, [jobs]);

  const keywordSuggestions = useMemo(() => {
    const key = normalizeText(keywordInput.trim());
    if (!key) return rankedKeywordSuggestions.slice(0, 8);

    return rankedKeywordSuggestions
      .filter((label) => normalizeText(label).includes(key))
      .slice(0, 8);
  }, [rankedKeywordSuggestions, keywordInput]);

  const locationSuggestions = useMemo(() => {
    const key = normalizeText(locationInput.trim());
    if (!key) return rankedLocationSuggestions.slice(0, 8);

    return rankedLocationSuggestions
      .filter((label) => normalizeText(label).includes(key))
      .slice(0, 8);
  }, [rankedLocationSuggestions, locationInput]);

  const filteredJobs = useMemo(() => {
    const normalizedKeyword = normalizeText(searchKeyword);
    const normalizedLocation = normalizeText(searchLocation);
    return jobs.filter((job) => {
      const searchable = normalizeText(
        `${job.title} ${job.company} ${job.location} ${(job.tags || []).join(" ")}`
      );
      const matchesKeyword =
        !normalizedKeyword || searchable.includes(normalizedKeyword);
      const matchesLocation =
        !normalizedLocation || normalizeText(job.location).includes(normalizedLocation);
      return matchesKeyword && matchesLocation;
    });
  }, [jobs, searchKeyword, searchLocation]);

  useEffect(() => {
    const loadCandidates = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setCandidateStatus("Chưa cấu hình Supabase để tải ứng viên.");
        return;
      }
      const { data, error } = await supabase
        .from("candidate_cvs")
        .select(
          "id, full_name, email, phone, position, work_experience, salary_range, salary_detail, language, language_level, cv_url, file_name, created_at"
        )
        .order("id", { ascending: false })
        .limit(6);

      if (error) {
        setCandidateStatus("Không tải được danh sách ứng viên từ Supabase.");
        return;
      }

      const records = (data ?? []) as CandidatePreview[];
      if (records.length === 0) {
        setCandidateStatus("Chưa có ứng viên nào đăng CV.");
        return;
      }
      setCandidateList(records);
      setCandidateStatus("");
    };

    void loadCandidates();
  }, []);

  useEffect(() => {
    if (!showUserMenu && !showNotificationMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }

      if (
        showNotificationMenu &&
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu, showNotificationMenu]);

  useEffect(() => {
    if (!readNotificationStorageKey) {
      setReadNotificationIds([]);
      return;
    }

    const raw = window.localStorage.getItem(readNotificationStorageKey);
    if (!raw) {
      setReadNotificationIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as number[];
      setReadNotificationIds(Array.isArray(parsed) ? parsed.filter(Number.isFinite) : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [readNotificationStorageKey]);

  useEffect(() => {
    if (!readNotificationStorageKey) return;
    window.localStorage.setItem(readNotificationStorageKey, JSON.stringify(readNotificationIds));
  }, [readNotificationIds, readNotificationStorageKey]);

  useEffect(() => {
    const client = supabase;
    if (!user || !isSupabaseConfigured || !client) {
      setNotificationItems([]);
      return;
    }

    const loadNotifications = async () => {
      const jobsResult = await client
        .from("jobs")
        .select("id, title")
        .eq("user_id", user.id);

      if (jobsResult.error) return;

      const ownedJobs = (jobsResult.data ?? []) as Array<{ id: number; title: string }>;
      const jobIds = ownedJobs.map((job) => Number(job.id)).filter((id) => Number.isFinite(id));

      if (jobIds.length === 0) {
        setNotificationItems([]);
        return;
      }

      const titleByJobId = new Map<number, string>();
      ownedJobs.forEach((job) => titleByJobId.set(job.id, job.title || "vị trí tuyển dụng"));

      const applicationsResult = await client
        .from("job_applications")
        .select("id, job_id, full_name, created_at")
        .in("job_id", jobIds)
        .order("id", { ascending: false })
        .limit(30);

      if (applicationsResult.error) return;

      const applications = (applicationsResult.data ?? []) as Array<{
        id: number;
        job_id: number;
        full_name: string;
        created_at: string;
      }>;

      setNotificationItems(
        applications.map((item) => ({
          id: item.id,
          job_id: item.job_id,
          full_name: item.full_name || "Ứng viên mới",
          created_at: item.created_at,
          job_title: titleByJobId.get(item.job_id) || "vị trí tuyển dụng",
        }))
      );
    };

    void loadNotifications();
  }, [user]);

  const markNotificationAsRead = (notificationId: number) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(notificationId)) return prev;
      const next = [notificationId, ...prev];
      if (readNotificationStorageKey) {
        window.localStorage.setItem(readNotificationStorageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const submitQuickApply = async () => {
    if (!quickApply || !supabase || !isSupabaseConfigured) {
      setQuickApplyStatus("Chưa sẵn sàng để gửi ứng tuyển nhanh.");
      return;
    }

    const contact = quickApplyContact.trim();
    if (!contact) {
      setQuickApplyStatus("Vui lòng nhập số điện thoại hoặc email.");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = /^[0-9+\s().-]{8,20}$/.test(contact);
    if (!isEmail && !isPhone) {
      setQuickApplyStatus("Thông tin liên hệ không hợp lệ. Hãy nhập email hoặc số điện thoại.");
      return;
    }

    setQuickApplySubmitting(true);
    setQuickApplyStatus("Đang gửi ứng tuyển nhanh...");

    const payload = {
      job_id: quickApply.jobId,
      user_id: null,
      full_name: "Ứng viên ứng tuyển nhanh",
      email: isEmail ? contact : `quick-${Date.now()}@tuyendung.local`,
      phone: isPhone ? contact : "Chưa cung cấp",
      experience: null,
      expected_salary: null,
      cover_letter: `Ứng tuyển nhanh. Liên hệ qua: ${contact}`,
      cv_url: null,
      cv_file_name: null,
    };

    const { error } = await supabase.from("job_applications").insert(payload);

    if (error) {
      setQuickApplyStatus(`Gửi ứng tuyển thất bại: ${error.message}`);
      setQuickApplySubmitting(false);
      return;
    }

    setQuickApplySubmitting(false);
    setQuickApplyStatus("");
    setQuickApplyContact("");
    setQuickApply(null);
  };

  return (
    <div className="home">
      <header className="navbar">
        <div className="logo-wrap">
          <img src={hrLogo} alt="HR Ninh Bình" className="logo-image" />
          <div className="logo">
            Tuyển dụng <span>Ninh Bình</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            onClick={() => {
              document
                .getElementById("viec-lam-noi-bat")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Việc làm
          </button>
          <a href="#">Nhà tuyển dụng</a>
          <a href="#">Công cụ</a>
          <a href="#">Cẩm nang</a>
        </nav>

        <div className="header-actions">
          <div className="header-cta">
            <Link className="cta-employer auth-link" to={postJobLink}>
              Đăng tin tuyển dụng
            </Link>
            <Link className="cta-cv auth-link cta-cv-button" to="/upload-cv">
              Đăng CV miễn phí
            </Link>
          </div>

          {user && (
            <div className="auth-buttons">
              <div className="user-quick-actions" ref={userMenuRef}>
                <div className="notification-wrap" ref={notificationMenuRef}>
                  <button
                    type="button"
                    className="notification-button"
                    title="Thông báo"
                    onClick={() => {
                      setShowNotificationMenu((prev) => !prev);
                      setShowUserMenu(false);
                    }}
                  >
                    <span className="notification-icon" aria-hidden="true">
                      🔔
                    </span>
                    {unreadNotificationCount > 0 && (
                      <span className="notification-badge">
                        {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                      </span>
                    )}
                  </button>

                  {showNotificationMenu && (
                    <div className="notification-dropdown">
                      <p className="notification-title">Thông báo</p>
                      {notificationItems.length === 0 ? (
                        <p className="notification-empty">Chưa có thông báo mới.</p>
                      ) : (
                        <div className="notification-list">
                          {notificationItems.map((item) => {
                            const isRead = readNotificationIds.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`notification-item${isRead ? " read" : ""}`}
                                onClick={() => {
                                  markNotificationAsRead(item.id);
                                  setShowNotificationMenu(false);
                                  navigate(`/application-notification/${item.id}`);
                                }}
                              >
                                <span className="notification-item-text">
                                  <strong>{item.full_name}</strong> đã ứng tuyển vào{" "}
                                  <strong>{item.job_title}</strong>
                                </span>
                                <span className="notification-item-time">
                                  {formatDate(item.created_at)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="avatar-button"
                  onClick={() => {
                    setShowUserMenu((prev) => !prev);
                    setShowNotificationMenu(false);
                  }}
                  aria-expanded={showUserMenu}
                  aria-label="Mở menu tài khoản"
                >
                  {avatarLabel}
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <Link to="/account" onClick={() => setShowUserMenu(false)}>
                      Hồ sơ của tôi
                    </Link>
                    <Link to="/upload-cv" onClick={() => setShowUserMenu(false)}>
                      CV của tôi
                    </Link>
                    <Link to="/account" onClick={() => setShowUserMenu(false)}>
                      Việc đã ứng tuyển
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        void signOut();
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-main">
          <p className="hero-badge">Nền tảng việc làm tại địa phương</p>
          <h1>Tìm việc nhanh tại Ninh Bình, kết nối doanh nghiệp uy tín</h1>
          <div className="search-bar">
            <div className="search-field keyword-search-field">
              <span className="search-icon">🔎</span>
              <input
                placeholder="Vị trí tuyển dụng, tên công ty..."
                value={keywordInput}
                onChange={(event) => {
                  setKeywordInput(event.target.value);
                  setShowKeywordSuggestions(true);
                }}
                onKeyDown={onSearchEnter}
                onFocus={() => setShowKeywordSuggestions(true)}
                onBlur={() => setTimeout(() => setShowKeywordSuggestions(false), 120)}
              />
              {showKeywordSuggestions && keywordSuggestions.length > 0 && (
                <div className="keyword-suggestion-list">
                  {keywordSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="keyword-suggestion-item"
                      onClick={() => {
                        setKeywordInput(suggestion);
                        setSearchKeyword(suggestion);
                        setShowKeywordSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="search-field location-search-field">
              <span className="search-icon">📍</span>
              <input
                placeholder="Địa điểm làm việc"
                value={locationInput}
                onChange={(event) => {
                  setLocationInput(event.target.value);
                  setShowLocationSuggestions(true);
                }}
                onKeyDown={onSearchEnter}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 120)}
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="location-suggestion-list">
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="location-suggestion-item"
                      onClick={() => {
                        setLocationInput(suggestion);
                        setSearchLocation(suggestion);
                        setShowLocationSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={applySearch}>
              Tìm kiếm
            </button>
          </div>
        </div>

        <aside className="hero-panel">
          <h3>Chỉ số nổi bật</h3>
          <div className="metric-grid">
            <div>
              <strong>500+</strong>
              <span>Doanh nghiệp tại Ninh Bình</span>
            </div>
            <div>
              <strong>2.000+</strong>
              <span>Việc làm đang tuyển</span>
            </div>
            <div>
              <strong>92%</strong>
              <span>Hồ sơ được phản hồi</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Hỗ trợ ứng viên và nhà tuyển dụng</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="job-section" id="viec-lam-noi-bat">
        <div className="job-heading">
          <h2>Việc làm nổi bật</h2>
          <button
            type="button"
            className="job-reset-search"
            onClick={() => {
              setKeywordInput("");
              setLocationInput("");
              setSearchKeyword("");
              setSearchLocation("");
              setShowKeywordSuggestions(false);
              setShowLocationSuggestions(false);
            }}
          >
            Xem tất cả
          </button>
        </div>

        {statusText && <p className="status-note">{statusText}</p>}
        {(searchKeyword || searchLocation) && (
          <p className="status-note">
            Kết quả tìm kiếm: {filteredJobs.length} công việc phù hợp.
          </p>
        )}

        <div className="job-grid">
          {filteredJobs.map((job) => (
            <article key={job.id} className="job-card">
              <div className="job-card-head">
                <h3>{job.company}</h3>
                <span className="view-count" title="Lượt xem">
                  👁 {job.viewCount}
                </span>
              </div>
              <p className="job-position">Vị trí: {job.title}</p>
              <div className="tags">
                <span>{job.salary}</span>
                <span>{job.location}</span>
              </div>
              <div className="skills">
                {job.tags.map((tag) => (
                  <small key={tag}>{tag}</small>
                ))}
              </div>
              <div className="job-card-actions">
                <button
                  type="button"
                  className="job-link job-link-button"
                  onClick={() => void handleJobClick(job.id)}
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  className="job-link quick-apply-trigger"
                  onClick={() => {
                    setQuickApply({
                      jobId: job.id,
                      jobTitle: job.title,
                      company: job.company,
                    });
                    setQuickApplyContact("");
                    setQuickApplyStatus("");
                  }}
                >
                  Ứng tuyển nhanh
                </button>
              </div>
            </article>
          ))}
          {filteredJobs.length === 0 && (
            <p className="candidate-empty">
              Không tìm thấy công việc phù hợp với từ khóa bạn nhập.
            </p>
          )}
        </div>
      </section>

      <section className="job-section">
        <div className="job-heading">
          <h2>Ứng viên nổi bật</h2>
          <Link to="/upload-cv">Xem tất cả</Link>
        </div>

        {candidateStatus && <p className="status-note">{candidateStatus}</p>}

        <div className="job-grid">
          {candidateList.map((candidate) => (
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
                {candidate.language === "khong-co" && <small>Không có ngoại ngữ</small>}
                {candidate.language &&
                  candidate.language !== "khong-co" &&
                  candidate.language_level && (
                    <small>
                      {formatLanguageLabel(candidate.language)} -{" "}
                      {formatLanguageLevelLabel(candidate.language_level)}
                    </small>
                  )}
                <small>{formatSalaryLabel(candidate)}</small>
                <small>{candidate.file_name}</small>
              </div>
              <a className="job-link" href={candidate.cv_url} target="_blank" rel="noreferrer">
                Xem CV
              </a>
            </article>
          ))}
        </div>
      </section>

      {quickApply && (
        <div className="quick-apply-overlay" onClick={() => setQuickApply(null)}>
          <div
            className="quick-apply-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Ứng tuyển nhanh</h3>
            <p>
              {quickApply.jobTitle} - {quickApply.company}
            </p>
            <input
              value={quickApplyContact}
              onChange={(event) => setQuickApplyContact(event.target.value)}
              placeholder="Nhập số điện thoại hoặc email"
            />
            <div className="quick-apply-actions">
              <button
                type="button"
                className="quick-apply-cancel"
                onClick={() => setQuickApply(null)}
                disabled={quickApplySubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="quick-apply-submit"
                onClick={() => void submitQuickApply()}
                disabled={quickApplySubmitting}
              >
                {quickApplySubmitting ? "Đang gửi..." : "Gửi ứng tuyển"}
              </button>
            </div>
            {quickApplyStatus && <p className="quick-apply-status">{quickApplyStatus}</p>}
          </div>
        </div>
      )}

      <footer className="home-footer">
        <div className="home-footer-grid">
          <div className="home-footer-col">
            <h3>Tuyển dụng Ninh Bình</h3>
            <a href="#">Về chúng tôi</a>
            <a href="#">Liên hệ</a>
            <a href="#">Hỗ trợ</a>
            <a href="#">Quy chế hoạt động</a>
            <Link to="/privacy-policy">Chính sách bảo mật</Link>
          </div>

          <div className="home-footer-col">
            <h3>Dành cho Nhà tuyển dụng</h3>
            <Link to={postJobLink}>Đăng tin tuyển dụng</Link>
            <a href="#">Tìm kiếm hồ sơ</a>
            <a href="#">Gói dịch vụ</a>
            <a href="#">Liên hệ tư vấn</a>
          </div>

          <div className="home-footer-col">
            <h3>Việc làm theo ngành nghề</h3>
            <a href="#">Sản xuất</a>
            <a href="#">Kế toán</a>
            <a href="#">Nhân sự</a>
            <a href="#">IT / Phần mềm</a>
            <a href="#">Vận hành / Logistics</a>
          </div>

          <div className="home-footer-col">
            <h3>Kết nối</h3>
            <a href="mailto:hrninhbinhtuyendung@gmail.com" className="footer-contact-row">
              <img src={logoGmail} alt="Email" className="footer-contact-icon" />
              <span>Email: hrninhbinhtuyendung@gmail.com</span>
            </a>
            <a href="tel:0900000000" className="footer-contact-row">
              <span className="footer-mobile-icon" aria-hidden="true">
                📱
              </span>
              <span>Hotline: 0900 000 000</span>
            </a>
            <p className="footer-app-title">Tải ứng dụng (sắp ra mắt)</p>
            <div className="footer-app-badges">
              <span>App Store</span>
              <span>Google Play</span>
            </div>
          </div>
        </div>

        <div className="home-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Tuyển dụng Ninh Bình. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
