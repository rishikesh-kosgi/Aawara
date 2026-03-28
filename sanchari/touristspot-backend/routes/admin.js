const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '../uploads');

router.use(authMiddleware, adminMiddleware);

router.get('/pending', async (req, res) => {
  try {
    const photos = await db.prepare(`
      SELECT p.*, s.name as spot_name, u.name as uploader_name, u.phone as uploader_phone
      FROM photos p
      JOIN spots s ON p.spot_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.uploaded_at ASC
    `).all();
    res.json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending photos' });
  }
});

router.post('/photos/:photoId/approve', async (req, res) => {
  try {
    const photo = await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    if (photo.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Photo is not pending' });
    }

    await db.prepare(`UPDATE photos SET status = 'approved', uploaded_at = ? WHERE id = ?`)
      .run(Date.now(), photo.id);

    const approved = await db.prepare(`
      SELECT id, filename FROM photos
      WHERE spot_id = ? AND status = 'approved'
      ORDER BY uploaded_at ASC
    `).all(photo.spot_id);

    if (approved.length > 10) {
      const oldest = approved[0];
      const filePath = path.join(UPLOADS_DIR, oldest.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await db.prepare('DELETE FROM photos WHERE id = ?').run(oldest.id);
    }

    res.json({ success: true, message: '✅ Photo approved by admin.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Approval failed' });
  }
});

router.post('/photos/:photoId/reject', async (req, res) => {
  try {
    const photo = await db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    await db.prepare(`UPDATE photos SET status = 'rejected' WHERE id = ?`).run(photo.id);
    const filePath = path.join(UPLOADS_DIR, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: '🗑️ Photo rejected and deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Rejection failed' });
  }
});

router.get('/spots', async (req, res) => {
  try {
    const spots = await db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND status = 'approved') as approved_photos,
        (SELECT COUNT(*) FROM photos WHERE spot_id = s.id AND status = 'pending') as pending_photos
      FROM spots s
      ORDER BY s.name ASC
    `).all();
    res.json({ success: true, spots });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch spots' });
  }
});

router.put('/spots/:id/remote', async (req, res) => {
  try {
    const { is_remote } = req.body;
    const spot = await db.prepare('SELECT id FROM spots WHERE id = ?').get(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    await db.prepare('UPDATE spots SET is_remote = ? WHERE id = ?')
      .run(is_remote ? 1 : 0, req.params.id);

    res.json({
      success: true,
      message: `Spot marked as ${is_remote ? 'remote (50km radius)' : 'normal (1000m radius)'}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT id, phone, name, is_admin, created_at,
        (SELECT COUNT(*) FROM photos WHERE user_id = users.id) as total_uploads
      FROM users ORDER BY created_at DESC
    `).all();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.put('/users/:id/make-admin', async (req, res) => {
  try {
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '✅ User promoted to admin.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

module.exports = router;
