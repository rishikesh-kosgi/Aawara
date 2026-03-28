const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, calculateDistance } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { ensureLocalSpotImage } = require('../imageService');
const { awardUniqueSpotPoint } = require('../services/points');

const APPROVED_USER_PHOTO_FILTER = `status = 'approved' AND user_id IS NOT NULL AND user_id != 'system'`;

function attachUserState(spots, userId) {
  if (!userId) return spots;
  const favorites = db.prepare('SELECT spot_id FROM favorites WHERE user_id = ?').all(userId);
  const visited = db.prepare('SELECT spot_id, last_visited_at, visit_count FROM visited_spots WHERE user_id = ?').all(userId);
  const favSet = new Set(favorites.map(f => f.spot_id));
  const visitedMap = new Map(visited.map(item => [item.spot_id, item]));
  return spots.map(spot => {
    const visit = visitedMap.get(spot.id);
    return {
      ...spot,
      is_favorite: favSet.has(spot.id),
      is_visited: !!visit,
      visited_at: visit?.last_visited_at || null,
      visit_count: visit?.visit_count || 0,
    };
  });
}

async function ensureSampleImageForSpot(spot) {
  if (spot.image_url) return spot.image_url;
  const filename = await ensureLocalSpotImage(spot);
  db.prepare('UPDATE spots SET image_url = ? WHERE id = ?').run(filename, spot.id);
  return filename;
}

// GET /api/spots - Browse all spots
router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, category, city, country, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM spots s
      WHERE s.status = 'approved'
    `;
    const params = [];

    if (search) {
      query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.city LIKE ? OR s.country LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (category) {
      query += ` AND s.category = ?`;
      params.push(category);
    }
    if (city) {
      query += ` AND s.city LIKE ?`;
      params.push(`%${city}%`);
    }
    if (country) {
      query += ` AND s.country LIKE ?`;
      params.push(`%${country}%`);
    }

    query += ` ORDER BY s.name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    let spots = db.prepare(query).all(...params);
    spots = attachUserState(spots, req.user?.id);
    res.json({ success: true, spots });
  } catch (err) {
    console.error('Get spots error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch spots' });
  }
});

// GET /api/spots/trending
router.get('/trending', optionalAuth, (req, res) => {
  try {
    const { country, limit = 10 } = req.query;

    let query = `
      SELECT s.*,
        COUNT(sv.id) as view_count,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM spots s
      LEFT JOIN spot_views sv ON sv.spot_id = s.id
      WHERE s.status = 'approved'
    `;
    const params = [];

    if (country) {
      query += ` AND s.country = ?`;
      params.push(country);
    }

    query += ` GROUP BY s.id ORDER BY view_count DESC, photo_count DESC, s.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    let spots = db.prepare(query).all(...params);
    spots = attachUserState(spots, req.user?.id);

    res.json({ success: true, spots });
  } catch (err) {
    console.error('Trending error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch trending spots' });
  }
});

// GET /api/spots/nearby
router.get('/nearby', optionalAuth, (req, res) => {
  try {
    const { lat, lon, radius_km = 50, limit = 30 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon required' });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const radiusKm = parseFloat(radius_km);

    if (isNaN(userLat) || isNaN(userLon) || isNaN(radiusKm)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates or radius' });
    }

    const allSpots = db.prepare(`
      SELECT s.*,
        COUNT(sv.id) as view_count,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM spots s
      LEFT JOIN spot_views sv ON sv.spot_id = s.id
      WHERE s.status = 'approved'
      GROUP BY s.id
    `).all();

    function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    let nearby = allSpots
      .map(spot => ({ ...spot, distance_km: getDistance(userLat, userLon, spot.latitude, spot.longitude) }))
      .filter(spot => spot.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km || b.view_count - a.view_count)
      .slice(0, parseInt(limit));

    nearby = attachUserState(nearby, req.user?.id);
    res.json({ success: true, spots: nearby });
  } catch (err) {
    console.error('Nearby error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby spots' });
  }
});

// GET /api/spots/categories
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM spots WHERE status = ? ORDER BY category').all('approved');
  res.json({ success: true, categories: categories.map(c => c.category) });
});

// GET /api/spots/pending-spots
router.get('/pending-spots', optionalAuth, (req, res) => {
  try {
    let spots = db.prepare(`
      SELECT s.*,
        u.name as submitted_by_name,
        (SELECT COUNT(*) FROM spot_approval_votes WHERE spot_id = s.id) as vote_count
      FROM spots s
      LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.status = 'pending_approval'
      ORDER BY s.created_at ASC
    `).all();

    if (req.user) {
      spots = spots.map(spot => {
        const voted = db.prepare('SELECT id FROM spot_approval_votes WHERE spot_id = ? AND user_id = ?')
          .get(spot.id, req.user.id);
        return { ...spot, has_voted: !!voted };
      });
    }

    res.json({ success: true, spots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending spots' });
  }
});

// GET /api/spots/visited
router.get('/visited', authMiddleware, (req, res) => {
  try {
    const spots = db.prepare(`
      SELECT s.*, vs.first_visited_at, vs.last_visited_at, vs.visit_count,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM visited_spots vs
      JOIN spots s ON s.id = vs.spot_id
      WHERE vs.user_id = ? AND s.status = 'approved'
      ORDER BY vs.last_visited_at DESC
    `).all(req.user.id);

    res.json({ success: true, spots: attachUserState(spots, req.user.id) });
  } catch (err) {
    console.error('Visited spots error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch visited spots' });
  }
});

// GET /api/spots/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const viewerId = req.user?.id || null;
    db.prepare('INSERT INTO spot_views (id, spot_id, user_id) VALUES (?, ?, ?)')
      .run(uuidv4(), spot.id, viewerId);

    const latestUserPhoto = db.prepare(`
      SELECT id, filename, uploaded_at
      FROM photos
      WHERE spot_id = ? AND ${APPROVED_USER_PHOTO_FILTER}
      ORDER BY uploaded_at DESC LIMIT 1
    `).get(spot.id);

    let sampleImageUrl = spot.image_url || null;
    if (!latestUserPhoto) {
      try {
        sampleImageUrl = await ensureSampleImageForSpot(spot);
      } catch (error) {
        console.error(`Sample image generation failed for ${spot.name}:`, error.message);
      }
    }

    let isFavorite = false;
    let hasVotedRemote = false;
    let visitMeta = null;
    if (req.user) {
      const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND spot_id = ?')
        .get(req.user.id, spot.id);
      isFavorite = !!fav;
      const vote = db.prepare('SELECT id FROM remote_votes WHERE user_id = ? AND spot_id = ?')
        .get(req.user.id, spot.id);
      hasVotedRemote = !!vote;
      visitMeta = db.prepare(`
        SELECT first_visited_at, last_visited_at, visit_count
        FROM visited_spots
        WHERE user_id = ? AND spot_id = ?
      `).get(req.user.id, spot.id);
    }

    const photoCount = db.prepare(`
      SELECT COUNT(*) as c FROM photos WHERE spot_id = ? AND ${APPROVED_USER_PHOTO_FILTER}
    `).get(spot.id);

    const weekViews = db.prepare(`
      SELECT COUNT(*) as c FROM spot_views
      WHERE spot_id = ? AND viewed_at >= ?
    `).get(spot.id, Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60));

    let cooldownInfo = null;
    if (photoCount.c >= 10) {
      const lastPhoto = db.prepare(`
        SELECT uploaded_at FROM photos
        WHERE spot_id = ? AND ${APPROVED_USER_PHOTO_FILTER}
        ORDER BY uploaded_at DESC LIMIT 1
      `).get(spot.id);
      if (lastPhoto) {
        const msSince = Date.now() - lastPhoto.uploaded_at;
        const cooldownMs = 2 * 60 * 60 * 1000;
        if (msSince < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - msSince) / (1000 * 60));
          cooldownInfo = { active: true, remaining_minutes: remainingMinutes };
        }
      }
    }

    res.json({
      success: true,
      spot: {
        ...spot,
        is_favorite: isFavorite,
        has_voted_remote: hasVotedRemote,
        is_visited: !!visitMeta,
        visited_at: visitMeta?.last_visited_at || null,
        visit_count: visitMeta?.visit_count || 0,
        photo_count: photoCount.c,
        week_views: weekViews.c,
        cooldown: cooldownInfo,
        sample_image_url: sampleImageUrl,
      },
    });
  } catch (err) {
    console.error('Spot fetch error:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch spot' });
  }
});

// POST /api/spots/:id/visit
router.post('/:id/visit', authMiddleware, (req, res) => {
  try {
    const spot = db.prepare('SELECT id, name, latitude, longitude, status FROM spots WHERE id = ?').get(req.params.id);
    if (!spot || spot.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const distanceMetres = calculateDistance(latitude, longitude, spot.latitude, spot.longitude);
    if (distanceMetres > 750) {
      return res.status(400).json({
        success: false,
        message: 'You need to be closer to this spot to mark it visited',
        distance_metres: Math.round(distanceMetres),
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const existing = db.prepare(`
      SELECT id, visit_count, first_visited_at
      FROM visited_spots
      WHERE user_id = ? AND spot_id = ?
    `).get(req.user.id, spot.id);

    let pointAward = { awarded: false };

    if (existing) {
      db.prepare(`
        UPDATE visited_spots
        SET last_visited_at = ?, visit_count = visit_count + 1
        WHERE id = ?
      `).run(now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO visited_spots (id, user_id, spot_id, first_visited_at, last_visited_at, visit_count)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), req.user.id, spot.id, now, now);
      pointAward = awardUniqueSpotPoint(req.user.id, spot.id, 'visit');
    }

    const visit = db.prepare(`
      SELECT first_visited_at, last_visited_at, visit_count
      FROM visited_spots
      WHERE user_id = ? AND spot_id = ?
    `).get(req.user.id, spot.id);

    res.json({
      success: true,
      message: `Visited ${spot.name} recorded`,
      visited: {
        ...visit,
        distance_metres: Math.round(distanceMetres),
      },
      points_awarded: pointAward.awarded ? 1 : 0,
      total_points: pointAward.points,
    });
  } catch (err) {
    console.error('Visit record error:', err);
    res.status(500).json({ success: false, message: 'Failed to record visit' });
  }
});

// POST /api/spots - Submit a new spot
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, category, city, country, latitude, longitude, address } = req.body;

    if (!name || !latitude || !longitude || !city || !country) {
      return res.status(400).json({ success: false, message: 'Name, city, country and coordinates are required' });
    }

    const spotId = 'spot_' + uuidv4();
    db.prepare(`
      INSERT INTO spots (id, name, description, category, city, country, latitude, longitude, address, status, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
    `).run(
      spotId,
      name.trim(),
      description || '',
      category || 'General',
      city.trim(),
      country.trim(),
      parseFloat(latitude),
      parseFloat(longitude),
      address || '',
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Spot submitted! It will appear once 5 users approve it.',
      spot_id: spotId,
    });
  } catch (err) {
    console.error('Submit spot error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit spot' });
  }
});

// POST /api/spots/:id/vote-approval
router.post('/:id/vote-approval', authMiddleware, (req, res) => {
  try {
    const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    if (spot.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Spot is not pending approval' });
    }
    if (spot.submitted_by === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot vote for your own spot' });
    }

    const existing = db.prepare('SELECT id FROM spot_approval_votes WHERE spot_id = ? AND user_id = ?')
      .get(spot.id, req.user.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already voted for this spot' });
    }

    db.prepare('INSERT INTO spot_approval_votes (id, spot_id, user_id) VALUES (?, ?, ?)')
      .run(uuidv4(), spot.id, req.user.id);

    const newVotes = spot.approval_votes + 1;
    db.prepare('UPDATE spots SET approval_votes = ? WHERE id = ?').run(newVotes, spot.id);

    if (newVotes >= 5) {
      db.prepare(`UPDATE spots SET status = 'approved' WHERE id = ?`).run(spot.id);
      return res.json({
        success: true,
        message: 'Spot approved and added to the list!',
        approved: true,
        votes: newVotes,
      });
    }

    res.json({
      success: true,
      message: `Vote recorded! (${newVotes}/5 votes)`,
      approved: false,
      votes: newVotes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
});

// POST /api/spots/:id/vote-remote
router.post('/:id/vote-remote', authMiddleware, (req, res) => {
  try {
    const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    const existing = db.prepare('SELECT id FROM remote_votes WHERE user_id = ? AND spot_id = ?')
      .get(req.user.id, spot.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already voted' });
    }

    db.prepare('INSERT INTO remote_votes (id, spot_id, user_id) VALUES (?, ?, ?)')
      .run(uuidv4(), spot.id, req.user.id);

    const newVotes = spot.remote_votes + 1;
    const isRemote = newVotes >= 3 ? 1 : spot.is_remote;
    db.prepare('UPDATE spots SET remote_votes = ?, is_remote = ? WHERE id = ?')
      .run(newVotes, isRemote, spot.id);

    res.json({
      success: true,
      message: newVotes >= 3 ? 'Spot marked as remote!' : `Vote recorded (${newVotes}/3)`,
      remote_votes: newVotes,
      is_remote: isRemote === 1,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
});

module.exports = router;
