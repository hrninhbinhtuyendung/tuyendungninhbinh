import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase, type JobRecord } from "../lib/supabase";
import "./SavedJobs.css";

type SavedJobItem = {
  savedAt: string;
  job: JobRecord;
};

function SavedJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const nextAuthPath = useMemo(
    () => `/auth?mode=signin&next=${encodeURIComponent("/saved")}`,
    []
  );

  useEffect(() => {
    if (!user) {
      setItems([]);
      setStatusText("Bạn cần đăng nhập để xem danh sách việc đã lưu.");
      return;
    }

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setItems([]);
      setStatusText("Chưa cấu hình Supabase.");
      return;
    }

    const loadSavedJobs = async () => {
      setLoading(true);
      setStatusText("");

      const { data, error } = await client
        .from("job_saves")
        .select("job_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setStatusText(`Không tải được danh sách đã lưu: ${error.message}`);
        setItems([]);
        setLoading(false);
        return;
      }

      const savedRows = (data ?? []) as Array<{ job_id: number; created_at: string }>;
      const jobIds = savedRows.map((row) => row.job_id);

      if (jobIds.length === 0) {
        setItems([]);
        setStatusText("Bạn chưa lưu công việc nào.");
        setLoading(false);
        return;
      }

      const jobsResult = await client
        .from("jobs")
        .select(
          "id, user_id, title, company, salary, location, tags, view_count, job_requirement, language_requirement, contact_info, description, created_at"
        )
        .in("id", jobIds);

      if (jobsResult.error) {
        setStatusText(`Không tải được chi tiết công việc: ${jobsResult.error.message}`);
        setItems([]);
        setLoading(false);
        return;
      }

      const jobById = new Map<number, JobRecord>();
      for (const job of (jobsResult.data ?? []) as JobRecord[]) {
        jobById.set(job.id, job);
      }

      const nextItems: SavedJobItem[] = [];
      for (const row of savedRows) {
        const job = jobById.get(row.job_id);
        if (!job) continue;
        nextItems.push({ savedAt: row.created_at, job });
      }

      setItems(nextItems);
      setLoading(false);
    };

    void loadSavedJobs();
  }, [user]);

  const removeSaved = async (jobId: number) => {
    const client = supabase;
    if (!user || !isSupabaseConfigured || !client) return;

    const previous = items;
    setItems((prev) => prev.filter((item) => item.job.id !== jobId));

    const { error } = await client
      .from("job_saves")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId);

    if (error) {
      setItems(previous);
      setStatusText(`Bỏ lưu thất bại: ${error.message}`);
      return;
    }

    if (previous.length === 1) {
      setStatusText("Bạn chưa lưu công việc nào.");
    }
  };

  return (
    <div className="saved-page">
      <header className="saved-hero">
        <p className="saved-breadcrumb">
          <Link to="/">Trang chủ</Link> / Việc đã lưu
        </p>
        <h1>Việc đã lưu</h1>
        <p className="saved-subtitle">
          Lưu công việc để xem lại trên mọi thiết bị khi đăng nhập.
        </p>

        {!user && (
          <button type="button" className="saved-auth-btn" onClick={() => navigate(nextAuthPath)}>
            Đăng nhập để xem
          </button>
        )}
      </header>

      <section className="saved-content">
        {statusText && <p className="saved-status">{statusText}</p>}
        {loading && <p className="saved-status">Đang tải...</p>}

        {items.length > 0 && (
          <div className="saved-grid">
            {items.map((item) => (
              <article key={item.job.id} className="saved-card">
                <div className="saved-card-head">
                  <h2>{item.job.title}</h2>
                  <button
                    type="button"
                    className="saved-remove-btn"
                    onClick={() => void removeSaved(item.job.id)}
                    title="Bỏ lưu"
                  >
                    Bỏ lưu
                  </button>
                </div>
                <p className="saved-company">{item.job.company}</p>
                <div className="saved-meta">
                  <span>{item.job.salary}</span>
                  <span>{item.job.location}</span>
                </div>
                <div className="saved-actions">
                  <Link className="saved-link" to={`/job/${item.job.id}`}>
                    Xem chi tiết
                  </Link>
                  <Link className="saved-link secondary" to={`/apply/${item.job.id}`}>
                    Ứng tuyển
                  </Link>
                </div>
                <p className="saved-time">
                  Đã lưu: {new Date(item.savedAt).toLocaleString("vi-VN")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SavedJobs;
