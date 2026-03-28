const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, calculateDistance } = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { validateImageForSpot } = require('../services/imageValidation');
const { ensureLocalSpotImage } = require('../imageService');
const { awardUniqueSpotPoint } = require('../services/points');

const MAX_PHOTOS = 10;
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const NORMAL_RADIUS_METRES = 1000;
const REMOTE_RADIUS_METRES = 50000; // 50km
const MIN_FLAGS = 3;

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG and PNG images allowed'), false);
  },
});

const APPROVED_USER_PHOTO_FILTER = `p.status = 'approved' AND p.user_id IS NOT NULL AND p.user_id != 'system'`;

// GET /api/photos/:spotId - Get approved photos (latest 10)
router.get('/:spotId', async (req, res) => {
  try {
    const spot = db.prepare('SELECT id, name, category, city, country, image_url FROM spots WHERE id = ?').get(req.params.spotId);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    let photos = db.prepare(`
      SELECT p.id, p.filename, p.uploaded_at, p.flag_count,
             p.distance_metres, u.name as uploader_name
      FROM photos p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.spot_id = ? AND ${APPROVED_USER_PHOTO_FILTER}
      ORDER BY p.uploaded_at DESC
      LIMIT 10
    `).all(req.params.spotId);

    if (photos.length === 0) {
      let sampleImageUrl = spot.image_url || null;
      if (!sampleImageUrl) {
        try {
          sampleImageUrl = await ensureLocalSpotImage(spot);
          db.prepare('UPDATE spots SET image_url = ? WHERE id = ?').run(sampleImageUrl, spot.id);
        } catch (error) {
          console.log(`Sample photo sync failed for ${spot.name}: ${error.message}`);
        }
      }

      if (sampleImageUrl) {
        photos = [{
          id: `sample-${spot.id}`,
          filename: sampleImageUrl,
          uploaded_at: Date.now(),
          flag_count: 0,
          distance_metres: null,
          uploader_name: 'Sample',
          is_sample: true,
        }];
      }
    }

    res.json({ success: true, photos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

// GET /api/photos/:spotId/pending - Get pending photos for review
router.get('/:spotId/pending', authMiddleware, (req, res) => {
  try {
    const photos = db.prepare(`
      SELECT p.id, p.filename, p.uploaded_at, p.flag_count,
             u.name as uploader_name,
             CASE WHEN pf.id IS NOT NULL THEN 1 ELSE 0 END as already_flagged
      FROM photos p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN photo_flags pf ON pf.photo_id = p.id AND pf.user_id = ?
      WHERE p.spot_id = ? AND p.status = 'pending'
      ORDER BY p.uploaded_at ASC
    `).all(req.user.id, req.params.spotId);
    res.json({ success: true, photos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending photos' });
  }
});

// POST /api/photos/:spotId/upload
router.post('/:spotId/upload', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { spotId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'GPS location is required to upload photos.' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({ success: false, message: 'Invalid GPS coordinates.' });
    }

    const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(spotId);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    const distanceMetres = calculateDistance(userLat, userLon, spot.latitude, spot.longitude);
    const allowedRadius = spot.is_remote ? REMOTE_RADIUS_METRES : NORMAL_RADIUS_METRES;

    if (distanceMetres > allowedRadius) {
      const displayDistance = distanceMetres >= 1000
        ? `${(distanceMetres / 1000).toFixed(1)} km`
        : `${Math.round(distanceMetres)} metres`;
      const displayAllowed = spot.is_remote ? '50 kilometres' : '1000 metres';
      return res.status(403).json({
        success: false,
        message: `You are too far. You are ${displayDistance} away. Must be within ${displayAllowed}.`,
        distance_metres: distanceMetres,
        allowed_radius: allowedRadius,
      });
    }

    const approvedCount = db.prepare(`
      SELECT COUNT(*) as c FROM photos WHERE spot_id = ? AND status = 'approved'
    `).get(spotId);

    if (approvedCount.c >= MAX_PHOTOS) {
      const lastPhoto = db.prepare(`
        SELECT uploaded_at FROM photos
        WHERE spot_id = ? AND status = 'approved'
        ORDER BY uploaded_at DESC LIMIT 1
      `).get(spotId);
      if (lastPhoto) {
        const msSince = Date.now() - lastPhoto.uploaded_at;
        if (msSince < COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((COOLDOWN_MS - msSince) / (1000 * 60));
          return res.status(429).json({
            success: false,
            message: `This spot has 10 photos. New uploads open in ${remainingMinutes} minute(s).`,
            cooldown_remaining_minutes: remainingMinutes,
          });
        }
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided.' });
    }

    const validation = await validateImageForSpot(req.file.buffer);
    if (!validation.accepted) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
        failed_rule: validation.failedRule,
        checks: validation.checks,
      });
    }

    const filename = `photo_${uuidv4()}.jpg`;
    const outputPath = path.join(UPLOADS_DIR, filename);

    await sharp(req.file.buffer)
      .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);

    const photoId = uuidv4();
    db.prepare(`
      INSERT INTO photos (id, spot_id, user_id, filename, status, user_latitude, user_longitude, distance_metres, uploaded_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(photoId, spotId, userId, filename, userLat, userLon, distanceMetres, Date.now());
    const pointAward = awardUniqueSpotPoint(userId, spotId, 'upload');

    res.status(201).json({
      success: true,
      message: '📸 Photo uploaded! Pending community review.',
      photo: { id: photoId, filename, status: 'pending', distance_metres: distanceMetres },
      rules_summary: validation.checks,
      points_awarded: pointAward.awarded ? 1 : 0,
      total_points: pointAward.points,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// POST /api/photos/:photoId/approve - Community approve
router.post('/:photoId/approve', authMiddleware, (req, res) => {
  try {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    if (photo.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot approve your own photo' });
    }
    if (photo.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Photo is not pending' });
    }

    db.prepare(`UPDATE photos SET status = 'approved', uploaded_at = ? WHERE id = ?`)
      .run(Date.now(), photo.id);

    // Delete oldest if over limit
    const approved = db.prepare(`
      SELECT id, filename FROM photos
      WHERE spot_id = ? AND status = 'approved'
      ORDER BY uploaded_at ASC
    `).all(photo.spot_id);

    if (approved.length > MAX_PHOTOS) {
      const oldest = approved[0];
      const filePath = path.join(UPLOADS_DIR, oldest.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.prepare('DELETE FROM photos WHERE id = ?').run(oldest.id);
    }

    res.json({ success: true, message: '✅ Photo approved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Approval failed' });
  }
});

// POST /api/photos/:photoId/flag - Flag a photo
router.post('/:photoId/flag', authMiddleware, (req, res) => {
  try {
    const { reason } = req.body;
    const validReasons = ['selfie', 'blurry', 'blank', 'inappropriate', 'not_location'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: `Valid reasons: ${validReasons.join(', ')}` });
    }

    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });
    if (photo.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot flag your own photo' });
    }

    const existing = db.prepare('SELECT id FROM photo_flags WHERE photo_id = ? AND user_id = ?')
      .get(photo.id, req.user.id);
    if (existing) return res.status(400).json({ success: false, message: 'Already flagged' });

    db.prepare('INSERT INTO photo_flags (id, photo_id, user_id, reason) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), photo.id, req.user.id, reason);

    const newCount = photo.flag_count + 1;
    db.prepare('UPDATE photos SET flag_count = ? WHERE id = ?').run(newCount, photo.id);

    if (newCount >= MIN_FLAGS) {
      db.prepare(`UPDATE photos SET status = 'rejected' WHERE id = ?`).run(photo.id);
      const filePath = path.join(UPLOADS_DIR, photo.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.json({ success: true, message: '🚩 Photo removed.' });
    }

    res.json({ success: true, message: '🚩 Photo flagged.', flags: newCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Flagging failed' });
  }
});

module.exports = router;
