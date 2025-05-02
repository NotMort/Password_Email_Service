require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Resend } = require("resend");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// --- MongoDB setup ---
const client = new MongoClient(process.env.MONGO_URI);
let db;
client.connect().then(() => {
  db = client.db("passwordResetService");
  db.collection("users").createIndex({ email: 1 }, { unique: true });
});

// --- Rate limiter ---
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body.email,
  message: "Too many password reset requests. Try again later."
});

// --- Resend setup ---
const resend = new Resend(process.env.RESEND_API_KEY);

function generateToken(email) {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Unauthorized");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send("Invalid or expired token.");
  }
}

async function logAttempt(email, status, ip) {
  await db.collection("reset_logs").insertOne({
    email,
    status,
    ip,
    timestamp: new Date()
  });
}

// --- Routes ---
app.get("/request-reset", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "request-reset.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const existing = await db.collection("users").findOne({ email });
  if (existing) return res.status(400).send("Email is already registered.");
  const hashed = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({ email, password: hashed });
  res.send("User registered successfully.");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection("users").findOne({ email });
  if (!user) return res.status(400).send("Invalid email or password.");
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send("Invalid email or password.");
  const token = generateToken(email);
  res.json({ message: "Login successful.", token });
});

app.get("/profile", requireAuth, async (req, res) => {
  const user = await db.collection("users").findOne({ email: req.user.email });
  res.send(`Welcome ${user.email}, this is your profile.`);
});

app.post("/request-password-reset", resetLimiter, async (req, res) => {
  const { email } = req.body;
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    await logAttempt(email, "not_found", req.ip);
    return res.status(400).send("Email not found in our database.");
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${token}`;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
    });
    await logAttempt(email, "success", req.ip);
    res.send("Reset link sent to your email.");
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    await logAttempt(email, "failed", req.ip);
    res.status(500).send("Error sending reset email.");
  }
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection("users").updateOne(
      { email },
      { $set: { password: hashed } },
      { upsert: true }
    );
    res.send("Password reset successfully.");
  } catch (err) {
    res.status(400).send("Invalid or expired token.");
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on ${process.env.BASE_URL}`)
);