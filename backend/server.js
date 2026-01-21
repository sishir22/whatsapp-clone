import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import Message from "./models/message.js";
import User from "./models/user.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ CORS
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.use("/auth", authRoutes);

// ✅ users list
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { username: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 1-1 messages between two users
app.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const user1 = req.params.user1.toLowerCase();
    const user2 = req.params.user2.toLowerCase();

    const msgs = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ socket.io
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);

  socket.on("join", (username) => {
    if (!username) return;
    const clean = username.toLowerCase().trim();
    socket.join(clean);
    console.log("✅ joined room:", clean);
  });

  socket.on("send_message", async (data) => {
    try {
      const sender = data.sender?.toLowerCase().trim();
      const receiver = data.receiver?.toLowerCase().trim();
      const message = data.message?.trim();
      const time = data.time;

      if (!sender || !receiver || !message) return;

      const saved = await Message.create({
        sender,
        receiver,
        message,
        time,
      });

      // send to both rooms
      io.to(sender).emit("receive_message", saved);
      io.to(receiver).emit("receive_message", saved);
    } catch (err) {
      console.log("❌ send_message error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 socket disconnected:", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo connected"))
  .catch((err) => console.log("❌ Mongo error:", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("🚀 Server running on", PORT));
