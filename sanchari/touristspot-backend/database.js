const Database = require('better-sqlite3');
const path = require('path');
const { seedSpots } = require('./seedSpotsData');

const DB_PATH = path.join(__dirname, 'tourist_app.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      google_id TEXT,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'google',
      is_admin INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS spots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      city TEXT,
      country TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      is_remote INTEGER DEFAULT 0,
      remote_votes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      submitted_by TEXT,
      approval_votes INTEGER DEFAULT 0,
      image_url TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS spot_approval_votes (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      UNIQUE(spot_id, user_id),
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS remote_votes (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      UNIQUE(spot_id, user_id),
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS spot_views (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL,
      user_id TEXT,
      viewed_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL,
      user_id TEXT,
      filename TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      flag_count INTEGER DEFAULT 0,
      user_latitude REAL,
      user_longitude REAL,
      distance_metres REAL,
      uploaded_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photo_flags (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(photo_id, user_id),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      spot_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_id, spot_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES trip_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_group_spot_suggestions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      spot_id TEXT NOT NULL,
      suggested_by TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(group_id, spot_id),
      FOREIGN KEY (group_id) REFERENCES trip_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
      FOREIGN KEY (suggested_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_group_spot_votes (
      id TEXT PRIMARY KEY,
      suggestion_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(suggestion_id, user_id),
      FOREIGN KEY (suggestion_id) REFERENCES trip_group_spot_suggestions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      spot_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_id, spot_id, event_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visited_spots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      spot_id TEXT NOT NULL,
      first_visited_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_visited_at INTEGER DEFAULT (strftime('%s', 'now')),
      visit_count INTEGER DEFAULT 1,
      UNIQUE(user_id, spot_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_photos_spot_id ON photos(spot_id);
    CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_trip_group_members_user_id ON trip_group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_trip_group_members_group_id ON trip_group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_trip_group_suggestions_group_id ON trip_group_spot_suggestions(group_id);
    CREATE INDEX IF NOT EXISTS idx_trip_group_votes_suggestion_id ON trip_group_spot_votes(suggestion_id);
    CREATE INDEX IF NOT EXISTS idx_point_events_user_id ON point_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_point_events_spot_event ON point_events(spot_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_visited_spots_user_id ON visited_spots(user_id);
    CREATE INDEX IF NOT EXISTS idx_visited_spots_spot_id ON visited_spots(spot_id);
    CREATE INDEX IF NOT EXISTS idx_spots_category ON spots(category);
    CREATE INDEX IF NOT EXISTS idx_spots_status_name ON spots(status, name);
    CREATE INDEX IF NOT EXISTS idx_spot_views_spot_id ON spot_views(spot_id);
    CREATE INDEX IF NOT EXISTS idx_spot_views_viewed_at ON spot_views(viewed_at);
  `);

  try {
    db.exec('ALTER TABLE spots ADD COLUMN image_url TEXT');
    console.log('Added image_url column to spots');
  } catch (error) {
    // Column already exists.
  }

  const userColumns = [
    ['email', 'TEXT'],
    ['google_id', 'TEXT'],
    ['avatar_url', 'TEXT'],
    ['auth_provider', "TEXT DEFAULT 'phone'"],
  ];

  for (const [column, type] of userColumns) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${column} ${type}`);
      console.log(`Added ${column} column to users`);
    } catch (error) {
      // Column already exists.
    }
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users(email)
    WHERE email IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
    ON users(google_id)
    WHERE google_id IS NOT NULL;
  `);

  syncSeedSpots();
  db.exec(`
    UPDATE users
    SET points = COALESCE((
      SELECT SUM(pe.points)
      FROM point_events pe
      WHERE pe.user_id = users.id
    ), 0)
  `);
  console.log('Database initialized');
}

function syncSeedSpots() {
  const insert = db.prepare(`
    INSERT INTO spots (id, name, description, category, city, country, latitude, longitude, address, is_remote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const existingSpot = db.prepare('SELECT id FROM spots WHERE id = ?');

  const insertAll = db.transaction(() => {
    for (const spot of seedSpots) {
      if (!existingSpot.get(spot[0])) {
        insert.run(...spot);
      }
    }
  });

  insertAll();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { db, initializeDatabase, calculateDistance };
