import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ import auth routes
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// ✅ Allowed Frontend URLs (localhost + Vercel)
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // your Vercel frontend url
].filter(Boolean);

// ✅ Express CORS
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

const server = http.createServer(app);

// ✅ Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ✅ Schema + Model (Messages)
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

// ✅ API: check server is alive
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// ✅ AUTH ROUTES
// Register -> POST /auth/register
// Login -> POST /auth/login
app.use("/auth", authRoutes);

// ✅ API: get all messages
app.get("/messages", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ✅ socket
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

// ✅ Railway PORT
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
