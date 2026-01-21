import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [mode, setMode] = useState("login");

  // auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // app
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // unread counts { username: number }
  const [unread, setUnread] = useState({});

  const socketRef = useRef(null);
  const chatRef = useRef(null);

  const myName = useMemo(() => username.trim().toLowerCase(), [username]);
  const selectedName = useMemo(
    () => (selectedUser?.username || "").toLowerCase(),
    [selectedUser]
  );

  // scroll
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // fetch users
  const fetchUsers = async (me = myName) => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      const cleanMe = (me || "").toLowerCase();
      setUsers(Array.isArray(data) ? data.filter((u) => u.username !== cleanMe) : []);
    } catch (err) {
      console.log("users fetch error:", err);
      setUsers([]);
    }
  };

  // fetch messages for selected chat
  const fetchMessages = async (otherUser) => {
    if (!myName || !otherUser?.username) return;
    try {
      const res = await fetch(`${API_URL}/messages/${myName}/${otherUser.username}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("messages fetch error:", err);
      setMessages([]);
    }
  };

  // socket setup
  useEffect(() => {
    if (!token || !myName) return;

    socketRef.current = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ socket connected:", socketRef.current.id);
      socketRef.current.emit("join", myName);
    });

    socketRef.current.on("connect_error", (err) => {
      console.log("❌ socket error:", err.message);
    });

    // receive message
    socketRef.current.on("receive_message", (msg) => {
      const sender = (msg.sender || "").toLowerCase();
      const receiver = (msg.receiver || "").toLowerCase();

      // if this message is NOT related to me, ignore
      if (sender !== myName && receiver !== myName) return;

      // check if message belongs to currently open chat
      const belongsToOpenChat =
        selectedName &&
        ((sender === myName && receiver === selectedName) ||
          (sender === selectedName && receiver === myName));

      if (belongsToOpenChat) {
        setMessages((prev) => [...prev, msg]);
      } else {
        // 🔥 add unread badge for the sender
        const other = sender === myName ? receiver : sender;

        setUnread((prev) => ({
          ...prev,
          [other]: (prev[other] || 0) + 1,
        }));
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, myName, selectedName]);

  // select user
  const openChat = async (u) => {
    setSelectedUser(u);
    setMessages([]);

    // clear unread badge
    const uname = u.username.toLowerCase();
    setUnread((prev) => ({ ...prev, [uname]: 0 }));

    await fetchMessages(u);
  };

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
      setUsername(data.username);
      setPassword("");

      setTimeout(() => fetchUsers(data.username), 250);
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
      receiver: selectedUser.username.toLowerCase(),
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    setUnread({});
    setUsername("");
    setPassword("");
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // ---------------- UI ----------------
  if (!token) {
    return (
      <div style={styles.page}>
        <div style={styles.phone}>
          <div style={styles.header}>
            <div>
              <div style={styles.appTitle}>Pulse Chat</div>
              <div style={styles.appSub}>Private 1-1 realtime chat</div>
            </div>
          </div>

          <div style={styles.authBox}>
            <div style={styles.authTabs}>
              <button
                style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

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
              style={styles.primaryBtn}
              onClick={mode === "login" ? login : register}
            >
              {mode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        {/* top */}
        <div style={styles.header}>
          <div>
            <div style={styles.appTitle}>Pulse Chat</div>
            <div style={styles.appSub}>Logged in as: {myName}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>

        {/* users */}
        <div style={styles.usersPanel}>
          <div style={styles.usersTop}>
            <div style={styles.usersTitle}>Users</div>
            <button style={styles.smallBtn} onClick={() => fetchUsers()}>
              Refresh
            </button>
          </div>

          <div style={styles.usersList}>
            {users.map((u) => {
              const uname = u.username.toLowerCase();
              const isActive = selectedName === uname;
              const badge = unread[uname] || 0;

              return (
                <button
                  key={u._id || u.username}
                  style={{
                    ...styles.userRow,
                    ...(isActive ? styles.userRowActive : {}),
                  }}
                  onClick={() => openChat(u)}
                >
                  <div style={styles.avatar}>{uname[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={styles.userName}>{uname}</div>
                    <div style={styles.userHint}>
                      {badge > 0 ? "New message" : "Tap to chat"}
                    </div>
                  </div>

                  {badge > 0 && <div style={styles.badge}>{badge}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* chat */}
        <div style={styles.chatPanel}>
          {!selectedUser ? (
            <div style={styles.empty}>
              Select a user to start chatting 💬
            </div>
          ) : (
            <>
              <div style={styles.chatTop}>
                Chat with <b>{selectedName}</b>
              </div>

              <div style={styles.chatArea} ref={chatRef}>
                {messages.map((m) => {
                  const isMe = m.sender === myName;
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
                        <div style={styles.msgMeta}>
                          <span style={{ opacity: 0.85 }}>
                            {isMe ? "You" : m.sender}
                          </span>
                          <span style={{ opacity: 0.6 }}>{m.time}</span>
                        </div>
                        <div style={styles.msgText}>{m.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.inputBar}>
                <input
                  style={styles.chatInput}
                  placeholder="Type message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button style={styles.sendBtn} onClick={sendMessage}>
                  ➤
                </button>
              </div>
            </>
          )}
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
    padding: 18,
    background:
      "radial-gradient(circle at 20% 20%, rgba(0,255,213,0.20), transparent 45%), radial-gradient(circle at 80% 10%, rgba(108,99,255,0.22), transparent 45%), #07080c",
    fontFamily: "Inter, system-ui, Arial",
    color: "white",
  },

  phone: {
    width: 390,
    maxWidth: "95vw",
    height: 780,
    maxHeight: "92vh",
    borderRadius: 28,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 25px 70px rgba(0,0,0,0.55)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    padding: "16px 16px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background:
      "linear-gradient(90deg, rgba(0,255,213,0.22), rgba(108,99,255,0.22))",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },

  appTitle: { fontWeight: 900, fontSize: 16 },
  appSub: { opacity: 0.7, fontSize: 12, marginTop: 3 },

  logoutBtn: {
    padding: "8px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },

  authBox: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  authTabs: { display: "flex", gap: 10 },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  tabActive: {
    background: "linear-gradient(90deg,#00ffd5,#6c63ff)",
    color: "black",
  },

  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  },

  primaryBtn: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background: "linear-gradient(90deg,#00ffd5,#6c63ff)",
    color: "black",
  },

  usersPanel: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  usersTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  usersTitle: { fontWeight: 900, fontSize: 14 },

  smallBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },

  usersList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 190,
    overflowY: "auto",
  },

  userRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    cursor: "pointer",
  },

  userRowActive: {
    border: "2px solid rgba(0,255,213,0.9)",
    background: "rgba(0,255,213,0.08)",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "linear-gradient(135deg,#00ffd5,#6c63ff)",
    color: "black",
  },

  userName: { fontWeight: 900, fontSize: 13 },
  userHint: { opacity: 0.65, fontSize: 11, marginTop: 2 },

  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 12,
    background: "#ff3b3b",
    color: "white",
  },

  chatPanel: { flex: 1, display: "flex", flexDirection: "column" },

  empty: { margin: "auto", opacity: 0.7, fontWeight: 700 },

  chatTop: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 900,
  },

  chatArea: {
    flex: 1,
    padding: 12,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  msgRow: { display: "flex" },

  bubble: {
    maxWidth: "78%",
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
  },

  bubbleMe: {
    background: "linear-gradient(135deg, rgba(0,255,213,0.35), rgba(108,99,255,0.25))",
    borderTopRightRadius: 8,
  },

  bubbleOther: {
    background: "rgba(255,255,255,0.06)",
    borderTopLeftRadius: 8,
  },

  msgMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    marginBottom: 6,
  },

  msgText: { fontSize: 14, lineHeight: 1.35 },

  inputBar: {
    padding: 12,
    display: "flex",
    gap: 10,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
  },

  chatInput: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },

  sendBtn: {
    width: 52,
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    background: "linear-gradient(135deg,#00ffd5,#6c63ff)",
    color: "black",
  },
};
