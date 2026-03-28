const { Pool, types } = require('pg');
const { seedSpots, makeSpotKey } = require('./seedSpotsData');

types.setTypeParser(20, value => Number(value));
types.setTypeParser(1700, value => Number(value));

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/touristspot';

function resolveSslConfig() {
  const mode = String(process.env.PGSSL_MODE || 'disable').toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'off') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  ssl: resolveSslConfig(),
  max: Number(process.env.PG_POOL_MAX || 10),
});

pool.on('error', error => {
  console.error('PostgreSQL pool error:', error);
});

function toPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createExecutor(client) {
  return {
    async query(text, params = []) {
      return client.query(text, params);
    },
    async exec(text) {
      return client.query(text);
    },
    prepare(sql) {
      const text = toPgPlaceholders(sql);
      return {
        async get(...params) {
          const result = await client.query(text, params);
          return result.rows[0];
        },
        async all(...params) {
          const result = await client.query(text, params);
          return result.rows;
        },
        async run(...params) {
          const result = await client.query(text, params);
          return { changes: result.rowCount };
        },
      };
    },
  };
}

const db = createExecutor(pool);

async function withTransaction(fn) {
  const client = await pool.connect();
  const tx = createExecutor(client);
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function applySchema(executor = db) {
  await executor.exec(`
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
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS spots (
      id TEXT PRIMARY KEY,
      spot_key TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      city TEXT,
      country TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      address TEXT,
      is_remote INTEGER DEFAULT 0,
      remote_votes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      submitted_by TEXT,
      approval_votes INTEGER DEFAULT 0,
      image_url TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS spot_approval_votes (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(spot_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS remote_votes (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(spot_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS spot_views (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      viewed_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      flag_count INTEGER DEFAULT 0,
      user_latitude DOUBLE PRECISION,
      user_longitude DOUBLE PRECISION,
      distance_metres DOUBLE PRECISION,
      uploaded_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS photo_flags (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(photo_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(user_id, spot_id)
    );

    CREATE TABLE IF NOT EXISTS trip_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS trip_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS trip_group_spot_suggestions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      suggested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(group_id, spot_id)
    );

    CREATE TABLE IF NOT EXISTS trip_group_spot_votes (
      id TEXT PRIMARY KEY,
      suggestion_id TEXT NOT NULL REFERENCES trip_group_spot_suggestions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(suggestion_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(user_id, spot_id, event_type)
    );

    CREATE TABLE IF NOT EXISTS visited_spots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      first_visited_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      last_visited_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      visit_count INTEGER DEFAULT 1,
      UNIQUE(user_id, spot_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users(email)
    WHERE email IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
    ON users(google_id)
    WHERE google_id IS NOT NULL;

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
}

async function ensureSpotKeys(executor = db) {
  const spots = await executor.prepare(`
    SELECT id, name, city, country, spot_key
    FROM spots
  `).all();

  for (const spot of spots) {
    const nextKey = makeSpotKey(spot);
    if (spot.spot_key === nextKey) continue;

    await executor.prepare('UPDATE spots SET spot_key = ? WHERE id = ?')
      .run(nextKey, spot.id);
  }
}

async function syncSeedSpots(executor = db) {
  await executor.exec('DROP INDEX IF EXISTS idx_spots_spot_key_unique');
  await ensureSpotKeys(executor);

  const existing = await executor.prepare(`
    SELECT id, name, city, country, spot_key, status, created_at
    FROM spots
    ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END, created_at ASC, id ASC
  `).all();
  const existingByKey = new Map(existing.map(spot => [spot.spot_key || makeSpotKey(spot), spot]));

  for (const spot of seedSpots) {
    const [id, name, description, category, city, country, latitude, longitude, address, isRemote] = spot;
    const spotKey = makeSpotKey({ name, city, country });
    const current = existingByKey.get(spotKey);

    if (current) {
      await executor.prepare(`
        UPDATE spots
        SET spot_key = ?, name = ?, description = ?, category = ?, city = ?, country = ?,
            latitude = ?, longitude = ?, address = ?, is_remote = ?
        WHERE id = ?
      `).run(spotKey, name, description, category, city, country, latitude, longitude, address, isRemote, current.id);
    } else {
      await executor.prepare(`
        INSERT INTO spots (
          id, spot_key, name, description, category, city, country,
          latitude, longitude, address, is_remote
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, spotKey, name, description, category, city, country, latitude, longitude, address, isRemote);
      existingByKey.set(spotKey, { id, name, city, country, spot_key: spotKey });
    }
  }

  await dedupeExistingSpots(executor);
  await executor.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_spots_spot_key_unique
    ON spots(spot_key)
    WHERE spot_key IS NOT NULL
  `);
}

async function dedupeExistingSpots(executor = db) {
  await ensureSpotKeys(executor);
  const allSpots = await executor.prepare(`
    SELECT id, name, city, country, spot_key, status, created_at
    FROM spots
    ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END, created_at ASC, id ASC
  `).all();

  const grouped = new Map();
  for (const spot of allSpots) {
    const key = spot.spot_key || makeSpotKey(spot);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(spot);
  }

  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    const [canonical, ...duplicates] = group;
    for (const duplicate of duplicates) {
      await mergeDuplicateSpot(executor, canonical.id, duplicate.id);
    }
  }
}

async function mergeDuplicateSpot(executor, canonicalSpotId, duplicateSpotId) {
  if (!canonicalSpotId || !duplicateSpotId || canonicalSpotId === duplicateSpotId) return;

  await mergeSimpleSpotRefs(executor, 'photos', canonicalSpotId, duplicateSpotId);
  await mergeSimpleSpotRefs(executor, 'spot_views', canonicalSpotId, duplicateSpotId);
  await mergeUniqueSpotRefs(executor, 'favorites', canonicalSpotId, duplicateSpotId);
  await mergeUniqueSpotRefs(executor, 'remote_votes', canonicalSpotId, duplicateSpotId);
  await mergeUniqueSpotRefs(executor, 'spot_approval_votes', canonicalSpotId, duplicateSpotId);
  await mergePointEvents(executor, canonicalSpotId, duplicateSpotId);
  await mergeVisitedSpots(executor, canonicalSpotId, duplicateSpotId);
  await mergeGroupSuggestions(executor, canonicalSpotId, duplicateSpotId);

  await executor.prepare('DELETE FROM spots WHERE id = ?').run(duplicateSpotId);
}

async function mergeSimpleSpotRefs(executor, table, canonicalSpotId, duplicateSpotId) {
  await executor.prepare(`UPDATE ${table} SET spot_id = ? WHERE spot_id = ?`).run(canonicalSpotId, duplicateSpotId);
}

async function mergeUniqueSpotRefs(executor, table, canonicalSpotId, duplicateSpotId) {
  const rows = await executor.prepare(`SELECT id, user_id FROM ${table} WHERE spot_id = ?`).all(duplicateSpotId);
  for (const row of rows) {
    const hasCanonical = await executor.prepare(`
      SELECT id FROM ${table} WHERE spot_id = ? AND user_id = ?
    `).get(canonicalSpotId, row.user_id);

    if (hasCanonical) {
      await executor.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);
    } else {
      await executor.prepare(`UPDATE ${table} SET spot_id = ? WHERE id = ?`).run(canonicalSpotId, row.id);
    }
  }
}

async function mergePointEvents(executor, canonicalSpotId, duplicateSpotId) {
  const rows = await executor.prepare(`
    SELECT id, user_id, event_type
    FROM point_events
    WHERE spot_id = ?
  `).all(duplicateSpotId);

  for (const row of rows) {
    const hasCanonical = await executor.prepare(`
      SELECT id
      FROM point_events
      WHERE user_id = ? AND spot_id = ? AND event_type = ?
    `).get(row.user_id, canonicalSpotId, row.event_type);

    if (hasCanonical) {
      await executor.prepare('DELETE FROM point_events WHERE id = ?').run(row.id);
    } else {
      await executor.prepare('UPDATE point_events SET spot_id = ? WHERE id = ?').run(canonicalSpotId, row.id);
    }
  }
}

async function mergeVisitedSpots(executor, canonicalSpotId, duplicateSpotId) {
  const duplicateVisits = await executor.prepare(`
    SELECT id, user_id, first_visited_at, last_visited_at, visit_count
    FROM visited_spots
    WHERE spot_id = ?
  `).all(duplicateSpotId);

  for (const visit of duplicateVisits) {
    const canonical = await executor.prepare(`
      SELECT id, first_visited_at, last_visited_at, visit_count
      FROM visited_spots
      WHERE user_id = ? AND spot_id = ?
    `).get(visit.user_id, canonicalSpotId);

    if (!canonical) {
      await executor.prepare('UPDATE visited_spots SET spot_id = ? WHERE id = ?').run(canonicalSpotId, visit.id);
      continue;
    }

    await executor.prepare(`
      UPDATE visited_spots
      SET first_visited_at = LEAST(first_visited_at, ?),
          last_visited_at = GREATEST(last_visited_at, ?),
          visit_count = visit_count + ?
      WHERE id = ?
    `).run(visit.first_visited_at, visit.last_visited_at, visit.visit_count, canonical.id);

    await executor.prepare('DELETE FROM visited_spots WHERE id = ?').run(visit.id);
  }
}

async function mergeGroupSuggestions(executor, canonicalSpotId, duplicateSpotId) {
  const duplicateSuggestions = await executor.prepare(`
    SELECT id, group_id
    FROM trip_group_spot_suggestions
    WHERE spot_id = ?
  `).all(duplicateSpotId);

  for (const suggestion of duplicateSuggestions) {
    const canonicalSuggestion = await executor.prepare(`
      SELECT id
      FROM trip_group_spot_suggestions
      WHERE group_id = ? AND spot_id = ?
    `).get(suggestion.group_id, canonicalSpotId);

    if (!canonicalSuggestion) {
      await executor.prepare(`
        UPDATE trip_group_spot_suggestions
        SET spot_id = ?
        WHERE id = ?
      `).run(canonicalSpotId, suggestion.id);
      continue;
    }

    const votes = await executor.prepare(`
      SELECT id, user_id
      FROM trip_group_spot_votes
      WHERE suggestion_id = ?
    `).all(suggestion.id);

    for (const vote of votes) {
      const hasCanonicalVote = await executor.prepare(`
        SELECT id
        FROM trip_group_spot_votes
        WHERE suggestion_id = ? AND user_id = ?
      `).get(canonicalSuggestion.id, vote.user_id);

      if (hasCanonicalVote) {
        await executor.prepare('DELETE FROM trip_group_spot_votes WHERE id = ?').run(vote.id);
      } else {
        await executor.prepare(`
          UPDATE trip_group_spot_votes
          SET suggestion_id = ?
          WHERE id = ?
        `).run(canonicalSuggestion.id, vote.id);
      }
    }

    await executor.prepare('DELETE FROM trip_group_spot_suggestions WHERE id = ?').run(suggestion.id);
  }
}

async function syncAllUserPoints(executor = db) {
  await executor.exec(`
    UPDATE users
    SET points = COALESCE((
      SELECT SUM(pe.points)
      FROM point_events pe
      WHERE pe.user_id = users.id
    ), 0)
  `);
}

async function initializeDatabase(options = {}) {
  const { syncSeeds = true } = options;
  await applySchema(db);
  if (syncSeeds) {
    await withTransaction(async tx => {
      await syncSeedSpots(tx);
      await syncAllUserPoints(tx);
    });
  } else {
    await ensureSpotKeys(db);
  }
  console.log('Database initialized');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = degrees => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

module.exports = {
  db,
  pool,
  withTransaction,
  initializeDatabase,
  syncSeedSpots,
  calculateDistance,
};
