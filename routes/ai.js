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
    body('true_false').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    const { notes, count = 10, true_false = false } = req.body;

    const systemPrompt = true_false
      ? `You are a study assistant that generates True/False flashcards from notes.
Return ONLY valid JSON with no markdown or extra text.
Format: { "cards": [ { "question": "...", "answer": "True", "explanation": "..." }, ... ] }
Rules:
- Generate exactly ${count} cards (or fewer if the notes don't support more)
- Each question must be a declarative statement that is either factually correct or incorrect
- The answer must be exactly the string "True" or exactly the string "False" — nothing else
- The explanation must be 1–2 sentences explaining why the statement is true or false
- Cover the most important concepts in the notes`
      : `You are a study assistant that converts raw notes into flashcards.
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

    if (true_false) {
      for (const card of parsed.cards) {
        const normalized = String(card.answer).trim().toLowerCase();
        if (normalized === 'true')       card.answer = 'True';
        else if (normalized === 'false') card.answer = 'False';
        else return res.status(502).json({ error: 'AI returned a non-True/False answer', raw });
      }
    }

    return res.json({ cards: parsed.cards });
  }
);

module.exports = router;
