const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, calculateDistance } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { ensureLocalSpotImage } = require('../imageService');
const { awardUniqueSpotPoint } = require('../services/points');
const { makeSpotKey } = require('../seedSpotsData');

const router = express.Router();
const APPROVED_USER_PHOTO_FILTER = `status = 'approved' AND user_id IS NOT NULL AND user_id != 'system'`;

async function attachUserState(spots, userId) {
  if (!userId) return spots;

  const favorites = await db.prepare('SELECT spot_id FROM favorites WHERE user_id = ?').all(userId);
  const visited = await db.prepare('SELECT spot_id, last_visited_at, visit_count FROM visited_spots WHERE user_id = ?').all(userId);
  const favoriteSet = new Set(favorites.map(item => item.spot_id));
  const visitedMap = new Map(visited.map(item => [item.spot_id, item]));

  return spots.map(spot => {
    const visit = visitedMap.get(spot.id);
    return {
      ...spot,
      is_favorite: favoriteSet.has(spot.id),
      is_visited: Boolean(visit),
      visited_at: visit?.last_visited_at || null,
      visit_count: visit?.visit_count || 0,
    };
  });
}

async function ensureSampleImageForSpot(spot) {
  if (spot.image_url) return spot.image_url;
  const filename = await ensureLocalSpotImage(spot);
  await db.prepare('UPDATE spots SET image_url = ? WHERE id = ?').run(filename, spot.id);
  return filename;
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, city, country, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM spots s
      WHERE s.status = 'approved'
    `;
    const params = [];

    if (search) {
      query += ` AND (s.name ILIKE ? OR s.description ILIKE ? OR s.city ILIKE ? OR s.country ILIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (category) {
      query += ` AND s.category = ?`;
      params.push(category);
    }
    if (city) {
      query += ` AND s.city ILIKE ?`;
      params.push(`%${city}%`);
    }
    if (country) {
      query += ` AND s.country ILIKE ?`;
      params.push(`%${country}%`);
    }

    query += ` ORDER BY s.name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

    let spots = await db.prepare(query).all(...params);
    spots = await attachUserState(spots, req.user?.id);
    res.json({ success: true, spots });
  } catch (error) {
    console.error('Get spots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spots' });
  }
});

router.get('/trending', optionalAuth, async (req, res) => {
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
    params.push(parseInt(limit, 10));

    let spots = await db.prepare(query).all(...params);
    spots = await attachUserState(spots, req.user?.id);
    res.json({ success: true, spots });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending spots' });
  }
});

router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const { lat, lon, radius_km = 50, limit = 30 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon required' });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);
    const radiusKm = parseFloat(radius_km);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon) || !Number.isFinite(radiusKm)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates or radius' });
    }

    const allSpots = await db.prepare(`
      SELECT s.*,
        COUNT(sv.id) as view_count,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM spots s
      LEFT JOIN spot_views sv ON sv.spot_id = s.id
      WHERE s.status = 'approved'
      GROUP BY s.id
    `).all();

    const nearby = allSpots
      .map(spot => ({
        ...spot,
        distance_km: calculateDistance(userLat, userLon, spot.latitude, spot.longitude) / 1000,
      }))
      .filter(spot => spot.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km || b.view_count - a.view_count)
      .slice(0, parseInt(limit, 10));

    res.json({ success: true, spots: await attachUserState(nearby, req.user?.id) });
  } catch (error) {
    console.error('Nearby error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby spots' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT DISTINCT category
      FROM spots
      WHERE status = ?
      ORDER BY category
    `).all('approved');
    res.json({ success: true, categories: categories.map(item => item.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.get('/pending-spots', optionalAuth, async (req, res) => {
  try {
    let spots = await db.prepare(`
      SELECT s.*,
        u.name as submitted_by_name,
        (SELECT COUNT(*) FROM spot_approval_votes WHERE spot_id = s.id) as vote_count
      FROM spots s
      LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.status = 'pending_approval'
      ORDER BY s.created_at ASC
    `).all();

    if (req.user) {
      spots = await Promise.all(spots.map(async spot => {
        const voted = await db.prepare(`
          SELECT id
          FROM spot_approval_votes
          WHERE spot_id = ? AND user_id = ?
        `).get(spot.id, req.user.id);
        return { ...spot, has_voted: Boolean(voted) };
      }));
    }

    res.json({ success: true, spots });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending spots' });
  }
});

router.get('/visited', authMiddleware, async (req, res) => {
  try {
    const spots = await db.prepare(`
      SELECT s.*, vs.first_visited_at, vs.last_visited_at, vs.visit_count,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND ${APPROVED_USER_PHOTO_FILTER}) as photo_count
      FROM visited_spots vs
      JOIN spots s ON s.id = vs.spot_id
      WHERE vs.user_id = ? AND s.status = 'approved'
      ORDER BY vs.last_visited_at DESC
    `).all(req.user.id);

    res.json({ success: true, spots: await attachUserState(spots, req.user.id) });
  } catch (error) {
    console.error('Visited spots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visited spots' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const spot = await db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const viewerId = req.user?.id || null;
    await db.prepare('INSERT INTO spot_views (id, spot_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), spot.id, viewerId);

    const latestUserPhoto = await db.prepare(`
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
      isFavorite = Boolean(await db.prepare('SELECT id FROM favorites WHERE user_id = ? AND spot_id = ?')
        .get(req.user.id, spot.id));
      hasVotedRemote = Boolean(await db.prepare('SELECT id FROM remote_votes WHERE user_id = ? AND spot_id = ?')
        .get(req.user.id, spot.id));
      visitMeta = await db.prepare(`
        SELECT first_visited_at, last_visited_at, visit_count
        FROM visited_spots
        WHERE user_id = ? AND spot_id = ?
      `).get(req.user.id, spot.id);
    }

    const photoCount = await db.prepare(`
      SELECT COUNT(*) as c FROM photos WHERE spot_id = ? AND ${APPROVED_USER_PHOTO_FILTER}
    `).get(spot.id);

    const weekViews = await db.prepare(`
      SELECT COUNT(*) as c FROM spot_views
      WHERE spot_id = ? AND viewed_at >= ?
    `).get(spot.id, Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60));

    let cooldownInfo = null;
    if ((photoCount?.c || 0) >= 10) {
      const lastPhoto = await db.prepare(`
        SELECT uploaded_at
        FROM photos
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
        is_visited: Boolean(visitMeta),
        visited_at: visitMeta?.last_visited_at || null,
        visit_count: visitMeta?.visit_count || 0,
        photo_count: photoCount?.c || 0,
        week_views: weekViews?.c || 0,
        cooldown: cooldownInfo,
        sample_image_url: sampleImageUrl,
      },
    });
  } catch (error) {
    console.error('Spot fetch error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch spot' });
  }
});

router.post('/:id/visit', authMiddleware, async (req, res) => {
  try {
    const spot = await db.prepare(`
      SELECT id, name, latitude, longitude, status
      FROM spots
      WHERE id = ?
    `).get(req.params.id);
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
    const existing = await db.prepare(`
      SELECT id, visit_count, first_visited_at
      FROM visited_spots
      WHERE user_id = ? AND spot_id = ?
    `).get(req.user.id, spot.id);

    let pointAward = { awarded: false, points: req.user.points || 0 };

    if (existing) {
      await db.prepare(`
        UPDATE visited_spots
        SET last_visited_at = ?, visit_count = visit_count + 1
        WHERE id = ?
      `).run(now, existing.id);
    } else {
      await db.prepare(`
        INSERT INTO visited_spots (id, user_id, spot_id, first_visited_at, last_visited_at, visit_count)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), req.user.id, spot.id, now, now);
      pointAward = await awardUniqueSpotPoint(req.user.id, spot.id, 'visit');
    }

    const visit = await db.prepare(`
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
  } catch (error) {
    console.error('Visit record error:', error);
    res.status(500).json({ success: false, message: 'Failed to record visit' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, city, country, latitude, longitude, address } = req.body;

    if (!name || !latitude || !longitude || !city || !country) {
      return res.status(400).json({ success: false, message: 'Name, city, country and coordinates are required' });
    }

    const spotId = `spot_${uuidv4()}`;
    const spotKey = makeSpotKey({ name: name.trim(), city: city.trim(), country: country.trim() });
    await db.prepare(`
      INSERT INTO spots (
        id, spot_key, name, description, category, city, country,
        latitude, longitude, address, status, submitted_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
    `).run(
      spotId,
      spotKey,
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
  } catch (error) {
    if (String(error.message || '').includes('idx_spots_spot_key_unique')) {
      return res.status(400).json({ success: false, message: 'A spot with the same name and city already exists' });
    }
    console.error('Submit spot error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit spot' });
  }
});

router.post('/:id/vote-approval', authMiddleware, async (req, res) => {
  try {
    const spot = await db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    if (spot.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Spot is not pending approval' });
    }
    if (spot.submitted_by === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot vote for your own spot' });
    }

    const existing = await db.prepare(`
      SELECT id
      FROM spot_approval_votes
      WHERE spot_id = ? AND user_id = ?
    `).get(spot.id, req.user.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already voted for this spot' });
    }

    await db.prepare('INSERT INTO spot_approval_votes (id, spot_id, user_id) VALUES (?, ?, ?)')
      .run(uuidv4(), spot.id, req.user.id);

    const newVotes = (spot.approval_votes || 0) + 1;
    await db.prepare('UPDATE spots SET approval_votes = ? WHERE id = ?').run(newVotes, spot.id);

    if (newVotes >= 5) {
      await db.prepare(`UPDATE spots SET status = 'approved' WHERE id = ?`).run(spot.id);
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
});

router.post('/:id/vote-remote', authMiddleware, async (req, res) => {
  try {
    const spot = await db.prepare('SELECT * FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    const existing = await db.prepare(`
      SELECT id FROM remote_votes WHERE user_id = ? AND spot_id = ?
    `).get(req.user.id, spot.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already voted' });
    }

    await db.prepare('INSERT INTO remote_votes (id, spot_id, user_id) VALUES (?, ?, ?)')
      .run(uuidv4(), spot.id, req.user.id);

    const newVotes = (spot.remote_votes || 0) + 1;
    const isRemote = newVotes >= 3 ? 1 : spot.is_remote;
    await db.prepare('UPDATE spots SET remote_votes = ?, is_remote = ? WHERE id = ?')
      .run(newVotes, isRemote, spot.id);

    res.json({
      success: true,
      message: newVotes >= 3 ? 'Spot marked as remote!' : `Vote recorded (${newVotes}/3)`,
      remote_votes: newVotes,
      is_remote: isRemote === 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
});

module.exports = router;
