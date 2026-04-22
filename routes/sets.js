// backend/routes/sets.js
const express = require('express');
const { body, param, query } = require('express-validator');

const db                = require('../config/db');
const { authenticate }  = require('../middleware/auth');
const { validate }      = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ── GET /api/sets  (list user's sets, optional ?search=) ─────────────────────
router.get('/', async (req, res) => {
  const { search } = req.query;
  let sql    = 'SELECT s.id, s.title, s.description, s.ai_generated, s.created_at, s.updated_at, COUNT(c.id) AS card_count FROM flashcard_sets s LEFT JOIN cards c ON c.set_id = s.id WHERE s.user_id = ?';
  const params = [req.user.id];

  if (search) {
    sql += ' AND (s.title LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY s.id ORDER BY s.updated_at DESC';

  const [rows] = await db.execute(sql, params);
  return res.json({ sets: rows });
});

// ── POST /api/sets ────────────────────────────────────────────────────────────
router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('cards').isArray({ min: 1 }).withMessage('At least one card is required'),
    body('cards.*.question').trim().notEmpty().withMessage('Card question required'),
    body('cards.*.answer').trim().notEmpty().withMessage('Card answer required'),
    body('ai_generated').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    const { title, description = '', cards, ai_generated = false } = req.body;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [setResult] = await conn.execute(
        'INSERT INTO flashcard_sets (user_id, title, description, ai_generated) VALUES (?, ?, ?, ?)',
        [req.user.id, title, description, ai_generated ? 1 : 0]
      );
      const setId = setResult.insertId;

      for (let i = 0; i < cards.length; i++) {
        await conn.execute(
          'INSERT INTO cards (set_id, question, answer, position) VALUES (?, ?, ?, ?)',
          [setId, cards[i].question.trim(), cards[i].answer.trim(), i]
        );
      }

      await conn.commit();

      const [newSet] = await conn.execute(
        'SELECT id, title, description, ai_generated, created_at FROM flashcard_sets WHERE id = ?',
        [setId]
      );
      return res.status(201).json({ set: newSet[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
);

// ── GET /api/sets/:id ─────────────────────────────────────────────────────────
router.get('/:id',
  [param('id').isInt({ gt: 0 })],
  validate,
  async (req, res) => {
    const [sets] = await db.execute(
      'SELECT * FROM flashcard_sets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!sets.length) return res.status(404).json({ error: 'Set not found' });

    const [cards] = await db.execute(
      'SELECT id, question, answer, position FROM cards WHERE set_id = ? ORDER BY position',
      [req.params.id]
    );
    return res.json({ set: sets[0], cards });
  }
);

// ── PUT /api/sets/:id ─────────────────────────────────────────────────────────
router.put('/:id',
  [
    param('id').isInt({ gt: 0 }),
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('cards').isArray({ min: 1 }),
    body('cards.*.question').trim().notEmpty(),
    body('cards.*.answer').trim().notEmpty(),
  ],
  validate,
  async (req, res) => {
    const setId = req.params.id;
    const { title, description = '', cards } = req.body;

    const [existing] = await db.execute(
      'SELECT id FROM flashcard_sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Set not found' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE flashcard_sets SET title = ?, description = ? WHERE id = ?',
        [title, description, setId]
      );

      // Replace all cards (simpler than diffing)
      await conn.execute('DELETE FROM cards WHERE set_id = ?', [setId]);
      for (let i = 0; i < cards.length; i++) {
        await conn.execute(
          'INSERT INTO cards (set_id, question, answer, position) VALUES (?, ?, ?, ?)',
          [setId, cards[i].question.trim(), cards[i].answer.trim(), i]
        );
      }

      await conn.commit();
      return res.json({ message: 'Set updated' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
);

// ── DELETE /api/sets/:id ──────────────────────────────────────────────────────
router.delete('/:id',
  [param('id').isInt({ gt: 0 })],
  validate,
  async (req, res) => {
    const [result] = await db.execute(
      'DELETE FROM flashcard_sets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Set not found' });
    return res.json({ message: 'Set deleted' });
  }
);

module.exports = router;
