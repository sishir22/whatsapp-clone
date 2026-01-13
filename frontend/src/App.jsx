import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function App() {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  // ✅ Load old messages from DB when app opens
  useEffect(() => {
    fetch("http://localhost:5000/messages")
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((err) => console.log("Error loading messages:", err));
  }, []);

  // ✅ Socket listeners
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("message_deleted", (id) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, deleted: true } : m))
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_deleted");
    };
  }, []);

  const sendMessage = () => {
    if (!name.trim() || !text.trim()) return;

    const msg = {
      sender: name,
      message: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      deleted: false,
    };

    socket.emit("send_message", msg);
    setText("");
  };

  const deleteMessage = (id) => {
    socket.emit("delete_message", id);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>WhatsApp Clone - Realtime Chat ✅</h2>

      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, width: 300, marginBottom: 10 }}
      />

      <div
        style={{
          border: "1px solid #ccc",
          width: 450,
          height: 350,
          padding: 10,
          overflowY: "auto",
          marginBottom: 10,
        }}
      >
        {messages.map((m) => (
          <div
            key={m._id}
            style={{
              marginBottom: 10,
              padding: 10,
              borderRadius: 10,
              background: m.sender === name ? "#dcf8c6" : "#fff",
              maxWidth: 300,
              marginLeft: m.sender === name ? "auto" : "0",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              position: "relative",
              color: "#111",
            }}
          >
            <b style={{ color: "#075E54" }}>{m.sender}</b>
            <div style={{ marginTop: 5 }}>
              {m.deleted ? (
                <i style={{ color: "gray" }}>Message removed</i>
              ) : (
                m.message
              )}
            </div>

            <div style={{ fontSize: 12, color: "#555", marginTop: 5 }}>
              {m.time}
            </div>

            {!m.deleted && (
              <button
                onClick={() => deleteMessage(m._id)}
                style={{
                  position: "absolute",
                  top: 5,
                  right: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "red",
                }}
              >
                ❌
              </button>
            )}
          </div>
        ))}
      </div>

      <input
        placeholder="Type message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ padding: 10, width: 300 }}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button
        onClick={sendMessage}
        style={{ padding: 10, marginLeft: 10, cursor: "pointer" }}
      >
        Send
      </button>
    </div>
  );
}
