const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

function syncUserPoints(userId) {
  db.prepare(`
    UPDATE users
    SET points = COALESCE((
      SELECT SUM(points) FROM point_events WHERE user_id = ?
    ), 0)
    WHERE id = ?
  `).run(userId, userId);
}

function awardUniqueSpotPoint(userId, spotId, eventType) {
  if (!userId || !spotId || !eventType) {
    return { awarded: false, points: 0 };
  }

  const existing = db.prepare(`
    SELECT id
    FROM point_events
    WHERE user_id = ? AND spot_id = ? AND event_type = ?
  `).get(userId, spotId, eventType);

  if (existing) {
    syncUserPoints(userId);
    const current = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    return { awarded: false, points: current?.points || 0 };
  }

  db.prepare(`
    INSERT INTO point_events (id, user_id, spot_id, event_type, points, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(uuidv4(), userId, spotId, eventType, Math.floor(Date.now() / 1000));

  syncUserPoints(userId);
  const current = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  return { awarded: true, points: current?.points || 0 };
}

module.exports = { awardUniqueSpotPoint, syncUserPoints };
