const express = require("express");

const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
});

router.get("/pending-users", (req, res) => {
  const users = db
    .prepare("SELECT id, name, email, roll_number, department, year, created_at FROM users WHERE is_verified = 0")
    .all();

  return res.json(users);
});

router.put("/verify-user/:id", (req, res) => {
  const userId = Number(req.params.id);
  const { action } = req.body || {};

  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (action === "approve") {
    db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(userId);
    return res.json({ message: "User approved" });
  }

  if (action === "reject") {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return res.json({ message: "User rejected" });
  }

  return res.status(400).json({ message: "Invalid action" });
});

router.get("/stats", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const verifiedUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_verified = 1").get().c;
  const totalListings = db.prepare("SELECT COUNT(*) as c FROM listings").get().c;
  const activeListings = db.prepare("SELECT COUNT(*) as c FROM listings WHERE is_available = 1").get().c;
  const totalTransactions = db.prepare("SELECT COUNT(*) as c FROM transactions").get().c;
  const completedTransactions = db
    .prepare("SELECT COUNT(*) as c FROM transactions WHERE status = 'COMPLETED'")
    .get().c;

  return res.json({
    totalUsers,
    verifiedUsers,
    totalListings,
    activeListings,
    totalTransactions,
    completedTransactions
  });
});

router.get("/listings", (req, res) => {
  const listings = db
    .prepare(
      "SELECT l.*, u.name as seller_name FROM listings l JOIN users u ON l.seller_id = u.id ORDER BY l.created_at DESC"
    )
    .all();

  return res.json(listings);
});

router.delete("/listings/:id", (req, res) => {
  const listingId = Number(req.params.id);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  db.prepare("DELETE FROM listings WHERE id = ?").run(listingId);
  return res.json({ message: "Listing deleted" });
});

module.exports = router;
