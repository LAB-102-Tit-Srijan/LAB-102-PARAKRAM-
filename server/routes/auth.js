const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { db } = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  const { password, otp, otp_expires, ...safeUser } = user;
  return safeUser;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_verified: user.is_verified
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/register", (req, res) => {
  const { name, email, roll_number, department, year, password } = req.body || {};

  if (!name || !email || !roll_number || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const allowAnyDomain = process.env.ALLOW_ANY_EMAIL === "1";
  if (!allowAnyDomain && !email.endsWith("@university.edu")) {
    return res.status(400).json({ message: "Use your university email" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? OR roll_number = ?")
    .get(email, roll_number);

  if (existing) {
    return res.status(409).json({ message: "Email or roll number already exists" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const otp = generateOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  db.prepare(
    "INSERT INTO users (name, email, password, roll_number, department, year, is_verified, role, otp, otp_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(name, email, hashed, roll_number, department || null, year || null, 0, "student", otp, otpExpires);

  console.log(`[OTP] ${email} -> ${otp}`);
  return res.json({ message: "OTP sent to console" });
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.otp || user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (user.otp_expires && Date.now() > user.otp_expires) {
    return res.status(400).json({ message: "OTP expired" });
  }

  db.prepare("UPDATE users SET is_verified = 1, otp = NULL, otp_expires = NULL WHERE id = ?").run(user.id);

  const freshUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  const token = createToken(freshUser);

  return res.json({ token, user: sanitizeUser(freshUser) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(sanitizeUser(user));
});

router.get("/user/:id", requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const user = db
    .prepare("SELECT id, name, roll_number, department, year FROM users WHERE id = ?")
    .get(targetId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
});

module.exports = router;
