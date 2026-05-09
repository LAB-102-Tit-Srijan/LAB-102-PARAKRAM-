function getRecommendations(userId, db) {
  const listingCategories = db
    .prepare("SELECT DISTINCT category FROM listings WHERE seller_id = ?")
    .all(userId)
    .map((row) => row.category);

  const messageCategories = db
    .prepare(
      "SELECT DISTINCT l.category FROM messages m JOIN listings l ON m.listing_id = l.id WHERE (m.sender_id = ? OR m.receiver_id = ?) AND m.listing_id IS NOT NULL"
    )
    .all(userId, userId)
    .map((row) => row.category);

  const userCategories = Array.from(new Set([...listingCategories, ...messageCategories]));

  if (userCategories.length === 0) {
    return db
      .prepare(
        `
        SELECT l.*, u.name as seller_name
        FROM listings l JOIN users u ON l.seller_id = u.id
        WHERE l.is_available = 1 AND l.seller_id != ?
        ORDER BY l.created_at DESC LIMIT 6
        `
      )
      .all(userId);
  }

  const placeholders = userCategories.map(() => "?").join(",");
  return db
    .prepare(
      `
      SELECT l.*, u.name as seller_name
      FROM listings l JOIN users u ON l.seller_id = u.id
      WHERE l.category IN (${placeholders})
        AND l.is_available = 1
        AND l.seller_id != ?
      ORDER BY l.created_at DESC LIMIT 6
      `
    )
    .all(...userCategories, userId);
}

module.exports = { getRecommendations };
