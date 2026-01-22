import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Chat({ API_URL, me, socketRef, clearUnread }) {
  const navigate = useNavigate();
  const params = useParams();
  const other = useMemo(() => params.username?.toLowerCase(), [params.username]);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const chatRef = useRef(null);

  // load messages when opening chat
  useEffect(() => {
    if (!other) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/messages/${me}/${other}`);
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("fetch messages error:", err);
      }
    };

    load();
    clearUnread(other);
  }, [API_URL, me, other]);

  // socket listener
  useEffect(() => {
    if (!socketRef.current) return;

    const handler = (msg) => {
      const s = msg.sender?.toLowerCase();
      const r = msg.receiver?.toLowerCase();

      const belongs =
        (s === me && r === other) || (s === other && r === me);

      if (belongs) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socketRef.current.on("receive_message", handler);

    return () => {
      socketRef.current?.off("receive_message", handler);
    };
  }, [me, other, socketRef]);

  // auto scroll
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const payload = {
      sender: me,
      receiver: other,
      message: message.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socketRef.current.emit("send_message", payload);
    setMessage("");
  };

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <div style={styles.top}>
          <button style={styles.back} onClick={() => navigate("/")}>
            ←
          </button>
          <div>
            <div style={styles.title}>{other}</div>
            <div style={styles.sub}>1-1 chat</div>
          </div>
        </div>

        <div ref={chatRef} style={styles.chatArea}>
          {messages.map((m) => {
            const isMe = m.sender?.toLowerCase() === me;
            return (
              <div
                key={m._id}
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    ...(isMe ? styles.bubbleMe : styles.bubbleOther),
                  }}
                >
                  <div style={styles.msgText}>{m.message}</div>
                  <div style={styles.time}>{m.time}</div>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div style={styles.empty}>Start your first message ✨</div>
          )}
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            placeholder="Type message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button style={styles.send} onClick={sendMessage}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 10% 10%, rgba(120,80,255,0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0,255,200,0.22), transparent 40%), #05060a",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
    color: "white",
  },
  phone: {
    width: 420,
    maxWidth: "95vw",
    height: 740,
    maxHeight: "92vh",
    borderRadius: 28,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,10,16,0.75)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
  },
  top: {
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(90deg, rgba(120,80,255,0.22), rgba(0,255,200,0.10), rgba(255,60,180,0.12))",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 16,
  },
  title: { fontWeight: 900, fontSize: 16 },
  sub: { opacity: 0.7, fontSize: 12, marginTop: 2 },
  chatArea: {
    flex: 1,
    padding: 14,
    overflowY: "auto",
  },
  bubble: {
    maxWidth: "78%",
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
  },
  bubbleMe: {
    background:
      "linear-gradient(135deg, rgba(120,80,255,0.55), rgba(0,255,200,0.25))",
    borderTopRightRadius: 8,
  },
  bubbleOther: {
    background: "rgba(255,255,255,0.06)",
    borderTopLeftRadius: 8,
  },
  msgText: { fontSize: 14, color: "white" },
  time: { fontSize: 11, opacity: 0.7, marginTop: 6, textAlign: "right" },
  empty: {
    marginTop: 40,
    textAlign: "center",
    opacity: 0.7,
  },
  inputRow: {
    padding: 12,
    display: "flex",
    gap: 10,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
  },
  send: {
    width: 52,
    borderRadius: 18,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    color: "black",
    background:
      "linear-gradient(135deg, rgba(0,255,200,1), rgba(120,80,255,1))",
  },
};
