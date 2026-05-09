const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "campus.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      department TEXT,
      year INTEGER,
      is_verified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'student',
      otp TEXT,
      otp_expires INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      condition TEXT NOT NULL,
      listing_type TEXT NOT NULL,
      price REAL NOT NULL,
      ai_suggested_price REAL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ACTIVE',
      seller_id INTEGER NOT NULL,
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      listing_id INTEGER,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      rent_from TEXT,
      rent_to TEXT,
      rent_days INTEGER,
      total_rent_price REAL,
      seller_action TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      UNIQUE(user_id, listing_id)
    );
  `);

  const messageColumns = [
    "ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text'",
    "ALTER TABLE messages ADD COLUMN image_url TEXT"
  ];

  messageColumns.forEach((statement) => {
    try {
      db.prepare(statement).run();
    } catch (error) {
      // Column already exists.
    }
  });

  const listingColumns = ["ALTER TABLE listings ADD COLUMN status TEXT DEFAULT 'ACTIVE'"];
  listingColumns.forEach((statement) => {
    try {
      db.prepare(statement).run();
    } catch (error) {
      // Column already exists.
    }
  });

  const transactionColumns = [
    "ALTER TABLE transactions ADD COLUMN rent_from TEXT",
    "ALTER TABLE transactions ADD COLUMN rent_to TEXT",
    "ALTER TABLE transactions ADD COLUMN rent_days INTEGER",
    "ALTER TABLE transactions ADD COLUMN total_rent_price REAL",
    "ALTER TABLE transactions ADD COLUMN seller_action TEXT DEFAULT 'PENDING'"
  ];
  transactionColumns.forEach((statement) => {
    try {
      db.prepare(statement).run();
    } catch (error) {
      // Column already exists.
    }
  });

  try {
    db.prepare("UPDATE listings SET status = 'ACTIVE' WHERE is_available = 1 AND status IS NULL").run();
  } catch (error) {
    // Column missing.
  }

  try {
    db.prepare("UPDATE listings SET status = 'REMOVED' WHERE is_available = 0 AND status IS NULL").run();
  } catch (error) {
    // Column missing.
  }
}

function seedData() {
  const existing = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (existing.c > 0) {
    return;
  }

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password, roll_number, department, year, is_verified, role, otp, otp_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const adminHash = bcrypt.hashSync("admin123", 10);
  const studentHash = bcrypt.hashSync("test123", 10);

  insertUser.run(
    "Campus Admin",
    "admin@university.edu",
    adminHash,
    "ADMIN-001",
    "Administration",
    0,
    1,
    "admin",
    null,
    null
  );

  insertUser.run(
    "Student One",
    "student1@university.edu",
    studentHash,
    "STU-1001",
    "CSE",
    2,
    1,
    "student",
    null,
    null
  );

  insertUser.run(
    "Student Two",
    "student2@university.edu",
    studentHash,
    "STU-1002",
    "ECE",
    3,
    1,
    "student",
    null,
    null
  );

  insertUser.run(
    "Student Three",
    "student3@university.edu",
    studentHash,
    "STU-1003",
    "ME",
    1,
    1,
    "student",
    null,
    null
  );

  const users = db.prepare("SELECT id, email FROM users").all();
  const userIdByEmail = Object.fromEntries(users.map((row) => [row.email, row.id]));

  const seedListings = [
    {
      title: "Engineering Mathematics Textbook",
      description: "Barely used, clean pages with a sturdy cover.",
      category: "BOOKS",
      condition: "LIKE_NEW",
      listing_type: "SELL",
      price: 450,
      seller: "student1@university.edu"
    },
    {
      title: "Wireless Headphones",
      description: "Great battery life, comes with case.",
      category: "GADGETS",
      condition: "GOOD",
      listing_type: "SELL",
      price: 1800,
      seller: "student2@university.edu"
    },
    {
      title: "Thermodynamics Notes",
      description: "Handwritten notes with solved examples.",
      category: "NOTES",
      condition: "GOOD",
      listing_type: "SELL",
      price: 150,
      seller: "student3@university.edu"
    },
    {
      title: "Scientific Calculator",
      description: "Model FX-991, works perfectly.",
      category: "GADGETS",
      condition: "FAIR",
      listing_type: "SELL",
      price: 900,
      seller: "student1@university.edu"
    },
    {
      title: "Stationery Kit",
      description: "Pens, highlighters, sticky notes combo.",
      category: "STATIONERY",
      condition: "LIKE_NEW",
      listing_type: "SELL",
      price: 120,
      seller: "student2@university.edu"
    },
    {
      title: "Laptop Stand",
      description: "Adjustable metal stand for desks.",
      category: "OTHER",
      condition: "GOOD",
      listing_type: "SELL",
      price: 350,
      seller: "student3@university.edu"
    },
    {
      title: "Circuit Analysis Book",
      description: "Highlighted chapters, still in good shape.",
      category: "BOOKS",
      condition: "GOOD",
      listing_type: "RENT",
      price: 200,
      seller: "student1@university.edu"
    },
    {
      title: "Guitar for Rent",
      description: "Acoustic guitar, ideal for beginners.",
      category: "OTHER",
      condition: "FAIR",
      listing_type: "RENT",
      price: 500,
      seller: "student2@university.edu"
    },
    {
      title: "iPad Mini (2019)",
      description: "64GB, includes charger and case.",
      category: "GADGETS",
      condition: "GOOD",
      listing_type: "SELL",
      price: 12000,
      seller: "student3@university.edu"
    },
    {
      title: "Project File Pack",
      description: "Pack of 10 file folders.",
      category: "STATIONERY",
      condition: "LIKE_NEW",
      listing_type: "SELL",
      price: 90,
      seller: "student1@university.edu"
    }
  ];

  const insertListing = db.prepare(
    "INSERT INTO listings (title, description, category, condition, listing_type, price, ai_suggested_price, image_url, is_available, seller_id, view_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  seedListings.forEach((listing, index) => {
    const suggested = Math.round(listing.price * 0.92);
    const imageUrl = `https://picsum.photos/seed/campusloop-${index + 1}/900/700`;
    insertListing.run(
      listing.title,
      listing.description,
      listing.category,
      listing.condition,
      listing.listing_type,
      listing.price,
      suggested,
      imageUrl,
      1,
      userIdByEmail[listing.seller],
      Math.floor(Math.random() * 40)
    );
  });
}

createTables();
seedData();

module.exports = { db };
