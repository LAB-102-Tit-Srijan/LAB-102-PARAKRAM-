import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../api";
import ConditionBadge from "../components/ConditionBadge";
import { useAuth } from "../store.jsx";

const formatTime = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const otherUserIdNum = Number(searchParams.get("userId"));
  const listingIdParam = searchParams.get("listingId");
  const listingIdNum = listingIdParam ? Number(listingIdParam) : null;
  const hasListingId = listingIdNum !== null && !Number.isNaN(listingIdNum);

  const [messages, setMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listing, setListing] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageDraft, setImageDraft] = useState("");

  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const combinedMessages = useMemo(() => {
    const merged = [...messages, ...pendingMessages];
    return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, pendingMessages]);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      if (!otherUserIdNum || Number.isNaN(otherUserIdNum)) {
        return;
      }
      const params = hasListingId ? `?listing_id=${listingIdNum}` : "";
      try {
        const response = await api.get(`/messages/${otherUserIdNum}${params}`);
        if (active) {
          setMessages(response.data || []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const startPolling = () => {
      if (!pollRef.current) {
        pollRef.current = setInterval(loadMessages, 3000);
      }
    };

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }
      loadMessages();
      startPolling();
    };

    loadMessages();
    if (!document.hidden) {
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [otherUserIdNum, listingIdNum, hasListingId]);

  useEffect(() => {
    if (!hasListingId) {
      return;
    }

    let active = true;
    const loadListing = async () => {
      try {
        const response = await api.get(`/listings/${listingIdNum}`);
        if (active) {
          setListing(response.data);
        }
      } catch (error) {
        if (active) {
          setListing(null);
        }
      }
    };

    loadListing();
    return () => {
      active = false;
    };
  }, [listingIdNum, hasListingId]);

  useEffect(() => {
    if (!otherUserIdNum || Number.isNaN(otherUserIdNum)) {
      return;
    }

    let active = true;
    const loadOtherUser = async () => {
      try {
        const response = await api.get(`/auth/user/${otherUserIdNum}`);
        if (active) {
          setOtherUser(response.data);
        }
      } catch (error) {
        if (active) {
          setOtherUser(null);
        }
      }
    };

    loadOtherUser();
    return () => {
      active = false;
    };
  }, [otherUserIdNum]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [combinedMessages]);

  const handleFilePick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImageDraft(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendPayload = async ({ messageType, content, imageUrl }) => {
    if (!otherUserIdNum || Number.isNaN(otherUserIdNum)) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      sender_id: user?.id,
      receiver_id: otherUserIdNum,
      listing_id: hasListingId ? listingIdNum : null,
      content: content || "",
      message_type: messageType,
      image_url: imageUrl || null,
      is_read: 0,
      created_at: new Date().toISOString(),
      local_status: "sending"
    };

    setPendingMessages((prev) => [...prev, tempMessage]);
    if (messageType === "text") {
      setInput("");
    }
    if (messageType === "image") {
      setImageDraft("");
    }

    try {
      const response = await api.post("/messages", {
        receiver_id: otherUserIdNum,
        content: messageType === "text" ? content : "",
        listing_id: hasListingId ? listingIdNum : null,
        message_type: messageType,
        image_url: messageType === "image" ? imageUrl : null
      });

      setPendingMessages((prev) => prev.filter((message) => message.id !== tempId));
      setMessages((prev) =>
        prev.some((message) => message.id === response.data.id) ? prev : [...prev, response.data]
      );
    } catch (error) {
      setPendingMessages((prev) => prev.filter((message) => message.id !== tempId));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (imageDraft) {
      sendPayload({ messageType: "image", content: "", imageUrl: imageDraft });
      return;
    }
    if (trimmed) {
      sendPayload({ messageType: "text", content: trimmed });
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      const trimmed = input.trim();
      if (trimmed) {
        event.preventDefault();
        sendPayload({ messageType: "text", content: trimmed });
      }
    }
  };

  const otherInitial = otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : "U";

  return (
    <div
      key={`${otherUserIdNum}-${hasListingId ? listingIdNum : "none"}`}
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
    >
      <section className="flex h-[70vh] flex-col rounded-3xl border border-[var(--border)] bg-white p-6">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/messages")}
              className="rounded-full border border-[var(--border)] p-2"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-[var(--ink)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold">{otherUser?.name || "Student"}</p>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  Verified Student
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active now
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">Messages update every 3 seconds.</p>
        </header>

        <div ref={scrollRef} className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2">
          {loading && <p className="text-sm text-[var(--muted)]">Loading messages...</p>}
          {!loading && combinedMessages.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Start the conversation.</p>
          )}
          {combinedMessages.map((message) => {
            const isMine = message.sender_id === user?.id;
            const isSeen = message.is_read === 1;
            const isSending = message.local_status === "sending";
            const bubbleBase =
              "relative max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm";
            const bubbleClass = isMine
              ? `${bubbleBase} rounded-br-sm bg-[var(--ink)] text-white`
              : `${bubbleBase} rounded-bl-sm bg-[var(--bg)] text-[var(--ink)]`;

            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"} gap-3`}>
                {!isMine && (
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg)] text-xs font-semibold text-[var(--ink)]">
                    {otherInitial}
                  </div>
                )}
                <div>
                  <div className={bubbleClass}>
                    {message.message_type === "image" && message.image_url ? (
                      <img
                        src={message.image_url}
                        alt="Shared"
                        className="max-h-[200px] max-w-[200px] rounded-2xl object-cover"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                    {isMine && (
                      <div className="absolute bottom-1 right-2 flex items-center">
                        {isSending ? (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3 w-3 text-[var(--muted)]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 9l3 3 7-8" />
                          </svg>
                        ) : (
                          <div className="flex items-center">
                            <svg
                              viewBox="0 0 16 16"
                              className={`h-3 w-3 ${isSeen ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 9l3 3 7-8" />
                            </svg>
                            <svg
                              viewBox="0 0 16 16"
                              className={`-ml-1 h-3 w-3 ${
                                isSeen ? "text-[var(--teal)]" : "text-[var(--muted)]"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 9l3 3 7-8" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`mt-1 text-[10px] text-[var(--muted)] ${isMine ? "text-right" : ""}`}>
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {imageDraft && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center gap-3">
              <img src={imageDraft} alt="Preview" className="h-12 w-12 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-semibold">Photo ready</p>
                <p className="text-xs text-[var(--muted)]">Send to share in chat.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setImageDraft("")}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
            >
              Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleFilePick}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[var(--ink)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 5 17 10" />
              <line x1="12" y1="5" x2="12" y2="17" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm"
            placeholder="Type your message"
          />
          <button
            type="submit"
            disabled={!input.trim() && !imageDraft}
            className="flex h-10 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        {listing && (
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Listing</p>
            <div className="mt-3 flex items-center gap-3">
              <img
                src={listing.image_url || "https://picsum.photos/seed/fallback/120/120"}
                alt={listing.title}
                className="h-[60px] w-[60px] rounded-xl object-cover"
              />
              <div>
                <p className="text-sm font-semibold">{listing.title}</p>
                <p className="text-xs text-[var(--muted)]">Rs. {listing.price}</p>
                <ConditionBadge value={listing.condition} />
              </div>
            </div>
            <Link
              to={`/listings/${listing.id}`}
              className="mt-4 inline-flex items-center rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold"
            >
              View listing
            </Link>
          </div>
        )}
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
          Meet on campus after agreeing on details.
        </div>
      </aside>
    </div>
  );
}

export default Chat;
