require('dotenv').config();

const path = require('path');
const SQLiteDatabase = require('better-sqlite3');
const { initializeDatabase, withTransaction, syncSeedSpots, db, pool } = require('./database');
const { makeSpotKey } = require('./seedSpotsData');

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, 'tourist_app.db');

function readTable(sqlite, table) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all();
}

async function insertRows(tx, table, rows, columns) {
  if (!rows.length) return;
  const placeholders = columns.map(() => '?').join(', ');
  const statement = tx.prepare(`
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (id) DO NOTHING
  `);

  for (const row of rows) {
    await statement.run(...columns.map(column => row[column]));
  }
}

async function main() {
  const sqlite = new SQLiteDatabase(SQLITE_DB_PATH, { readonly: true });

  try {
    await initializeDatabase({ syncSeeds: false });

    await withTransaction(async tx => {
      await insertRows(tx, 'users', readTable(sqlite, 'users'), [
        'id', 'phone', 'name', 'email', 'google_id', 'avatar_url',
        'auth_provider', 'is_admin', 'points', 'created_at',
      ]);

      const sqliteSpots = readTable(sqlite, 'spots').map(spot => ({
        ...spot,
        spot_key: makeSpotKey(spot),
      }));
      if (sqliteSpots.length) {
        const statement = tx.prepare(`
          INSERT INTO spots (
            id, spot_key, name, description, category, city, country,
            latitude, longitude, address, is_remote, remote_votes,
            status, submitted_by, approval_votes, image_url, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `);

        for (const spot of sqliteSpots) {
          await statement.run(
            spot.id,
            spot.spot_key,
            spot.name,
            spot.description,
            spot.category,
            spot.city,
            spot.country,
            spot.latitude,
            spot.longitude,
            spot.address,
            spot.is_remote,
            spot.remote_votes,
            spot.status,
            spot.submitted_by,
            spot.approval_votes,
            spot.image_url,
            spot.created_at,
          );
        }
      }

      await insertRows(tx, 'spot_approval_votes', readTable(sqlite, 'spot_approval_votes'), [
        'id', 'spot_id', 'user_id',
      ]);
      await insertRows(tx, 'remote_votes', readTable(sqlite, 'remote_votes'), [
        'id', 'spot_id', 'user_id',
      ]);
      await insertRows(tx, 'spot_views', readTable(sqlite, 'spot_views'), [
        'id', 'spot_id', 'user_id', 'viewed_at',
      ]);
      await insertRows(tx, 'photos', readTable(sqlite, 'photos'), [
        'id', 'spot_id', 'user_id', 'filename', 'status', 'flag_count',
        'user_latitude', 'user_longitude', 'distance_metres', 'uploaded_at',
      ]);
      await insertRows(tx, 'photo_flags', readTable(sqlite, 'photo_flags'), [
        'id', 'photo_id', 'user_id', 'reason', 'created_at',
      ]);
      await insertRows(tx, 'favorites', readTable(sqlite, 'favorites'), [
        'id', 'user_id', 'spot_id', 'created_at',
      ]);
      await insertRows(tx, 'trip_groups', readTable(sqlite, 'trip_groups'), [
        'id', 'name', 'invite_code', 'created_by', 'created_at',
      ]);
      await insertRows(tx, 'trip_group_members', readTable(sqlite, 'trip_group_members'), [
        'id', 'group_id', 'user_id', 'role', 'joined_at',
      ]);
      await insertRows(tx, 'trip_group_spot_suggestions', readTable(sqlite, 'trip_group_spot_suggestions'), [
        'id', 'group_id', 'spot_id', 'suggested_by', 'created_at',
      ]);
      await insertRows(tx, 'trip_group_spot_votes', readTable(sqlite, 'trip_group_spot_votes'), [
        'id', 'suggestion_id', 'user_id', 'vote', 'created_at',
      ]);
      await insertRows(tx, 'point_events', readTable(sqlite, 'point_events'), [
        'id', 'user_id', 'spot_id', 'event_type', 'points', 'created_at',
      ]);
      await insertRows(tx, 'visited_spots', readTable(sqlite, 'visited_spots'), [
        'id', 'user_id', 'spot_id', 'first_visited_at', 'last_visited_at', 'visit_count',
      ]);

      await syncSeedSpots(tx);
    });

    const counts = {
      users: (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c,
      spots: (await db.prepare('SELECT COUNT(*) as c FROM spots').get()).c,
      photos: (await db.prepare('SELECT COUNT(*) as c FROM photos').get()).c,
      groups: (await db.prepare('SELECT COUNT(*) as c FROM trip_groups').get()).c,
    };

    console.log('SQLite -> PostgreSQL migration complete');
    console.log(counts);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
