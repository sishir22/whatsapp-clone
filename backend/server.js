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

app.use(express.json());

// ✅ IMPORTANT: put your Vercel URL here EXACTLY
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ✅ CORS FIX (works for preflight + register/login)
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ must handle OPTIONS (preflight)
app.options("*", cors());

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.use("/auth", authRoutes);

app.get("/messages", async (req, res) => {
  const msgs = await Message.find().sort({ createdAt: 1 });
  res.json(msgs);
});

// ✅ socket
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("send_message", async (data) => {
    const msg = await Message.create(data);
    io.emit("receive_message", msg);
  });

  socket.on("delete_message", async (id) => {
    await Message.findByIdAndUpdate(id, { deleted: true });
    io.emit("message_deleted", id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected ✅"))
  .catch((err) => console.log("Mongo error ❌", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
