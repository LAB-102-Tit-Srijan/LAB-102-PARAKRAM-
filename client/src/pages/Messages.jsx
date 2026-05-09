import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";

function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatConversationTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday - startOfMessageDay) / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    if (dayDiff === 1) {
      return "Yesterday";
    }
    if (dayDiff < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  useEffect(() => {
    let active = true;

    const loadConversations = async () => {
      try {
        const response = await api.get("/messages/conversations");
        if (active) {
          setConversations(response.data || []);
        }
      } catch (error) {
        if (active) {
          setConversations([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadConversations();
    const interval = setInterval(loadConversations, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-3xl border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-semibold">Conversations</h2>
        {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>}
        {!loading && conversations.length === 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">No conversations yet.</p>
        )}
        <div className="mt-4 space-y-3">
          {conversations.map((conversation) => (
            <button
              key={conversation.other_user_id}
              onClick={() => navigate(`/messages/chat?userId=${conversation.other_user_id}`)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {conversation.listing_image ? (
                    <img
                      src={conversation.listing_image}
                      alt="Listing"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-xs text-[var(--muted)]">
                      CL
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{conversation.other_name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                      {conversation.last_message_type === "image" ? (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px]">
                          Photo
                        </span>
                      ) : null}
                      {conversation.last_message_type !== "image" && (
                        <span>{conversation.last_message}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] text-[var(--muted)]">
                    {formatConversationTime(conversation.last_time)}
                  </span>
                  {conversation.unread_count > 0 && (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)]">
        Select a conversation to open the chat.
      </div>
    </div>
  );
}

export default Messages;
