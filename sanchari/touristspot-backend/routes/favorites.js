const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const spots = await db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND status = 'approved') as photo_count,
        (SELECT filename FROM photos WHERE spot_id = s.id AND status = 'approved'
         ORDER BY uploaded_at DESC LIMIT 1) as cover_photo,
        f.created_at as favorited_at
      FROM favorites f
      JOIN spots s ON f.spot_id = s.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, spots: spots.map(spot => ({ ...spot, is_favorite: true })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
});

router.post('/:spotId', authMiddleware, async (req, res) => {
  try {
    const spot = await db.prepare('SELECT id FROM spots WHERE id = ?').get(req.params.spotId);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    const exists = await db.prepare('SELECT id FROM favorites WHERE user_id = ? AND spot_id = ?')
      .get(req.user.id, req.params.spotId);
    if (exists) return res.status(400).json({ success: false, message: 'Already in favorites' });

    await db.prepare('INSERT INTO favorites (id, user_id, spot_id) VALUES (?, ?, ?)')
      .run(uuidv4(), req.user.id, req.params.spotId);

    res.status(201).json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add favorite' });
  }
});

router.delete('/:spotId', authMiddleware, async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM favorites WHERE user_id = ? AND spot_id = ?')
      .run(req.user.id, req.params.spotId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Not in favorites' });
    }

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove favorite' });
  }
});

module.exports = router;
