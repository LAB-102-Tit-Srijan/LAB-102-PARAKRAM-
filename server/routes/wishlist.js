const express = require("express");

const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const { listing_id } = req.body || {};
  const listingId = Number(listing_id);

  if (!listingId || Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Listing id is required" });
  }

  const listing = db.prepare("SELECT id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  db.prepare("INSERT OR IGNORE INTO wishlists (user_id, listing_id) VALUES (?, ?)").run(
    req.user.id,
    listingId
  );

  return res.status(201).json({ message: "Added to wishlist" });
});

router.delete("/:listingId", requireAuth, (req, res) => {
  const listingId = Number(req.params.listingId);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  db.prepare("DELETE FROM wishlists WHERE user_id = ? AND listing_id = ?").run(req.user.id, listingId);
  return res.json({ message: "Removed from wishlist" });
});

router.get("/", requireAuth, (req, res) => {
  const items = db
    .prepare(
      `
      SELECT l.*, u.name as seller_name, 4.5 as seller_rating
      FROM wishlists w
      JOIN listings l ON w.listing_id = l.id
      JOIN users u ON l.seller_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      `
    )
    .all(req.user.id);

  return res.json(items);
});

router.get("/ids", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT listing_id FROM wishlists WHERE user_id = ?").all(req.user.id);
  return res.json(rows.map((row) => row.listing_id));
});

module.exports = router;
