const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!response.ok) {
    throw new Error('Google token verification failed');
  }

  const payload = await response.json();
  const expectedAudience = process.env.GOOGLE_WEB_CLIENT_ID;
  if (expectedAudience && payload.aud !== expectedAudience) {
    throw new Error('Google client ID mismatch');
  }

  if (payload.email_verified !== 'true' || !payload.email) {
    throw new Error('Google account email is not verified');
  }

  if (!payload.email.toLowerCase().endsWith('@gmail.com')) {
    throw new Error('Only Gmail accounts are allowed');
  }

  return payload;
}

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token required' });
    }

    const googleUser = await verifyGoogleIdToken(idToken);
    const email = googleUser.email.toLowerCase();
    const googleId = googleUser.sub;
    const fallbackPhone = `google:${googleId}`;
    const displayName = googleUser.name || googleUser.given_name || email.split('@')[0];
    const avatarUrl = googleUser.picture || null;

    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email);

    if (user) {
      db.prepare(`
        UPDATE users
        SET email = ?, google_id = ?, avatar_url = ?, auth_provider = 'google', name = COALESCE(NULLIF(name, ''), ?)
        WHERE id = ?
      `).run(email, googleId, avatarUrl, displayName, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    } else {
      const userId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, phone, name, email, google_id, avatar_url, auth_provider)
        VALUES (?, ?, ?, ?, ?, ?, 'google')
      `).run(userId, fallbackPhone, displayName, email, googleId, avatarUrl);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        google_id: user.google_id,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider || 'google',
        is_admin: user.is_admin,
        points: user.points || 0,
      },
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(400).json({ success: false, message: err.message || 'Google login failed' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
  }
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
  res.json({ success: true, message: 'Profile updated' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/leaderboard
router.get('/leaderboard', authMiddleware, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT
        id,
        name,
        email,
        avatar_url,
        points,
        (
          SELECT COUNT(*)
          FROM point_events pe
          WHERE pe.user_id = users.id AND pe.event_type = 'visit'
        ) as unique_spots_visited,
        (
          SELECT COUNT(*)
          FROM point_events pe
          WHERE pe.user_id = users.id AND pe.event_type = 'upload'
        ) as unique_spot_uploads
      FROM users
      WHERE points > 0
      ORDER BY points DESC, unique_spots_visited DESC, name ASC
      LIMIT 50
    `).all();

    res.json({ success: true, users });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
});

module.exports = router;
