const express = require("express");

const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { predictPrice } = require("../utils/pricePrediction");
const { getRecommendations } = require("../utils/recommendations");

const router = express.Router();

function parseMultiValue(param) {
  if (!param) {
    return [];
  }
  return String(param)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

router.get("/", (req, res) => {
  const categories = parseMultiValue(req.query.category);
  const conditions = parseMultiValue(req.query.condition);
  const listingTypes = parseMultiValue(req.query.type);
  const search = req.query.search ? String(req.query.search).trim() : "";
  const minPrice = req.query.min_price ? Number(req.query.min_price) : null;
  const maxPrice = req.query.max_price ? Number(req.query.max_price) : null;

  const whereClauses = ["l.is_available = 1"];
  const params = [];

  if (categories.length) {
    whereClauses.push(`l.category IN (${categories.map(() => "?").join(",")})`);
    params.push(...categories);
  }

  if (conditions.length) {
    whereClauses.push(`l.condition IN (${conditions.map(() => "?").join(",")})`);
    params.push(...conditions);
  }

  if (listingTypes.length) {
    whereClauses.push(`l.listing_type IN (${listingTypes.map(() => "?").join(",")})`);
    params.push(...listingTypes);
  }

  if (search) {
    whereClauses.push("(l.title LIKE ? OR l.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (minPrice !== null && !Number.isNaN(minPrice)) {
    whereClauses.push("l.price >= ?");
    params.push(minPrice);
  }

  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    whereClauses.push("l.price <= ?");
    params.push(maxPrice);
  }

  const sort = req.query.sort || "newest";
  const sortMap = {
    newest: "l.created_at DESC",
    price_asc: "l.price ASC",
    price_desc: "l.price DESC"
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 12, 1);
  const offset = (page - 1) * limit;

  const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) as c FROM listings l ${whereClause}`)
    .get(...params).c;

  const items = db
    .prepare(
      `SELECT l.*, u.name as seller_name, 4.5 as seller_rating
       FROM listings l
       JOIN users u ON l.seller_id = u.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return res.json({ items, page, limit, total });
});

router.get("/recommendations", requireAuth, (req, res) => {
  const recommendations = getRecommendations(req.user.id, db);
  return res.json(recommendations);
});

router.get("/my", requireAuth, (req, res) => {
  const listings = db
    .prepare(
      "SELECT l.*, u.name as seller_name, 4.5 as seller_rating FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.seller_id = ? ORDER BY l.created_at DESC"
    )
    .all(req.user.id);

  return res.json(listings);
});

router.post("/price-predict", (req, res) => {
  const { category, condition } = req.body || {};
  const prediction = predictPrice(category, condition, db);
  return res.json(prediction);
});

router.get("/:id", (req, res) => {
  const listingId = Number(req.params.id);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  db.prepare("UPDATE listings SET view_count = view_count + 1 WHERE id = ?").run(listingId);

  const listing = db
    .prepare(
      "SELECT l.*, u.name as seller_name, 4.5 as seller_rating FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.id = ?"
    )
    .get(listingId);

  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  return res.json(listing);
});

router.post("/", requireAuth, (req, res) => {
  const { title, description, category, condition, listing_type, price, image_url } = req.body || {};

  if (!title || !category || !condition || !listing_type || price === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const user = db.prepare("SELECT is_verified FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.is_verified !== 1) {
    return res.status(403).json({ message: "Account not verified" });
  }

  const prediction = predictPrice(category, condition, db);
  const aiSuggestedPrice = Math.round((prediction.suggestedMin + prediction.suggestedMax) / 2);

  const result = db
    .prepare(
      "INSERT INTO listings (title, description, category, condition, listing_type, price, ai_suggested_price, image_url, is_available, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      title,
      description || null,
      category,
      condition,
      listing_type,
      Number(price),
      aiSuggestedPrice,
      image_url || null,
      1,
      req.user.id
    );

  const listing = db
    .prepare(
      "SELECT l.*, u.name as seller_name, 4.5 as seller_rating FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.id = ?"
    )
    .get(result.lastInsertRowid);

  return res.status(201).json(listing);
});

router.put("/:id/status", requireAuth, (req, res) => {
  const listingId = Number(req.params.id);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  const { status } = req.body || {};
  const allowed = ["ACTIVE", "SOLD", "RENTED_OUT", "REMOVED"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const listing = db.prepare("SELECT seller_id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const isAvailable = status === "ACTIVE" ? 1 : 0;
  db.prepare("UPDATE listings SET status = ?, is_available = ? WHERE id = ?").run(
    status,
    isAvailable,
    listingId
  );

  const updated = db
    .prepare(
      "SELECT l.*, u.name as seller_name, 4.5 as seller_rating FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.id = ?"
    )
    .get(listingId);

  return res.json(updated);
});

router.put("/:id", requireAuth, (req, res) => {
  const listingId = Number(req.params.id);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  const listing = db.prepare("SELECT seller_id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const fields = [];
  const params = [];

  if (req.body.title !== undefined) {
    fields.push("title = ?");
    params.push(req.body.title);
  }

  if (req.body.description !== undefined) {
    fields.push("description = ?");
    params.push(req.body.description);
  }

  if (req.body.price !== undefined) {
    fields.push("price = ?");
    params.push(Number(req.body.price));
  }

  if (req.body.is_available !== undefined) {
    fields.push("is_available = ?");
    params.push(req.body.is_available ? 1 : 0);
  }

  if (!fields.length) {
    return res.status(400).json({ message: "No fields to update" });
  }

  db.prepare(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`).run(...params, listingId);

  const updated = db
    .prepare(
      "SELECT l.*, u.name as seller_name, 4.5 as seller_rating FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.id = ?"
    )
    .get(listingId);

  return res.json(updated);
});

router.delete("/:id", requireAuth, (req, res) => {
  const listingId = Number(req.params.id);
  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: "Invalid listing id" });
  }

  const listing = db.prepare("SELECT seller_id FROM listings WHERE id = ?").get(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  db.prepare("UPDATE listings SET is_available = 0, status = 'REMOVED' WHERE id = ?").run(listingId);

  return res.json({ message: "Listing removed" });
});

module.exports = router;
