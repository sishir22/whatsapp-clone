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

// IMPORTANT: your vercel URL stored in Railway variable
// You have CLIENT_URL in railway, so use that
const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ CORS for API
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ handle OPTIONS preflight properly
app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.use("/auth", authRoutes);

// ✅ Get all users list (for chat list)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { username: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get messages between 2 users (1-1)
app.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;

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

// ✅ SOCKET.IO with CORS
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// store online users (username -> socketId)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // ✅ user joins with username (VERY IMPORTANT)
  socket.on("join", (username) => {
    if (!username) return;

    onlineUsers.set(username, socket.id);
    socket.join(username); // room name = username
    console.log(`✅ ${username} joined room: ${username}`);
  });

  // ✅ send message only to receiver
  socket.on("send_message", async (data) => {
    try {
      const { sender, receiver, message, time } = data;

      if (!sender || !receiver || !message) return;

      const msg = await Message.create({
        sender,
        receiver,
        message,
        time,
      });

      // send to sender room (for instant update)
      io.to(sender).emit("receive_message", msg);

      // send to receiver room (THIS FIXES YOUR ISSUE)
      io.to(receiver).emit("receive_message", msg);
    } catch (err) {
      console.log("send_message error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    for (let [user, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(user);
        console.log("❌ disconnected:", user);
        break;
      }
    }
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected ✅"))
  .catch((err) => console.log("Mongo error ❌", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
