import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000"; // backend url

const socket = io(API_URL, {
  transports: ["websocket"],
});

export default function App() {
  const [sender, setSender] = useState("Sishir");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  const chatRef = useRef(null);

  const timeNow = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const myName = useMemo(() => sender.trim().toLowerCase(), [sender]);

  // Fetch old messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/messages`);
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("Fetch error:", err);
        setMessages([]);
      }
    };
    loadMessages();
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, deleted: true } : m))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive_message");
      socket.off("message_deleted");
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    if (!sender.trim()) return alert("Enter your name first 😄");
    if (!message.trim()) return;

    const payload = {
      sender: sender.trim(),
      message: message.trim(),
      time: timeNow(),
    };

    socket.emit("send_message", payload);
    setMessage("");
  };

  const deleteMessage = (id) => {
    socket.emit("delete_message", id);
  };

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              {sender?.trim()?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={styles.title}>Pulse Chat</div>
              <div style={styles.subTitle}>
                {connected ? "🟢 Live" : "🔴 Offline"}
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.dot} />
            <div style={styles.dot} />
            <div style={styles.dot} />
          </div>
        </div>

        {/* Name input */}
        <div style={styles.nameWrap}>
          <input
            style={styles.nameInput}
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="Your name"
          />
        </div>

        {/* Chat Area */}
        <div ref={chatRef} style={styles.chatArea}>
          {messages
            .filter((m) => !m.deleted)
            .map((m) => {
              const isMe = m.sender?.trim()?.toLowerCase() === myName;
              return (
                <div
                  key={m._id}
                  style={{
                    ...styles.msgRow,
                    justifyContent: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.bubble,
                      ...(isMe ? styles.bubbleMe : styles.bubbleOther),
                    }}
                  >
                    <div style={styles.senderLine}>
                      <span style={{ opacity: 0.9, fontWeight: 700 }}>
                        {m.sender}
                      </span>
                      <span style={styles.time}>{m.time}</span>
                    </div>

                    <div style={styles.text}>{m.message}</div>

                    <div style={styles.actions}>
                      <button
                        style={{
                          ...styles.deleteBtn,
                          ...(isMe ? styles.deleteMe : styles.deleteOther),
                        }}
                        onClick={() => deleteMessage(m._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {messages.filter((m) => !m.deleted).length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyGlow} />
              <div style={styles.emptyText}>No messages yet ✨</div>
              <div style={styles.emptyHint}>
                Start the first message and test realtime chat.
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={styles.inputBar}>
          <input
            style={styles.msgInput}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type something..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: translateY(10px) scale(0.98); opacity: 0; }
          to { transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes glow {
          0% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.05); opacity: 0.55; }
          100% { transform: scale(1); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 10% 10%, rgba(120,80,255,0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0,255,200,0.22), transparent 40%), radial-gradient(circle at 50% 90%, rgba(255,60,180,0.25), transparent 45%), #05060a",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
  },

  phone: {
    width: 380,
    maxWidth: "92vw",
    height: 720,
    maxHeight: "92vh",
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(18,18,28,0.85), rgba(10,10,16,0.85))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "0 25px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
  },

  header: {
    padding: "16px 16px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(90deg, rgba(120,80,255,0.22), rgba(0,255,200,0.10), rgba(255,60,180,0.12))",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "white",
    background:
      "linear-gradient(135deg, rgba(120,80,255,1), rgba(0,255,200,0.9))",
    boxShadow: "0 10px 25px rgba(120,80,255,0.25)",
  },

  title: {
    fontSize: 16,
    fontWeight: 800,
    color: "white",
    letterSpacing: 0.3,
  },

  subTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  headerRight: {
    display: "flex",
    gap: 6,
    opacity: 0.7,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.7)",
  },

  nameWrap: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  nameInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 16,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 14,
  },

  chatArea: {
    flex: 1,
    padding: "14px 12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  msgRow: {
    display: "flex",
    width: "100%",
  },

  bubble: {
    maxWidth: "85%",
    padding: "10px 12px",
    borderRadius: 18,
    animation: "popIn 0.22s ease-out",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  bubbleMe: {
    background:
      "linear-gradient(135deg, rgba(120,80,255,0.55), rgba(0,255,200,0.25))",
    boxShadow: "0 10px 30px rgba(120,80,255,0.18)",
    borderTopRightRadius: 8,
  },

  bubbleOther: {
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    borderTopLeftRadius: 8,
  },

  senderLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 6,
  },

  time: {
    fontSize: 11,
    opacity: 0.7,
  },

  text: {
    color: "white",
    fontSize: 14,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  actions: {
    marginTop: 10,
    display: "flex",
    justifyContent: "flex-end",
  },

  deleteBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },

  deleteMe: {
    background: "rgba(255,60,180,0.25)",
    color: "white",
  },

  deleteOther: {
    background: "rgba(255,255,255,0.10)",
    color: "white",
  },

  inputBar: {
    padding: "12px 12px",
    display: "flex",
    gap: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
  },

  msgInput: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 18,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 14,
  },

  sendBtn: {
    width: 48,
    borderRadius: 18,
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 900,
    color: "black",
    background:
      "linear-gradient(135deg, rgba(0,255,200,1), rgba(120,80,255,1))",
    boxShadow: "0 10px 25px rgba(0,255,200,0.15)",
  },

  emptyState: {
    marginTop: 30,
    padding: 20,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    position: "relative",
    overflow: "hidden",
  },

  emptyGlow: {
    position: "absolute",
    inset: -40,
    background:
      "radial-gradient(circle at 30% 30%, rgba(120,80,255,0.35), transparent 45%), radial-gradient(circle at 70% 70%, rgba(0,255,200,0.18), transparent 45%)",
    animation: "glow 2.5s ease-in-out infinite",
  },

  emptyText: {
    position: "relative",
    color: "white",
    fontWeight: 900,
    fontSize: 14,
  },

  emptyHint: {
    position: "relative",
    marginTop: 6,
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
};
