import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [mode, setMode] = useState("login");

  // auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // users list
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // chat
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);
  const socketRef = useRef(null);

  const myName = useMemo(() => username.trim().toLowerCase(), [username]);

  // auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // ✅ Fetch all users
  const fetchUsers = async (currentUser) => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();

      const me = (currentUser || myName || "").toLowerCase();
      setUsers(Array.isArray(data) ? data.filter((u) => u.username !== me) : []);
    } catch (err) {
      console.log("users fetch error:", err);
      setUsers([]);
    }
  };

  // ✅ Fetch 1-1 messages between 2 users
  const fetchMessages = async (otherUser) => {
    if (!myName || !otherUser) return;

    try {
      const res = await fetch(
        `${API_URL}/messages/${myName}/${otherUser.username}`
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("messages fetch error:", err);
      setMessages([]);
    }
  };

  // ✅ Setup socket ONLY after login
  useEffect(() => {
    if (!token || !myName) return;

    // create socket once
    socketRef.current = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    // debug
    socketRef.current.on("connect", () => {
      console.log("✅ socket connected:", socketRef.current.id);

      // 🔥 VERY IMPORTANT: join your username room
      socketRef.current.emit("join", myName);
    });

    socketRef.current.on("connect_error", (err) => {
      console.log("❌ socket connect_error:", err.message);
    });

    // receive messages (both sender + receiver will get)
    socketRef.current.on("receive_message", (msg) => {
      // show only if current chat is open with that user
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, myName]);

  // when selecting a user, fetch their chat
  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages(selectedUser);
  }, [selectedUser]);

  // login
  const login = async () => {
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

      // backend returns username
      setUsername(data.username);

      // load users list after login
      setTimeout(() => fetchUsers(data.username), 200);
    } catch (err) {
      alert("Login error");
    }
  };

  // register
  const register = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Register failed");

      alert("Registered ✅ now login");
      setMode("login");
    } catch (err) {
      alert("Register error");
    }
  };

  // send message
  const sendMessage = () => {
    if (!socketRef.current) return alert("Socket not connected ❌");
    if (!selectedUser) return alert("Select a user first 😄");
    if (!message.trim()) return;

    const payload = {
      sender: myName,
      receiver: selectedUser.username,
      message: message.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socketRef.current.emit("send_message", payload);

    setMessage("");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUsers([]);
    setSelectedUser(null);
    setMessages([]);
    setUsername("");
    setPassword("");
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // ---------------- UI ----------------
  if (!token) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h2 style={styles.title}>Pulse Chat</h2>
          <p style={styles.sub}>
            {mode === "login" ? "Login" : "Create new account"}
          </p>

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

          <button
            style={styles.button}
            onClick={mode === "login" ? login : register}
          >
            {mode === "login" ? "Login" : "Register"}
          </button>

          <button
            style={styles.secondary}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Create account"
              : "Already have account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* left users list */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <h3 style={{ margin: 0 }}>Users</h3>
          <button style={styles.logout} onClick={logout}>
            Logout
          </button>
        </div>

        <button style={styles.refresh} onClick={() => fetchUsers()}>
          Refresh Users
        </button>

        <div style={styles.userList}>
          {users.map((u) => (
            <div
              key={u.username}
              style={{
                ...styles.userItem,
                border:
                  selectedUser?.username === u.username
                    ? "2px solid #00ffd5"
                    : "1px solid rgba(255,255,255,0.1)",
              }}
              onClick={() => {
                setSelectedUser(u);
                setMessages([]);
                fetchMessages(u);
              }}
            >
              {u.username}
            </div>
          ))}
        </div>
      </div>

      {/* right chat */}
      <div style={styles.chat}>
        {!selectedUser ? (
          <div style={styles.empty}>Select a user to start 1-1 chat 💬</div>
        ) : (
          <>
            <div style={styles.chatTop}>
              Chat with <b>{selectedUser.username}</b>
            </div>

            <div style={styles.messages} ref={chatRef}>
              {messages.map((m) => {
                const isMe = m.sender === myName;
                return (
                  <div
                    key={m._id || Math.random()}
                    style={{
                      ...styles.msg,
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      background: isMe
                        ? "linear-gradient(90deg,#00ffd5,#6c63ff)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                      {isMe ? "You" : m.sender} • {m.time || ""}
                    </div>
                    {m.message}
                  </div>
                );
              })}
            </div>

            <div style={styles.inputRow}>
              <input
                style={styles.chatInput}
                placeholder="Type message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button style={styles.send} onClick={sendMessage}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0b0b0f",
    color: "white",
  },
  card: {
    width: 330,
    padding: 20,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 0 30px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { margin: 0, fontSize: 22 },
  sub: { margin: 0, opacity: 0.7 },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.4)",
    color: "white",
  },
  button: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    background: "linear-gradient(90deg,#00ffd5,#6c63ff)",
  },
  secondary: {
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    background: "transparent",
    color: "white",
    opacity: 0.8,
  },

  app: {
    height: "100vh",
    display: "flex",
    background: "#0b0b0f",
    color: "white",
  },
  sidebar: {
    width: 260,
    padding: 14,
    borderRight: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sidebarTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logout: {
    padding: "6px 10px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "rgba(255,255,255,0.1)",
    color: "white",
  },
  refresh: {
    padding: 10,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "rgba(255,255,255,0.08)",
    color: "white",
  },
  userList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  },
  userItem: {
    padding: 12,
    borderRadius: 14,
    cursor: "pointer",
    background: "rgba(255,255,255,0.04)",
  },
  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    margin: "auto",
    opacity: 0.6,
    fontSize: 18,
  },
  chatTop: {
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  messages: {
    flex: 1,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflowY: "auto",
  },
  msg: {
    maxWidth: "70%",
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 14,
  },
  inputRow: {
    display: "flex",
    padding: 14,
    gap: 10,
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  chatInput: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.4)",
    color: "white",
  },
  send: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    background: "linear-gradient(90deg,#00ffd5,#6c63ff)",
  },
};
