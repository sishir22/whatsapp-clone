import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js"; // ✅ auth routes

dotenv.config();

const app = express();

/* =========================
   ✅ Allowed Origins (CORS)
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // Vercel frontend url
].filter(Boolean);

// ✅ CORS FIX (handles preflight properly)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman/server calls
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.options("*", cors()); // ✅ important for preflight

app.use(express.json());

const server = http.createServer(app);

/* =========================
   ✅ Socket.IO Setup
========================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* =========================
   ✅ MongoDB Connect
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

/* =========================
   ✅ Message Schema + Model
========================= */
const messageSchema = new mongoose.Schema(
  {
    sender: String,
    message: String,
    time: String,
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

/* =========================
   ✅ Routes
========================= */

// health check
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// auth routes
app.use("/auth", authRoutes);

// get all messages
app.get("/messages", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* =========================
   ✅ Socket Logic
========================= */
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("send_message", async (data) => {
    try {
      const saved = await Message.create(data);
      io.emit("receive_message", saved);
    } catch (err) {
      console.log("❌ Error saving message:", err.message);
    }
  });

  socket.on("delete_message", async (id) => {
    try {
      await Message.findByIdAndUpdate(id, { deleted: true });
      io.emit("message_deleted", id);
    } catch (err) {
      console.log("❌ Delete error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

/* =========================
   ✅ Start Server (Railway)
========================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
