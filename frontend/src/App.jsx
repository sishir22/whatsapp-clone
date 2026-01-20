import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://whatsapp-clone-production-7cdd.up.railway.app";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [mode, setMode] = useState("login"); // login | register

  // auth inputs
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // chat
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  const chatRef = useRef(null);

  const myName = useMemo(() => username.trim().toLowerCase(), [username]);

  // socket (only when logged in)
  const socket = useMemo(() => {
    if (!token) return null;
    return io(API_URL, { transports: ["websocket"] });
  }, [token]);

  const timeNow = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // fetch old messages after login
  useEffect(() => {
    if (!token) return;

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
  }, [token]);

  // socket listeners
  useEffect(() => {
    if (!socket) return;

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
      socket.disconnect();
    };
  }, [socket]);

  // scroll bottom
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // register
  const registerUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Register failed");

      alert("Registered successfully ✅ Now login");
      setMode("login");
    } catch (err) {
      alert("Register error");
      console.log(err);
    }
  };

  // login
  const loginUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Login failed");

      localStorage.setItem("token", data.token);
      setToken(data.token);
      alert("Login success ✅");
    } catch (err) {
      alert("Login error");
      console.log(err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setMessages([]);
    setConnected(false);
  };

  const sendMessage = () => {
    if (!socket) return;
    if (!username.trim()) return alert("Enter username");
    if (!message.trim()) return;

    const payload = {
      sender: username.trim(),
      message: message.trim(),
      time: timeNow(),
    };

    socket.emit("send_message", payload);
    setMessage("");
  };

  const deleteMessage = (id) => {
    if (!socket) return;
    socket.emit("delete_message", id);
  };

  // =========================
  // UI: AUTH SCREEN
  // =========================
  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.phone}>
          <div style={styles.header}>
            <div>
              <div style={styles.title}>Pulse Chat</div>
              <div style={styles.subTitle}>
                {mode === "login" ? "Login to continue" : "Create new account"}
              </div>
            </div>
          </div>

          <div style={styles.authBox}>
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {mode === "login" ? (
              <button style={styles.primaryBtn} onClick={loginUser}>
                Login
              </button>
            ) : (
              <button style={styles.primaryBtn} onClick={registerUser}>
                Register
              </button>
            )}

            <button
              style={styles.secondaryBtn}
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login"
                ? "New user? Register"
                : "Already have account? Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // UI: CHAT SCREEN
  // =========================
  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              {username?.trim()?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={styles.title}>Pulse Chat</div>
              <div style={styles.subTitle}>
                {connected ? "🟢 Live" : "🔴 Offline"}
              </div>
            </div>
          </div>

          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>

        {/* Chat */}
        <div ref={chatRef} style={styles.chatArea}>
          {messages.map((m) => {
            const isMe = m.sender?.trim()?.toLowerCase() === myName;

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
                    background: isMe
                      ? "linear-gradient(135deg, rgba(120,80,255,0.55), rgba(0,255,200,0.25))"
                      : "rgba(255,255,255,0.06)",
                    opacity: m.deleted ? 0.55 : 1,
                  }}
                >
                  <div style={styles.senderLine}>
                    <span style={{ fontWeight: 800 }}>{m.sender}</span>
                    <span style={styles.time}>{m.time}</span>
                  </div>

                  <div style={styles.text}>
                    {m.deleted ? (
                      <i style={{ opacity: 0.8 }}>message deleted</i>
                    ) : (
                      m.message
                    )}
                  </div>

                  {!m.deleted && (
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteMessage(m._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
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
  },

  title: {
    fontSize: 16,
    fontWeight: 900,
    color: "white",
  },

  subTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  logoutBtn: {
    background: "rgba(255,255,255,0.08)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
  },

  authBox: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 16,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 14,
  },

  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "black",
    background:
      "linear-gradient(135deg, rgba(0,255,200,1), rgba(120,80,255,1))",
  },

  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
    fontWeight: 800,
    color: "white",
    background: "rgba(255,255,255,0.05)",
  },

  chatArea: {
    flex: 1,
    padding: "14px 12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  bubble: {
    maxWidth: "85%",
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
  },

  senderLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12,
    marginBottom: 6,
    color: "rgba(255,255,255,0.9)",
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

  deleteBtn: {
    marginTop: 10,
    padding: "6px 10px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    background: "rgba(255,60,180,0.25)",
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
  },
};
