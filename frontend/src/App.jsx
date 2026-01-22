import { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import io from "socket.io-client";

import Inbox from "./pages/Inbox.jsx";
import Chat from "./pages/Chat.jsx";
import Auth from "./pages/Auth.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [users, setUsers] = useState([]);

  const [unread, setUnread] = useState({}); // { username: count }
  const socketRef = useRef(null);

  const me = useMemo(() => username.trim().toLowerCase(), [username]);

  // ✅ Connect socket after login
  useEffect(() => {
    if (!token || !me) return;

    socketRef.current = io(API_URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", me);
    });

    socketRef.current.on("receive_message", (msg) => {
      // If message comes from someone, add unread count
      const other =
        msg.sender.toLowerCase() === me
          ? msg.receiver.toLowerCase()
          : msg.sender.toLowerCase();

      // Increase unread for that user (Inbox will clear when opened)
      setUnread((prev) => ({
        ...prev,
        [other]: (prev[other] || 0) + 1,
      }));
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, me]);

  // ✅ Fetch users list
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers((Array.isArray(data) ? data : []).filter((u) => u.username !== me));
    } catch (err) {
      console.log("Fetch users error:", err);
    }
  };

  // login handler
  const handleLogin = ({ token, username }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);

    setToken(token);
    setUsername(username);

    setTimeout(fetchUsers, 200);
  };

  // logout handler
  const handleLogout = () => {
    localStorage.clear();
    setToken("");
    setUsername("");
    setUsers([]);
    setUnread({});
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  // clear unread for a specific user (when opening chat)
  const clearUnread = (user) => {
    const u = user.toLowerCase();
    setUnread((prev) => ({ ...prev, [u]: 0 }));
  };

  // If not logged in → only Auth page
  if (!token) {
    return <Auth API_URL={API_URL} onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Inbox
            me={me}
            users={users}
            unread={unread}
            fetchUsers={fetchUsers}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/chat/:username"
        element={
          <Chat
            API_URL={API_URL}
            me={me}
            socketRef={socketRef}
            clearUnread={clearUnread}
          />
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
