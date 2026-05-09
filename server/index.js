const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db");

const authRoutes = require("./routes/auth");
const listingsRoutes = require("./routes/listings");
const messagesRoutes = require("./routes/messages");
const transactionsRoutes = require("./routes/transactions");
const adminRoutes = require("./routes/admin");
const wishlistRoutes = require("./routes/wishlist");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Campus Loop API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wishlist", wishlistRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Campus Loop server running on port ${port}`);
});
