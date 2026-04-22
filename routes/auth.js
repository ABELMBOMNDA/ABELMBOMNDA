// backend/routes/auth.js
const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { body }   = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const db           = require('../config/db');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

async function storeRefreshToken(userId, rawToken) {
  const hash      = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
  await db.execute(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, hash, expiresAt]
  );
}

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be ≥ 8 chars'),
  ],
  validate,
  async (req, res) => {
    const { full_name, email, password } = req.body;

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const rounds       = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, rounds);

    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, password_hash]
    );
    const user = { id: result.insertId, email };

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await storeRefreshToken(user.id, refreshToken);

    return res.status(201).json({
      user:          { id: user.id, full_name, email },
      access_token:  accessToken,
      refresh_token: refreshToken,
    });
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    const [rows] = await db.execute(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await storeRefreshToken(user.id, refreshToken);

    return res.json({
      user:          { id: user.id, full_name: user.full_name, email: user.email },
      access_token:  accessToken,
      refresh_token: refreshToken,
    });
  }
);

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  let payload;
  try {
    payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const [rows] = await db.execute(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW()`,
    [hash]
  );
  if (!rows.length) return res.status(401).json({ error: 'Refresh token revoked or expired' });

  // Rotate: revoke old, issue new
  await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [hash]);

  const [userRows] = await db.execute('SELECT id, email FROM users WHERE id = ?', [payload.sub]);
  const user = userRows[0];
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newAccess  = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  await storeRefreshToken(user.id, newRefresh);

  return res.json({ access_token: newAccess, refresh_token: newRefresh });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [hash]);
  }
  return res.json({ message: 'Logged out' });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    const { email } = req.body;
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);

    // Always return 200 to avoid email enumeration
    if (!rows.length) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token   = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expires, rows[0].id]
    );

    const resetUrl = `${process.env.APP_URL}/pages/reset_password.html?token=${token}`;
    await mailer.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: 'NeuralCards – Password Reset',
      html:    `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    });

    return res.json({ message: 'If that email exists, a reset link was sent.' });
  }
);

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  async (req, res) => {
    const { token, password } = req.body;
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Token invalid or expired' });

    const rounds        = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash  = await bcrypt.hash(password, rounds);

    await db.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, rows[0].id]
    );
    // Revoke all refresh tokens for security
    await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [rows[0].id]);

    return res.json({ message: 'Password updated. Please log in.' });
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, full_name, email, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: rows[0] });
});

module.exports = router;
