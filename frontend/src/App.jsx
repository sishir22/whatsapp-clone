import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [mode, setMode] = useState("login");

  // auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // data
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // chat
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // unread badges
  const [unread, setUnread] = useState({});

  // socket
  const socketRef = useRef(null);
  const chatRef = useRef(null);

  const me = useMemo(() => username.toLowerCase().trim(), [username]);
  const activeUser = useMemo(
    () => selectedUser?.username?.toLowerCase(),
    [selectedUser]
  );

  // auto scroll
  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // fetch users
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setUsers(list.filter((u) => u.username !== me));
    } catch (err) {
      console.log("fetch users error:", err);
      setUsers([]);
    }
  };

  // fetch messages between me & selected
  const fetchMessages = async (u) => {
    if (!u?.username) return;
    try {
      const res = await fetch(`${API_URL}/messages/${me}/${u.username}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("fetch messages error:", err);
      setMessages([]);
    }
  };

  // open chat
  const openChat = async (u) => {
    setSelectedUser(u);
    setMessages([]);

    // clear unread for this user
    const uname = u.username.toLowerCase();
    setUnread((prev) => ({ ...prev, [uname]: 0 }));

    await fetchMessages(u);
  };

  // socket init after login
  useEffect(() => {
    if (!token || !me) return;

    socketRef.current = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", me);
    });

    socketRef.current.on("receive_message", (msg) => {
      const s = (msg.sender || "").toLowerCase();
      const r = (msg.receiver || "").toLowerCase();

      // ignore messages not related to me
      if (s !== me && r !== me) return;

      // show instantly only if message belongs to open chat
      const belongsToOpenChat =
        activeUser &&
        ((s === me && r === activeUser) || (s === activeUser && r === me));

      if (belongsToOpenChat) {
        setMessages((prev) => [...prev, msg]);
      } else {
        // increment unread for the other person
        const other = s === me ? r : s;
        setUnread((prev) => ({
          ...prev,
          [other]: (prev[other] || 0) + 1,
        }));
      }
    });

    socketRef.current.on("connect_error", (err) => {
      console.log("socket connect_error:", err.message);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, me, activeUser]);

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

      setTimeout(fetchUsers, 200);
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

      alert("Registered ✅ Now login");
      setMode("login");
    } catch (err) {
      alert("Register error");
    }
  };

  // send message
  const sendMessage = () => {
    if (!selectedUser) return;
    if (!message.trim()) return;
    if (!socketRef.current) return alert("Socket not connected");

    const payload = {
      sender: me,
      receiver: selectedUser.username.toLowerCase(),
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
    setUsername("");
    setPassword("");
    setUsers([]);
    setSelectedUser(null);
    setMessages([]);
    setUnread({});
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // ---------------- UI ----------------

  if (!token) {
    return (
      <div className="bg">
        <div className="authWrap">
          <div className="logo">
            <div className="logoMark" />
            <div>
              <div className="brand">Pulse</div>
              <div className="tag">Vibrant realtime 1-1 chat</div>
            </div>
          </div>

          <div className="authCard">
            <div className="tabs">
              <button
                className={`tab ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                className={`tab ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            <div className="fields">
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: sishir"
              />

              <label>Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
              />
            </div>

            <button
              className="primary"
              onClick={mode === "login" ? login : register}
            >
              {mode === "login" ? "Enter Pulse" : "Create Account"}
            </button>

            <div className="hint">
              Tip: open 2 tabs and login with 2 users to test 🔥
            </div>
          </div>
        </div>

        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="bg">
      <div className="shell">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sideTop">
            <div className="sideTitle">
              <div className="sideDot" />
              <div>
                <div className="sideBrand">Pulse</div>
                <div className="sideSub">Logged in: {me}</div>
              </div>
            </div>

            <button className="ghost" onClick={logout} title="Logout">
              ⎋
            </button>
          </div>

          <div className="sideActions">
            <button className="ghost2" onClick={fetchUsers}>
              Refresh Users
            </button>
          </div>

          <div className="userList">
            {users.map((u) => {
              const uname = u.username.toLowerCase();
              const isActive = activeUser === uname;
              const count = unread[uname] || 0;

              return (
                <button
                  key={u._id || u.username}
                  className={`userRow ${isActive ? "active" : ""}`}
                  onClick={() => openChat(u)}
                >
                  <div className="avatar">{uname[0]?.toUpperCase()}</div>

                  <div className="userMeta">
                    <div className="userName">{uname}</div>
                    <div className="userMini">
                      {count > 0 ? "New message waiting" : "Tap to open chat"}
                    </div>
                  </div>

                  {count > 0 && <div className="badge">{count}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="chat">
          {!selectedUser ? (
            <div className="empty">
              <div className="emptyCard">
                <div className="emptyGlow" />
                <div className="emptyTitle">Pick a user ✨</div>
                <div className="emptyText">
                  Start a private 1-to-1 conversation.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="chatTop">
                <div>
                  <div className="chatWith">Chat</div>
                  <div className="chatName">{activeUser}</div>
                </div>
                <div className="chatPill">Live</div>
              </div>

              <div className="chatArea" ref={chatRef}>
                {messages.map((m) => {
                  const isMe = m.sender === me;
                  return (
                    <div
                      key={m._id}
                      className={`msgRow ${isMe ? "me" : "other"}`}
                    >
                      <div className={`bubble ${isMe ? "me" : "other"}`}>
                        <div className="metaLine">
                          <span className="metaName">
                            {isMe ? "You" : m.sender}
                          </span>
                          <span className="metaTime">{m.time}</span>
                        </div>
                        <div className="msgText">{m.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="composer">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type something cool..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button className="send" onClick={sendMessage}>
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ---------------- CSS ---------------- */
const css = `
:root{
  --bg:#060710;
  --card:rgba(255,255,255,0.06);
  --card2:rgba(255,255,255,0.08);
  --line:rgba(255,255,255,0.10);
  --text:rgba(255,255,255,0.92);
  --muted:rgba(255,255,255,0.65);
  --muted2:rgba(255,255,255,0.45);
  --aqua:#00ffd5;
  --violet:#6c63ff;
  --pink:#ff4fd8;
}

*{ box-sizing:border-box; }
html,body{ height:100%; margin:0; }
.bg{
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:18px;
  background:
    radial-gradient(1200px 600px at 20% 10%, rgba(0,255,213,0.22), transparent 60%),
    radial-gradient(900px 500px at 80% 20%, rgba(108,99,255,0.22), transparent 60%),
    radial-gradient(900px 600px at 50% 90%, rgba(255,79,216,0.14), transparent 60%),
    var(--bg);
  font-family: Inter, system-ui, Arial;
  color:var(--text);
}

/* AUTH */
.authWrap{
  width:min(430px, 92vw);
  animation: pop .35s ease-out;
}
.logo{
  display:flex; align-items:center; gap:12px;
  margin-bottom:16px;
}
.logoMark{
  width:44px; height:44px;
  background: linear-gradient(135deg, var(--aqua), var(--violet), var(--pink));
  border-radius:16px;
  box-shadow: 0 12px 40px rgba(0,255,213,0.12);
  position:relative;
  overflow:hidden;
}
.logoMark::after{
  content:"";
  position:absolute;
  inset:-40%;
  background: radial-gradient(circle, rgba(255,255,255,0.35), transparent 55%);
  animation: glow 2.8s ease-in-out infinite;
}
.brand{ font-size:22px; font-weight:900; letter-spacing:0.3px; }
.tag{ font-size:12px; color:var(--muted); margin-top:2px; }

.authCard{
  background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
  border:1px solid var(--line);
  border-radius:22px;
  padding:16px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  backdrop-filter: blur(10px);
}
.tabs{
  display:flex;
  gap:10px;
  padding:6px;
  background: rgba(0,0,0,0.25);
  border:1px solid var(--line);
  border-radius:18px;
}
.tab{
  flex:1;
  padding:10px 12px;
  border-radius:14px;
  border:none;
  cursor:pointer;
  font-weight:900;
  color:var(--muted);
  background: transparent;
  transition: all .22s ease;
}
.tab.active{
  color:black;
  background: linear-gradient(135deg, var(--aqua), var(--violet));
  box-shadow: 0 10px 25px rgba(0,255,213,0.10);
}
.fields{
  margin-top:14px;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.fields label{
  font-size:12px;
  color:var(--muted);
  margin-top:6px;
}
.fields input{
  padding:12px 14px;
  border-radius:16px;
  border:1px solid var(--line);
  background: rgba(0,0,0,0.28);
  color:var(--text);
  outline:none;
  transition: all .2s ease;
}
.fields input:focus{
  border-color: rgba(0,255,213,0.6);
  box-shadow: 0 0 0 4px rgba(0,255,213,0.12);
}
.primary{
  width:100%;
  margin-top:14px;
  padding:12px 14px;
  border-radius:18px;
  border:none;
  cursor:pointer;
  font-weight:900;
  font-size:14px;
  color:black;
  background: linear-gradient(135deg, var(--aqua), var(--violet));
  transition: transform .15s ease, filter .15s ease;
}
.primary:hover{ transform: translateY(-1px); filter: brightness(1.05); }
.primary:active{ transform: translateY(0px) scale(0.99); }
.hint{
  margin-top:10px;
  font-size:12px;
  color:var(--muted2);
}

/* APP LAYOUT */
.shell{
  width:min(1050px, 96vw);
  height:min(760px, 92vh);
  border-radius:26px;
  border:1px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  box-shadow: 0 40px 120px rgba(0,0,0,0.55);
  overflow:hidden;
  display:grid;
  grid-template-columns: 340px 1fr;
  backdrop-filter: blur(10px);
  animation: pop .35s ease-out;
}

/* SIDEBAR */
.sidebar{
  border-right:1px solid rgba(255,255,255,0.08);
  display:flex;
  flex-direction:column;
}
.sideTop{
  padding:16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background: linear-gradient(90deg, rgba(0,255,213,0.14), rgba(108,99,255,0.12));
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.sideTitle{
  display:flex;
  align-items:center;
  gap:10px;
}
.sideDot{
  width:10px; height:10px;
  border-radius:999px;
  background: var(--aqua);
  box-shadow: 0 0 18px rgba(0,255,213,0.55);
}
.sideBrand{ font-weight:900; font-size:15px; letter-spacing:0.2px; }
.sideSub{ font-size:12px; color:var(--muted); margin-top:2px; }

.ghost{
  width:38px; height:38px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);
  color:var(--text);
  cursor:pointer;
  transition: transform .15s ease, background .15s ease;
}
.ghost:hover{ transform: translateY(-1px); background: rgba(255,255,255,0.06); }
.ghost:active{ transform: translateY(0px) scale(0.98); }

.sideActions{
  padding:12px 16px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.ghost2{
  width:100%;
  padding:10px 12px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.22);
  color:var(--text);
  cursor:pointer;
  font-weight:800;
  transition: all .18s ease;
}
.ghost2:hover{
  border-color: rgba(0,255,213,0.35);
  box-shadow: 0 0 0 4px rgba(0,255,213,0.10);
}

.userList{
  padding:12px;
  display:flex;
  flex-direction:column;
  gap:10px;
  overflow:auto;
}
.userRow{
  width:100%;
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  color:var(--text);
  cursor:pointer;
  padding:12px;
  display:flex;
  align-items:center;
  gap:12px;
  transition: transform .16s ease, background .16s ease, border-color .16s ease;
}
.userRow:hover{
  transform: translateY(-1px);
  border-color: rgba(0,255,213,0.28);
  background: rgba(255,255,255,0.06);
}
.userRow.active{
  border-color: rgba(0,255,213,0.75);
  background: linear-gradient(135deg, rgba(0,255,213,0.10), rgba(108,99,255,0.06));
  box-shadow: 0 18px 40px rgba(0,255,213,0.08);
}
.avatar{
  width:44px; height:44px;
  border-radius:18px;
  display:grid;
  place-items:center;
  font-weight:900;
  color:black;
  background: linear-gradient(135deg, var(--aqua), var(--violet));
}
.userMeta{ flex:1; text-align:left; }
.userName{ font-weight:900; font-size:14px; }
.userMini{ margin-top:3px; font-size:12px; color:var(--muted); }

.badge{
  min-width:26px;
  height:26px;
  border-radius:12px;
  display:grid;
  place-items:center;
  font-weight:900;
  font-size:12px;
  color:white;
  background: #ff3b3b;
  box-shadow: 0 0 0 4px rgba(255,59,59,0.15);
  animation: pulse 1.2s ease-in-out infinite;
}

/* CHAT */
.chat{
  display:flex;
  flex-direction:column;
}
.empty{
  flex:1;
  display:grid;
  place-items:center;
}
.emptyCard{
  position:relative;
  width:min(460px, 86%);
  padding:22px;
  border-radius:24px;
  border:1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.05);
  overflow:hidden;
}
.emptyGlow{
  position:absolute;
  inset:-40%;
  background:
    radial-gradient(circle at 30% 30%, rgba(0,255,213,0.22), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(108,99,255,0.22), transparent 55%),
    radial-gradient(circle at 50% 90%, rgba(255,79,216,0.16), transparent 60%);
  animation: glow 3.2s ease-in-out infinite;
}
.emptyTitle{
  position:relative;
  font-weight:900;
  font-size:18px;
}
.emptyText{
  position:relative;
  margin-top:6px;
  color:var(--muted);
  font-size:13px;
}

.chatTop{
  padding:16px 18px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid rgba(255,255,255,0.08);
  background: linear-gradient(90deg, rgba(0,255,213,0.10), rgba(108,99,255,0.08));
}
.chatWith{ font-size:12px; color:var(--muted); font-weight:800; }
.chatName{ font-size:16px; font-weight:900; margin-top:2px; }
.chatPill{
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(0,255,213,0.35);
  background: rgba(0,255,213,0.10);
  color: var(--aqua);
  font-weight:900;
  font-size:12px;
  box-shadow: 0 0 0 4px rgba(0,255,213,0.08);
}

.chatArea{
  flex:1;
  padding:18px;
  overflow:auto;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.msgRow{
  display:flex;
  width:100%;
}
.msgRow.me{ justify-content:flex-end; }
.msgRow.other{ justify-content:flex-start; }

.bubble{
  max-width:72%;
  padding:12px 14px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,0.10);
  animation: msgIn .18s ease-out;
}
.bubble.me{
  background: linear-gradient(135deg, rgba(0,255,213,0.25), rgba(108,99,255,0.18));
  border-top-right-radius:10px;
  box-shadow: 0 18px 40px rgba(0,255,213,0.08);
}
.bubble.other{
  background: rgba(255,255,255,0.05);
  border-top-left-radius:10px;
}
.metaLine{
  display:flex;
  justify-content:space-between;
  gap:12px;
  font-size:11px;
  color:var(--muted2);
  margin-bottom:6px;
}
.metaName{ font-weight:900; color:rgba(255,255,255,0.78); }
.metaTime{ opacity:0.7; }
.msgText{
  font-size:14px;
  line-height:1.35;
  color:rgba(255,255,255,0.95);
  word-break: break-word;
}

.composer{
  padding:14px 16px;
  display:flex;
  gap:10px;
  border-top:1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.20);
}
.composer input{
  flex:1;
  padding:12px 14px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color:var(--text);
  outline:none;
  transition: all .18s ease;
}
.composer input:focus{
  border-color: rgba(0,255,213,0.55);
  box-shadow: 0 0 0 4px rgba(0,255,213,0.12);
}
.send{
  width:52px;
  border-radius:18px;
  border:none;
  cursor:pointer;
  font-weight:900;
  font-size:18px;
  color:black;
  background: linear-gradient(135deg, var(--aqua), var(--violet));
  transition: transform .15s ease, filter .15s ease;
}
.send:hover{ transform: translateY(-1px); filter: brightness(1.06); }
.send:active{ transform: translateY(0px) scale(0.98); }

@keyframes pop{
  from{ transform: translateY(10px) scale(0.98); opacity:0; }
  to{ transform: translateY(0px) scale(1); opacity:1; }
}
@keyframes msgIn{
  from{ transform: translateY(6px); opacity:0; }
  to{ transform: translateY(0px); opacity:1; }
}
@keyframes pulse{
  0%{ transform: scale(1); }
  50%{ transform: scale(1.08); }
  100%{ transform: scale(1); }
}
@keyframes glow{
  0%{ transform: scale(1); opacity:0.45; }
  50%{ transform: scale(1.06); opacity:0.65; }
  100%{ transform: scale(1); opacity:0.45; }
}

/* responsive */
@media (max-width: 900px){
  .shell{ grid-template-columns: 1fr; height:auto; }
  .sidebar{ min-height: 340px; }
}
`;
