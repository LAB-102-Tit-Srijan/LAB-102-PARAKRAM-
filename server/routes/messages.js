const express = require("express");

const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/conversations", requireAuth, (req, res) => {
  const userId = req.user.id;

  const conversations = db
    .prepare(
      `
      SELECT
        m.content as last_message,
        m.message_type as last_message_type,
        m.created_at as last_time,
        m.listing_id as listing_id,
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        u.name as other_name,
        l.image_url as listing_image,
        l.title as listing_title
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      LEFT JOIN listings l ON l.id = m.listing_id
      JOIN (
        SELECT
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id,
          MAX(created_at) as last_time
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY other_id
      ) t ON t.other_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND t.last_time = m.created_at
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
      `
    )
    .all(userId, userId, userId, userId, userId, userId, userId, userId);

  const withUnread = conversations.map((row) => {
    const unread = db
      .prepare(
        "SELECT COUNT(*) as c FROM messages WHERE receiver_id = ? AND sender_id = ? AND is_read = 0"
      )
      .get(userId, row.other_user_id).c;

    let preview = row.last_message || "";
    if (row.last_message_type === "image") {
      preview = "[Photo]";
    }
    if (preview.length > 40) {
      preview = `${preview.slice(0, 37).trim()}...`;
    }

    return {
      ...row,
      last_message: preview,
      unread_count: unread,
      avatar: null
    };
  });

  return res.json(withUnread);
});

router.get("/:otherUserId", requireAuth, (req, res) => {
  const userId = req.user.id;
  const otherUserId = Number(req.params.otherUserId);
  const listingId = req.query.listing_id ? Number(req.query.listing_id) : null;

  if (Number.isNaN(otherUserId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const params = [userId, otherUserId, otherUserId, userId];
  let listingClause = "";

  if (listingId && !Number.isNaN(listingId)) {
    listingClause = " AND listing_id = ?";
    params.push(listingId);
  }

  const messages = db
    .prepare(
      `SELECT * FROM messages
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))${listingClause}
       ORDER BY created_at ASC`
    )
    .all(...params);

  const updateParams = [userId, otherUserId];
  let updateListingClause = "";

  if (listingId && !Number.isNaN(listingId)) {
    updateListingClause = " AND listing_id = ?";
    updateParams.push(listingId);
  }

  db.prepare(`UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?${updateListingClause}`)
    .run(...updateParams);

  return res.json(messages);
});

router.post("/", requireAuth, (req, res) => {
  const { receiver_id, content, listing_id, message_type, image_url } = req.body || {};

  if (!receiver_id) {
    return res.status(400).json({ message: "Receiver is required" });
  }

  const normalizedType = message_type === "image" ? "image" : "text";
  const safeContent = content ? String(content) : "";

  if (normalizedType === "image") {
    if (!image_url) {
      return res.status(400).json({ message: "Image is required" });
    }
  } else if (!safeContent.trim()) {
    return res.status(400).json({ message: "Content is required" });
  }

  const result = db
    .prepare(
      "INSERT INTO messages (sender_id, receiver_id, listing_id, content, is_read, message_type, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(req.user.id, Number(receiver_id), listing_id || null, safeContent, 0, normalizedType, image_url || null);

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);

  return res.status(201).json(message);
});

module.exports = router;
