const express = require("express");

const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const { listing_id, rent_from, rent_to } = req.body || {};
  const listingId = Number(listing_id);

  if (!listingId || Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Listing id is required" });
  }

  const user = db.prepare("SELECT is_verified FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.is_verified !== 1) {
    return res.status(403).json({ message: "Account not verified" });
  }

  const listing = db
    .prepare("SELECT id, seller_id, is_available, listing_type, price FROM listings WHERE id = ?")
    .get(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  if (listing.is_available !== 1) {
    return res.status(400).json({ message: "Listing is not available" });
  }

  if (listing.seller_id === req.user.id) {
    return res.status(400).json({ message: "Cannot transact on your own listing" });
  }

  let rentFrom = null;
  let rentTo = null;
  let rentDays = null;
  let totalRentPrice = null;

  if (listing.listing_type === "RENT") {
    if (!rent_from || !rent_to) {
      return res.status(400).json({ message: "Rent dates are required" });
    }

    const fromTime = Date.parse(rent_from);
    const toTime = Date.parse(rent_to);
    if (Number.isNaN(fromTime) || Number.isNaN(toTime) || fromTime >= toTime) {
      return res.status(400).json({ message: "Invalid rent dates" });
    }

    rentFrom = rent_from;
    rentTo = rent_to;
    rentDays = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24));
    totalRentPrice = listing.price * rentDays;
  }

  const existing = db
    .prepare(
      "SELECT id FROM transactions WHERE listing_id = ? AND buyer_id = ? AND status = 'PENDING'"
    )
    .get(listingId, req.user.id);

  if (existing) {
    return res.status(409).json({ message: "You already expressed interest" });
  }

  const result = db
    .prepare(
      "INSERT INTO transactions (listing_id, buyer_id, seller_id, status, rent_from, rent_to, rent_days, total_rent_price, seller_action) VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, 'PENDING')"
    )
    .run(listingId, req.user.id, listing.seller_id, rentFrom, rentTo, rentDays, totalRentPrice);

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(transaction);
});

router.put("/:id/complete", requireAuth, (req, res) => {
  const transactionId = Number(req.params.id);

  if (Number.isNaN(transactionId)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  db.prepare("UPDATE transactions SET status = 'COMPLETED' WHERE id = ?").run(transactionId);
  const listing = db
    .prepare("SELECT listing_type FROM listings WHERE id = ?")
    .get(transaction.listing_id);
  const nextStatus = listing?.listing_type === "RENT" ? "RENTED_OUT" : "SOLD";
  db.prepare("UPDATE listings SET is_available = 0, status = ? WHERE id = ?").run(
    nextStatus,
    transaction.listing_id
  );

  const updated = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  return res.json(updated);
});

router.put("/:id/cancel", requireAuth, (req, res) => {
  const transactionId = Number(req.params.id);

  if (Number.isNaN(transactionId)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.buyer_id !== req.user.id && transaction.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  db.prepare("UPDATE transactions SET status = 'CANCELLED' WHERE id = ?").run(transactionId);

  const updated = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  return res.json(updated);
});

router.put("/:id/approve", requireAuth, (req, res) => {
  const transactionId = Number(req.params.id);

  if (Number.isNaN(transactionId)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  db.prepare("UPDATE transactions SET seller_action = 'APPROVED', status = 'PENDING' WHERE id = ?").run(
    transactionId
  );

  const updated = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  return res.json(updated);
});

router.put("/:id/reject", requireAuth, (req, res) => {
  const transactionId = Number(req.params.id);

  if (Number.isNaN(transactionId)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  db.prepare("UPDATE transactions SET seller_action = 'REJECTED', status = 'CANCELLED' WHERE id = ?").run(
    transactionId
  );

  const updated = db.prepare("SELECT * FROM transactions WHERE id = ?").get(transactionId);
  return res.json(updated);
});

router.get("/my", requireAuth, (req, res) => {
  const transactions = db
    .prepare(
      `
      SELECT
        t.*,
        l.title as listing_title,
        l.listing_type as listing_type,
        l.price as listing_price,
        seller.name as seller_name,
        buyer.name as buyer_name
      FROM transactions t
      JOIN listings l ON t.listing_id = l.id
      JOIN users seller ON t.seller_id = seller.id
      JOIN users buyer ON t.buyer_id = buyer.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.created_at DESC
      `
    )
    .all(req.user.id, req.user.id);

  return res.json(transactions);
});

module.exports = router;
