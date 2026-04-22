// backend/routes/ai.js
const express  = require('express');
const { body } = require('express-validator');
const OpenAI   = require('openai');

const { authenticate } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.use(authenticate);

// ── POST /api/ai/generate ─────────────────────────────────────────────────────
router.post('/generate',
  [
    body('notes').trim().notEmpty().withMessage('Notes text is required')
      .isLength({ max: 20000 }).withMessage('Notes too long (max 20 000 chars)'),
    body('count').optional().isInt({ min: 3, max: 30 })
      .withMessage('count must be 3–30'),
  ],
  validate,
  async (req, res) => {
    const { notes, count = 10 } = req.body;

    const systemPrompt = `You are a study assistant that converts raw notes into flashcards.
Return ONLY valid JSON with no markdown or extra text.
Format: { "cards": [ { "question": "...", "answer": "..." }, ... ] }
Rules:
- Generate exactly ${count} cards (or fewer if the notes don't support more)
- Questions should be specific and test real understanding
- Answers should be concise but complete
- Cover the most important concepts in the notes`;

    const completion = await client.chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Generate flashcards from these notes:\n\n${notes}` },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    let parsed;
    try {
      const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON', raw });
    }

    if (!Array.isArray(parsed.cards)) {
      return res.status(502).json({ error: 'Unexpected AI response shape', raw });
    }

    return res.json({ cards: parsed.cards });
  }
);

module.exports = router;
