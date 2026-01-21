import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [mode, setMode] = useState("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [unread, setUnread] = useState({});

  const socketRef = useRef(null);
  const chatRef = useRef(null);

  const me = useMemo(() => username.toLowerCase().trim(), [username]);
  const activeUser = selectedUser?.username?.toLowerCase();

  // scroll
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // socket
  useEffect(() => {
    if (!token || !me) return;

    socketRef.current = io(API_URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", me);
    });

    socketRef.current.on("receive_message", (msg) => {
      const s = msg.sender;
      const r = msg.receiver;

      const isActive =
        activeUser &&
        ((s === me && r === activeUser) ||
          (s === activeUser && r === me));

      if (isActive) {
        setMessages((prev) => [...prev, msg]);
      } else {
        const other = s === me ? r : s;
        setUnread((u) => ({ ...u, [other]: (u[other] || 0) + 1 }));
      }
    });

    return () => socketRef.current.disconnect();
  }, [token, me, activeUser]);

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`);
    const data = await res.json();
    setUsers(data.filter((u) => u.username !== me));
  };

  const openChat = async (u) => {
    setSelectedUser(u);
    setUnread((p) => ({ ...p, [u.username]: 0 }));

    const res = await fetch(
      `${API_URL}/messages/${me}/${u.username}`
    );
    const data = await res.json();
    setMessages(data);
  };

  const sendMessage = () => {
    if (!message.trim() || !selectedUser) return;

    socketRef.current.emit("send_message", {
      sender: me,
      receiver: selectedUser.username,
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    setMessage("");
  };

  const login = async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUsername(data.username);
    setTimeout(fetchUsers, 200);
  };

  const register = async () => {
    await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setMode("login");
  };

  const logout = () => {
    localStorage.clear();
    setToken("");
    setUsers([]);
    setMessages([]);
    setSelectedUser(null);
    setUnread({});
  };

  /* ---------------- UI ---------------- */

  if (!token) {
    return (
      <div className="auth">
        <h1>PULSE</h1>
        <p>{mode === "login" ? "Login" : "Create account"}</p>

        <input placeholder="username" onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)} />

        <button onClick={mode === "login" ? login : register}>
          {mode === "login" ? "Login" : "Register"}
        </button>

        <span onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create account" : "Back to login"}
        </span>

        <style>{authCSS}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <aside>
        <header>
          <h2>PULSE</h2>
          <button onClick={logout}>⎋</button>
        </header>

        <div className="users">
          {users.map((u) => (
            <div
              key={u.username}
              className={`user ${activeUser === u.username ? "active" : ""}`}
              onClick={() => openChat(u)}
            >
              <span>{u.username}</span>
              {unread[u.username] > 0 && (
                <b>{unread[u.username]}</b>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main>
        {!selectedUser ? (
          <div className="empty">Select a user</div>
        ) : (
          <>
            <div className="top">Chat with {activeUser}</div>

            <div className="chat" ref={chatRef}>
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`msg ${m.sender === me ? "me" : ""}`}
                >
                  {m.message}
                  <span>{m.time}</span>
                </div>
              ))}
            </div>

            <div className="input">
              <input
                placeholder="Type message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>➤</button>
            </div>
          </>
        )}
      </main>

      <style>{appCSS}</style>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const authCSS = `
body { background:#050507; }
.auth {
  height:100vh; display:flex; flex-direction:column;
  justify-content:center; align-items:center;
  color:white; gap:12px; font-family:Inter;
}
.auth input {
  width:260px; padding:12px; background:#0d0d12;
  border:1px solid #222; color:white;
}
.auth button {
  width:260px; padding:12px;
  background:#00ffd5; border:none; font-weight:700;
}
.auth span { opacity:.6; cursor:pointer }
`;

const appCSS = `
.app {
  height:100vh; display:grid;
  grid-template-columns:260px 1fr;
  background:#050507; color:white; font-family:Inter;
}
aside {
  border-right:1px solid #1a1a1a;
  display:flex; flex-direction:column;
}
aside header {
  padding:14px; display:flex;
  justify-content:space-between;
  border-bottom:1px solid #1a1a1a;
}
.users { flex:1; overflow:auto }
.user {
  padding:14px; display:flex;
  justify-content:space-between;
  cursor:pointer; border-bottom:1px solid #111;
}
.user.active { background:#0d0d12 }
.user b {
  background:#ff3b3b; padding:2px 8px;
  border-radius:6px; font-size:12px;
}
main { display:flex; flex-direction:column }
.top {
  padding:14px; border-bottom:1px solid #1a1a1a;
}
.chat {
  flex:1; padding:20px; overflow:auto;
  display:flex; flex-direction:column; gap:10px;
}
.msg {
  max-width:60%; padding:10px;
  background:#0d0d12; border:1px solid #222;
}
.msg.me {
  align-self:flex-end;
  background:#00ffd522; border-color:#00ffd5;
}
.msg span { display:block; opacity:.4; font-size:11px }
.input {
  display:flex; border-top:1px solid #1a1a1a;
}
.input input {
  flex:1; padding:14px;
  background:#050507; border:none; color:white;
}
.input button {
  width:60px; background:#00ffd5;
  border:none; font-weight:900;
}
.empty {
  margin:auto; opacity:.4;
}
`;
