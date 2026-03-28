const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function getMembership(groupId, userId) {
  return db.prepare(`
    SELECT *
    FROM trip_group_members
    WHERE group_id = ? AND user_id = ?
  `).get(groupId, userId);
}

function attachGroupSummary(group, userId) {
  if (!group) return null;
  const members = db.prepare(`
    SELECT COUNT(*) as c
    FROM trip_group_members
    WHERE group_id = ?
  `).get(group.id);
  const suggestions = db.prepare(`
    SELECT COUNT(*) as c
    FROM trip_group_spot_suggestions
    WHERE group_id = ?
  `).get(group.id);
  const accepted = db.prepare(`
    SELECT COUNT(*) as c
    FROM trip_group_spot_votes v
    JOIN trip_group_spot_suggestions s ON s.id = v.suggestion_id
    WHERE s.group_id = ? AND v.user_id = ? AND v.vote = 'yes'
  `).get(group.id, userId);

  return {
    ...group,
    member_count: members.c,
    suggestion_count: suggestions.c,
    accepted_count: accepted.c,
  };
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*
      FROM trip_groups g
      JOIN trip_group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.user.id).map(group => attachGroupSummary(group, req.user.id));

    res.json({ success: true, groups });
  } catch (error) {
    console.error('Group list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load groups' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 3) {
      return res.status(400).json({ success: false, message: 'Group name must be at least 3 characters' });
    }

    const groupId = uuidv4();
    let inviteCode = createInviteCode();
    while (db.prepare('SELECT id FROM trip_groups WHERE invite_code = ?').get(inviteCode)) {
      inviteCode = createInviteCode();
    }

    db.prepare(`
      INSERT INTO trip_groups (id, name, invite_code, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(groupId, name, inviteCode, req.user.id, Math.floor(Date.now() / 1000));

    db.prepare(`
      INSERT INTO trip_group_members (id, group_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'owner', ?)
    `).run(uuidv4(), groupId, req.user.id, Math.floor(Date.now() / 1000));

    const group = db.prepare('SELECT * FROM trip_groups WHERE id = ?').get(groupId);
    res.status(201).json({ success: true, group: attachGroupSummary(group, req.user.id) });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Failed to create group' });
  }
});

router.post('/join', authMiddleware, (req, res) => {
  try {
    const inviteCode = String(req.body?.invite_code || '').trim().toUpperCase();
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code required' });
    }

    const group = db.prepare('SELECT * FROM trip_groups WHERE invite_code = ?').get(inviteCode);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const existing = getMembership(group.id, req.user.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO trip_group_members (id, group_id, user_id, role, joined_at)
        VALUES (?, ?, ?, 'member', ?)
      `).run(uuidv4(), group.id, req.user.id, Math.floor(Date.now() / 1000));
    }

    res.json({ success: true, group: attachGroupSummary(group, req.user.id) });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ success: false, message: 'Failed to join group' });
  }
});

router.get('/:groupId', authMiddleware, (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM trip_groups WHERE id = ?').get(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const membership = getMembership(group.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, gm.role, u.points
      FROM trip_group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY gm.role = 'owner' DESC, u.name ASC
    `).all(group.id);

    const suggestions = db.prepare(`
      SELECT
        s.id,
        s.group_id,
        s.spot_id,
        s.created_at,
        s.suggested_by,
        sp.name,
        sp.city,
        sp.country,
        sp.category,
        sp.description,
        sp.image_url,
        u.name as suggested_by_name,
        COALESCE(SUM(CASE WHEN v.vote = 'yes' THEN 1 ELSE 0 END), 0) as yes_votes,
        COALESCE(SUM(CASE WHEN v.vote = 'no' THEN 1 ELSE 0 END), 0) as no_votes,
        MAX(CASE WHEN v.user_id = ? THEN v.vote END) as user_vote,
        MAX(CASE WHEN v.user_id = ? AND v.vote = 'yes' THEN 1 ELSE 0 END) as user_yes,
        MAX(CASE WHEN v.user_id = ? AND v.vote = 'no' THEN 1 ELSE 0 END) as user_no
      FROM trip_group_spot_suggestions s
      JOIN spots sp ON sp.id = s.spot_id
      JOIN users u ON u.id = s.suggested_by
      LEFT JOIN trip_group_spot_votes v ON v.suggestion_id = s.id
      WHERE s.group_id = ?
      GROUP BY s.id
      ORDER BY yes_votes DESC, no_votes ASC, s.created_at ASC
    `).all(req.user.id, req.user.id, req.user.id, group.id);

    res.json({
      success: true,
      group: attachGroupSummary(group, req.user.id),
      membership,
      members,
      suggestions,
    });
  } catch (error) {
    console.error('Group detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load group' });
  }
});

router.post('/:groupId/suggestions', authMiddleware, (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM trip_groups WHERE id = ?').get(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const membership = getMembership(group.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const spotId = String(req.body?.spot_id || '').trim();
    const spot = db.prepare(`
      SELECT id, name
      FROM spots
      WHERE id = ? AND status = 'approved'
    `).get(spotId);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const existing = db.prepare(`
      SELECT id
      FROM trip_group_spot_suggestions
      WHERE group_id = ? AND spot_id = ?
    `).get(group.id, spot.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Spot already suggested in this group' });
    }

    const suggestionId = uuidv4();
    db.prepare(`
      INSERT INTO trip_group_spot_suggestions (id, group_id, spot_id, suggested_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(suggestionId, group.id, spot.id, req.user.id, Math.floor(Date.now() / 1000));

    res.status(201).json({ success: true, message: `${spot.name} added to the group plan` });
  } catch (error) {
    console.error('Suggest spot error:', error);
    res.status(500).json({ success: false, message: 'Failed to suggest spot' });
  }
});

router.post('/:groupId/suggestions/:suggestionId/vote', authMiddleware, (req, res) => {
  try {
    const vote = req.body?.vote === 'yes' ? 'yes' : req.body?.vote === 'no' ? 'no' : null;
    if (!vote) {
      return res.status(400).json({ success: false, message: 'Vote must be yes or no' });
    }

    const membership = getMembership(req.params.groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const suggestion = db.prepare(`
      SELECT *
      FROM trip_group_spot_suggestions
      WHERE id = ? AND group_id = ?
    `).get(req.params.suggestionId, req.params.groupId);
    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'Suggestion not found' });
    }

    const existing = db.prepare(`
      SELECT id
      FROM trip_group_spot_votes
      WHERE suggestion_id = ? AND user_id = ?
    `).get(suggestion.id, req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE trip_group_spot_votes
        SET vote = ?, created_at = ?
        WHERE id = ?
      `).run(vote, Math.floor(Date.now() / 1000), existing.id);
    } else {
      db.prepare(`
        INSERT INTO trip_group_spot_votes (id, suggestion_id, user_id, vote, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), suggestion.id, req.user.id, vote, Math.floor(Date.now() / 1000));
    }

    res.json({ success: true, message: vote === 'yes' ? 'Spot kept in the trip shortlist' : 'Spot skipped for now' });
  } catch (error) {
    console.error('Suggestion vote error:', error);
    res.status(500).json({ success: false, message: 'Failed to vote on spot' });
  }
});

module.exports = router;
