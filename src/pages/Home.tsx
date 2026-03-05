import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const sortJobsByViews = (jobList: JobView[]) =>
    [...jobList].sort((a, b) => b.viewCount - a.viewCount);

  const categories = [
    "Kinh doanh / Bán hàng",
    "Marketing / Truyền thông",
    "Chăm sóc khách hàng",
    "Nhân sự / Hành chính",
    "Công nghệ thông tin",
    "Thiết kế sáng tạo",
    "Tài chính / Kế toán",
    "Vận hành / Logistics",
  ];

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

  const keywordSuggestions = useMemo(() => {
    const key = normalizeText(keywordInput.trim());
    if (!key) return [] as string[];

    const unique = new Set<string>();
    jobs.forEach((job) => {
      const candidates = [job.title, job.company, ...(job.tags || [])];
      candidates.forEach((item) => {
        const label = item.trim();
        if (!label) return;
        if (normalizeText(label).includes(key)) unique.add(label);
      });
    });
    return Array.from(unique).slice(0, 8);
  }, [jobs, keywordInput]);

  const locationSuggestions = useMemo(() => {
    const key = normalizeText(locationInput.trim());
    const unique = new Set<string>();
    jobs.forEach((job) => {
      const location = (job.location || "").trim();
      if (!location) return;
      if (!key || normalizeText(location).includes(key)) unique.add(location);
    });
    return Array.from(unique).slice(0, 8);
  }, [jobs, locationInput]);

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
            <Link className="cta-employer auth-link" to="/post">
              Đăng tin tuyển dụng
            </Link>
            <Link className="cta-cv auth-link cta-cv-button" to="/upload-cv">
              Đăng CV miễn phí
            </Link>
          </div>

          <div className="auth-buttons">
            {!user ? (
              <>
                <Link className="outline auth-link" to="/auth?mode=signup">
                  Đăng ký
                </Link>
                <Link className="primary auth-link" to="/auth?mode=signin">
                  Đăng nhập
                </Link>
              </>
            ) : (
              <>
                <Link className="user-chip" to="/account">
                  {user.email}
                </Link>
                <button className="outline" onClick={() => void signOut()}>
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-main">
          <p className="hero-badge">Nền tảng việc làm tại địa phương</p>
          <h1>Tìm việc nhanh tại Ninh Bình, kết nối doanh nghiệp uy tín</h1>
          <p className="hero-description">
            Tổng hợp tin tuyển dụng mới nhất tại Ninh Bình, giúp ứng viên tiếp
            cận cơ hội phù hợp nhanh hơn.
          </p>

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

      <section className="categories">
        <h2>Ngành nghề phổ biến tại Ninh Bình</h2>
        <div className="category-list">
          {categories.map((item) => (
            <button key={item} className="category-item">
              {item}
            </button>
          ))}
        </div>
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
              <button
                type="button"
                className="job-link job-link-button"
                onClick={() => void handleJobClick(job.id)}
              >
                Xem chi tiết
              </button>
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
            <Link to="/post">Đăng tin tuyển dụng</Link>
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
