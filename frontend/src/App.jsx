import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
});

export default function App() {
  const [sender, setSender] = useState("Sishir");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // Fetch old messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.log("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, deleted: true } : msg))
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_deleted");
    };
  }, []);

  const sendMessage = () => {
    if (!sender.trim() || !message.trim()) return;

    const msgData = {
      sender,
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send_message", msgData);
    setMessage("");
  };

  const deleteMessage = (id) => {
    socket.emit("delete_message", id);
  };

  return (
    <div style={{ background: "#111", color: "white", minHeight: "100vh", padding: "30px" }}>
      <h1 style={{ fontSize: "30px", marginBottom: "15px" }}>
        WhatsApp Clone - Realtime Chat ✅
      </h1>

      <input
        value={sender}
        onChange={(e) => setSender(e.target.value)}
        placeholder="Your name"
        style={{
          padding: "10px",
          width: "300px",
          marginBottom: "15px",
          borderRadius: "8px",
          border: "1px solid #444",
          background: "#222",
          color: "white",
        }}
      />

      <div
        style={{
          width: "500px",
          height: "400px",
          border: "1px solid #444",
          borderRadius: "10px",
          padding: "10px",
          overflowY: "auto",
          background: "#1b1b1b",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg._id}
            style={{
              background: msg.deleted ? "#555" : "#2a2a2a",
              padding: "10px",
              borderRadius: "10px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <b>{msg.sender}:</b>{" "}
              {msg.deleted ? <i>Message deleted</i> : msg.message}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <small style={{ opacity: 0.7 }}>{msg.time}</small>
              {!msg.deleted && (
                <button
                  onClick={() => deleteMessage(msg._id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background: "red",
                    color: "white",
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          style={{
            padding: "10px",
            width: "350px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#222",
            color: "white",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "green",
            color: "white",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
