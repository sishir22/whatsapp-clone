import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import Message from "./models/message.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Allowed frontend origins (Vercel + local)
const allowedOrigins = [
  "http://localhost:5173",
  "https://whatsapp-clone-fawn-three.vercel.app",
];

// ✅ Middlewares
app.use(express.json());

// ✅ CORS (FIXED for preflight + production)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman/server calls
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked for origin: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ✅ IMPORTANT: handle preflight
app.options("*", cors());

// ✅ Routes
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.use("/auth", authRoutes);

// ✅ Fetch messages
app.get("/messages", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Socket.IO with CORS fixed
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket"],
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // send message
  socket.on("send_message", async (data) => {
    try {
      const msg = await Message.create({
        sender: data.sender,
        message: data.message,
        time: data.time,
      });

      io.emit("receive_message", msg);
    } catch (err) {
      console.log("❌ send_message error:", err.message);
    }
  });

  // delete message
  socket.on("delete_message", async (id) => {
    try {
      await Message.findByIdAndUpdate(id, { deleted: true });
      io.emit("message_deleted", id);
    } catch (err) {
      console.log("❌ delete_message error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ✅ MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
