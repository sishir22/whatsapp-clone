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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options(/.*/, cors());

app.get("/", (req, res) => res.send("Backend running ✅"));

// ✅ Auth routes
app.use("/auth", authRoutes);

// ✅ Users list
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, { username: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ Fetch 1-1 messages
app.get("/messages/:u1/:u2", async (req, res) => {
  try {
    const { u1, u2 } = req.params;

    const msgs = await Message.find({
      $or: [
        { sender: u1, receiver: u2 },
        { sender: u2, receiver: u1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ---------------- SOCKET ----------------
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 connected:", socket.id);

  // join personal room
  socket.on("join", (username) => {
    socket.join(username);
    console.log(`👤 ${username} joined personal room`);
  });

  // send message
  socket.on("send_message", async (data) => {
    try {
      const saved = await Message.create({
        sender: data.sender,
        receiver: data.receiver,
        message: data.message,
        time: data.time,
        deleted: false,
      });

      // send to both users
      io.to(saved.sender).emit("receive_message", saved);
      io.to(saved.receiver).emit("receive_message", saved);
    } catch (err) {
      console.log("❌ send_message error:", err.message);
    }
  });

  // ✅ Typing indicator event
  socket.on("typing", ({ from, to }) => {
    // tell receiver: "from is typing"
    io.to(to).emit("typing", { from });
  });

  // ✅ Stop typing event
  socket.on("stop_typing", ({ from, to }) => {
    io.to(to).emit("stop_typing", { from });
  });

  socket.on("disconnect", () => {
    console.log("🔴 disconnected:", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected ✅"))
  .catch((err) => console.log("Mongo error ❌", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
