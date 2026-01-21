import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  const myName = useMemo(() => username.trim().toLowerCase(), [username]);

  // socket init
  const socket = useMemo(() => {
    if (!token) return null;
    return io(API_URL, { transports: ["websocket"] });
  }, [token]);

  // create roomId (same for both users)
  const roomId = useMemo(() => {
    if (!selectedUser || !myName) return "";
    return [myName, selectedUser.username].sort().join("__");
  }, [myName, selectedUser]);

  // auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // fetch users after login
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data.filter((u) => u.username !== myName));
    } catch (err) {
      console.log(err);
    }
  };

  // fetch messages when user selected
  const fetchMessages = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`${API_URL}/messages/${roomId}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.log(err);
    }
  };

  // join room when selected user changes
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit("join_room", roomId);
    fetchMessages();
  }, [socket, roomId]);

  // socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [socket]);

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

      setTimeout(fetchUsers, 300);
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
    if (!socket || !message.trim() || !selectedUser) return;

    const payload = {
      roomId,
      sender: myName,
      receiver: selectedUser.username,
      message: message.trim(),
    };

    socket.emit("send_message", payload);
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

        <button style={styles.refresh} onClick={fetchUsers}>
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
              onClick={() => setSelectedUser(u)}
            >
              {u.username}
            </div>
          ))}
        </div>
      </div>

      {/* right chat */}
      <div style={styles.chat}>
        {!selectedUser ? (
          <div style={styles.empty}>
            Select a user to start 1-1 chat 💬
          </div>
        ) : (
          <>
            <div style={styles.chatTop}>
              Chat with <b>{selectedUser.username}</b>
            </div>

            <div style={styles.messages} ref={chatRef}>
              {messages.map((m) => (
                <div
                  key={m._id}
                  style={{
                    ...styles.msg,
                    alignSelf:
                      m.sender === myName ? "flex-end" : "flex-start",
                    background:
                      m.sender === myName
                        ? "linear-gradient(90deg,#00ffd5,#6c63ff)"
                        : "rgba(255,255,255,0.08)",
                  }}
                >
                  {m.message}
                </div>
              ))}
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
