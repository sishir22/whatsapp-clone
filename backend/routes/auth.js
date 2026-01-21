import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const router = express.Router();

// ✅ Register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username & password required" });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ error: "Username already taken" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashed,
    });

    res.json({ message: "User registered successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username & password required" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: "Invalid username/password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(400).json({ error: "Invalid username/password" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
