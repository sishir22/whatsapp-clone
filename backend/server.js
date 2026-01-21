import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import Message from "./models/message.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());

// 🔥 FIXED CORS (supports multiple origins)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

// 🔥 Get messages by roomId
app.get("/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const msgs = await Message.find({ roomId }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // join private room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log("joined room:", roomId);
  });

  // send message
  socket.on("send_message", async (data) => {
    try {
      const msg = await Message.create(data);
      io.to(data.roomId).emit("receive_message", msg);
    } catch (err) {
      console.log("send_message error:", err.message);
    }
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected ✅"))
  .catch((err) => console.log("Mongo error ❌", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
