import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import "./Messages.css";

type ConversationRow = {
  id: string;
  employer_user_id: string;
  candidate_user_id: string;
  created_at: string;
};

type MessageRow = {
  id: number;
  conversation_id: string;
  sender_user_id: string;
  message: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function useQueryParam(name: string) {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get(name), [location.search, name]);
}

function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const candidateUserIdParam = useQueryParam("candidate");
  const conversationIdParam = useQueryParam("conversation");

  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const nextAuthPath = useMemo(
    () => `/auth?mode=signin&next=${encodeURIComponent("/messages")}`,
    []
  );

  const client = supabase;
  const configured = isSupabaseConfigured && Boolean(client);

  const otherParticipantId = useMemo(() => {
    if (!user || !activeConversationId) return "";
    const conversation = conversations.find((item) => item.id === activeConversationId);
    if (!conversation) return "";
    return conversation.employer_user_id === user.id
      ? conversation.candidate_user_id
      : conversation.employer_user_id;
  }, [activeConversationId, conversations, user]);

  const otherParticipantLabel = useMemo(() => {
    if (!otherParticipantId) return "";
    const profile = profilesById[otherParticipantId];
    return profile?.full_name || profile?.email || `User ${otherParticipantId.slice(0, 8)}`;
  }, [otherParticipantId, profilesById]);

  useEffect(() => {
    if (!user) {
      setStatusText("Bạn cần đăng nhập để xem tin nhắn.");
      setConversations([]);
      setActiveConversationId("");
      setMessages([]);
      return;
    }

    if (!configured || !client) {
      setStatusText("Chưa cấu hình Supabase.");
      setConversations([]);
      setActiveConversationId("");
      setMessages([]);
      return;
    }

    const bootstrap = async () => {
      setLoading(true);
      setStatusText("");

      const preferredConversationId = (conversationIdParam || "").trim();
      if (preferredConversationId) {
        setActiveConversationId(preferredConversationId);
      } else if (candidateUserIdParam && candidateUserIdParam !== user.id) {
        const upsertResult = await client
          .from("chat_conversations")
          .upsert(
            { employer_user_id: user.id, candidate_user_id: candidateUserIdParam },
            { onConflict: "employer_user_id,candidate_user_id" }
          )
          .select("id")
          .single();

        if (upsertResult.error) {
          setStatusText(`Không mở được hội thoại: ${upsertResult.error.message}`);
        } else if (upsertResult.data?.id) {
          setActiveConversationId(upsertResult.data.id as string);
        }
      }

      const { data, error } = await client
        .from("chat_conversations")
        .select("id, employer_user_id, candidate_user_id, created_at")
        .or(`employer_user_id.eq.${user.id},candidate_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        setStatusText(`Không tải được danh sách hội thoại: ${error.message}`);
        setConversations([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as ConversationRow[];
      setConversations(rows);

      if (preferredConversationId) {
        const exists = rows.some((row) => row.id === preferredConversationId);
        if (!exists) {
          setStatusText("Không tìm thấy hội thoại hoặc bạn không có quyền truy cập.");
          if (rows.length > 0) {
            setActiveConversationId(rows[0].id);
          }
        }
      } else if (rows.length > 0) {
        setActiveConversationId((prev) => prev || rows[0].id);
      }

      const ids = new Set<string>();
      for (const row of rows) {
        ids.add(row.employer_user_id);
        ids.add(row.candidate_user_id);
      }

      if (ids.size > 0) {
        const profileResult = await client
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", Array.from(ids));

        if (!profileResult.error) {
          const map: Record<string, ProfileRow> = {};
          for (const profile of (profileResult.data ?? []) as ProfileRow[]) {
            map[profile.id] = profile;
          }
          setProfilesById(map);
        }
      }

      setLoading(false);
    };

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, configured, candidateUserIdParam, conversationIdParam]);

  useEffect(() => {
    if (!user || !configured || !client || !activeConversationId) return;

    const loadMessages = async () => {
      const { data, error } = await client
        .from("chat_messages")
        .select("id, conversation_id, sender_user_id, message, created_at")
        .eq("conversation_id", activeConversationId)
        .order("id", { ascending: true })
        .limit(200);

      if (error) {
        setStatusText(`Không tải được tin nhắn: ${error.message}`);
        setMessages([]);
        return;
      }

      setMessages((data ?? []) as MessageRow[]);
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };

    void loadMessages();
  }, [activeConversationId, configured, client, user]);

  useEffect(() => {
    if (!configured || !client || !activeConversationId) return;

    const channel = client
      .channel(`chat:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((item) => item.id === row.id)) return prev;
            return [...prev, row];
          });
          setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeConversationId, configured, client]);

  const sendMessage = async () => {
    if (!user) {
      navigate(nextAuthPath);
      return;
    }

    if (!configured || !client) {
      setStatusText("Chưa cấu hình Supabase.");
      return;
    }

    if (!activeConversationId) {
      setStatusText("Chưa chọn hội thoại.");
      return;
    }

    const content = messageInput.trim();
    if (!content) return;

    setSending(true);
    setStatusText("");

    const insertResult = await client
      .from("chat_messages")
      .insert({
        conversation_id: activeConversationId,
        sender_user_id: user.id,
        message: content,
      })
      .select("id, conversation_id, sender_user_id, message, created_at")
      .single();

    if (insertResult.error) {
      setStatusText(`Gửi thất bại: ${insertResult.error.message}`);
      setSending(false);
      return;
    }

    const inserted = insertResult.data as MessageRow;
    setMessages((prev) => {
      if (prev.some((item) => item.id === inserted.id)) return prev;
      return [...prev, inserted];
    });
    setMessageInput("");
    setSending(false);
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  if (!user) {
    return (
      <div className="messages-page">
        <header className="messages-hero">
          <p className="messages-breadcrumb">
            <Link to="/">Trang chủ</Link> / Tin nhắn
          </p>
          <h1>Tin nhắn</h1>
          <p className="messages-subtitle">Đăng nhập để nhắn tin với ứng viên/nhà tuyển dụng.</p>
          <button type="button" className="messages-auth-btn" onClick={() => navigate(nextAuthPath)}>
            Đăng nhập
          </button>
        </header>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <header className="messages-hero">
        <p className="messages-breadcrumb">
          <Link to="/">Trang chủ</Link> / Tin nhắn
        </p>
        <h1>Tin nhắn</h1>
        {activeConversationId && otherParticipantLabel && (
          <p className="messages-subtitle">Đang chat với: {otherParticipantLabel}</p>
        )}
      </header>

      {statusText && <p className="messages-status">{statusText}</p>}

      <div className="messages-shell">
        <aside className="messages-sidebar">
          <div className="messages-sidebar-head">
            <strong>Hội thoại</strong>
            {loading && <span>Đang tải...</span>}
          </div>

          {conversations.length === 0 && !loading ? (
            <p className="messages-empty">Chưa có hội thoại nào.</p>
          ) : (
            <div className="messages-list">
              {conversations.map((item) => {
                const otherId =
                  item.employer_user_id === user.id ? item.candidate_user_id : item.employer_user_id;
                const label =
                  profilesById[otherId]?.full_name ||
                  profilesById[otherId]?.email ||
                  `User ${otherId.slice(0, 8)}`;
                const active = item.id === activeConversationId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`messages-item${active ? " active" : ""}`}
                    onClick={() => setActiveConversationId(item.id)}
                  >
                    <span className="messages-item-title">{label}</span>
                    <span className="messages-item-time">
                      {new Date(item.created_at).toLocaleString("vi-VN")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="messages-main">
          {!activeConversationId ? (
            <p className="messages-empty">Chọn một hội thoại để bắt đầu.</p>
          ) : (
            <>
              <div className="messages-thread">
                {messages.length === 0 ? (
                  <p className="messages-empty">Chưa có tin nhắn.</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_user_id === user.id;
                    return (
                      <div key={msg.id} className={`bubble-row${mine ? " mine" : ""}`}>
                        <div className={`bubble${mine ? " mine" : ""}`}>
                          <p>{msg.message}</p>
                          <small>{new Date(msg.created_at).toLocaleString("vi-VN")}</small>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>

              <div className="messages-compose">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <button type="button" onClick={() => void sendMessage()} disabled={sending}>
                  {sending ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Messages;
