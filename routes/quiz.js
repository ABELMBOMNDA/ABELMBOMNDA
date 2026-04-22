// backend/routes/quiz.js
const express = require('express');
const { body, param } = require('express-validator');

const db               = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// ── POST /api/quiz/attempts  (submit a completed quiz) ───────────────────────
router.post('/attempts',
  [
    body('set_id').isInt({ gt: 0 }),
    body('answers').isArray({ min: 1 }),
    body('answers.*.card_id').isInt({ gt: 0 }),
    body('answers.*.user_answer').isString(),
    body('answers.*.is_correct').isBoolean(),
  ],
  validate,
  async (req, res) => {
    const { set_id, answers } = req.body;

    // Verify the set belongs to this user
    const [sets] = await db.execute(
      'SELECT id FROM flashcard_sets WHERE id = ? AND user_id = ?',
      [set_id, req.user.id]
    );
    if (!sets.length) return res.status(404).json({ error: 'Set not found' });

    const total   = answers.length;
    const correct = answers.filter(a => a.is_correct).length;
    const percent = total > 0 ? parseFloat(((correct / total) * 100).toFixed(2)) : 0;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [attemptResult] = await conn.execute(
        `INSERT INTO quiz_attempts (user_id, set_id, score, total_questions, percent)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, set_id, correct, total, percent]
      );
      const attemptId = attemptResult.insertId;

      for (const a of answers) {
        await conn.execute(
          `INSERT INTO attempt_answers (attempt_id, card_id, user_answer, is_correct)
           VALUES (?, ?, ?, ?)`,
          [attemptId, a.card_id, a.user_answer, a.is_correct ? 1 : 0]
        );
      }

      await conn.commit();
      return res.status(201).json({ attempt_id: attemptId, score: correct, total, percent });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
);

// ── GET /api/quiz/history  (all attempts for the user) ───────────────────────
router.get('/history', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT qa.id, qa.set_id, s.title AS set_name,
            qa.score, qa.total_questions, qa.percent, qa.taken_at
     FROM quiz_attempts qa
     JOIN flashcard_sets s ON s.id = qa.set_id
     WHERE qa.user_id = ?
     ORDER BY qa.taken_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  return res.json({ history: rows });
});

// ── GET /api/quiz/history/:set_id  (attempts for one set) ────────────────────
router.get('/history/:set_id',
  [param('set_id').isInt({ gt: 0 })],
  validate,
  async (req, res) => {
    const [rows] = await db.execute(
      `SELECT qa.id, qa.score, qa.total_questions, qa.percent, qa.taken_at
       FROM quiz_attempts qa
       WHERE qa.user_id = ? AND qa.set_id = ?
       ORDER BY qa.taken_at DESC`,
      [req.user.id, req.params.set_id]
    );
    return res.json({ history: rows });
  }
);

// ── GET /api/quiz/attempts/:id  (single attempt with per-card breakdown) ──────
router.get('/attempts/:id',
  [param('id').isInt({ gt: 0 })],
  validate,
  async (req, res) => {
    const [attempts] = await db.execute(
      `SELECT qa.*, s.title AS set_name
       FROM quiz_attempts qa
       JOIN flashcard_sets s ON s.id = qa.set_id
       WHERE qa.id = ? AND qa.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!attempts.length) return res.status(404).json({ error: 'Attempt not found' });

    const [answers] = await db.execute(
      `SELECT aa.card_id, c.question, c.answer AS correct_answer,
              aa.user_answer, aa.is_correct
       FROM attempt_answers aa
       JOIN cards c ON c.id = aa.card_id
       WHERE aa.attempt_id = ?`,
      [req.params.id]
    );

    return res.json({ attempt: attempts[0], answers });
  }
);

// ── GET /api/quiz/stats  (aggregate stats per set) ───────────────────────────
router.get('/stats', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT qa.set_id, s.title AS set_name,
            COUNT(*)            AS attempts,
            AVG(qa.percent)     AS avg_percent,
            MAX(qa.percent)     AS best_percent,
            MAX(qa.taken_at)    AS last_taken
     FROM quiz_attempts qa
     JOIN flashcard_sets s ON s.id = qa.set_id
     WHERE qa.user_id = ?
     GROUP BY qa.set_id, s.title
     ORDER BY last_taken DESC`,
    [req.user.id]
  );
  return res.json({ stats: rows });
});

module.exports = router;
