# NeuralCards API Documentation

**Base URL:** `http://localhost:3000/api`  
**Auth:** JWT Bearer tokens. Include `Authorization: Bearer <access_token>` on protected routes.  
**Content-Type:** `application/json` for all requests and responses.

---

## Authentication

### POST `/auth/register`
Create a new account.

**Body**
```json
{ "full_name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
```
**Response 201**
```json
{
  "user": { "id": 1, "full_name": "Jane Doe", "email": "jane@example.com" },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

---

### POST `/auth/login`
**Body:** `{ "email", "password" }`  
**Response 200:** Same shape as register.

---

### POST `/auth/refresh`
Rotate tokens. Old refresh token is revoked.

**Body:** `{ "refresh_token": "eyJ..." }`  
**Response 200:** `{ "access_token": "...", "refresh_token": "..." }`

---

### POST `/auth/logout` 🔒
Revokes the supplied refresh token.

**Body:** `{ "refresh_token": "eyJ..." }`  
**Response 200:** `{ "message": "Logged out" }`

---

### POST `/auth/forgot-password`
Sends a password-reset email. Always returns 200 to prevent email enumeration.

**Body:** `{ "email": "jane@example.com" }`

---

### POST `/auth/reset-password`
**Body:** `{ "token": "uuid-from-email", "password": "newSecret123" }`  
**Response 200:** `{ "message": "Password updated. Please log in." }`

---

### GET `/auth/me` 🔒
Returns the authenticated user's profile.

**Response 200:** `{ "user": { "id", "full_name", "email", "created_at" } }`

---

## Flashcard Sets 🔒

### GET `/sets`
List all sets for the authenticated user.

**Query params:** `?search=biology`  
**Response 200:**
```json
{
  "sets": [
    { "id": 1, "title": "Biology Ch3", "description": "", "ai_generated": 0,
      "card_count": 12, "created_at": "...", "updated_at": "..." }
  ]
}
```

---

### POST `/sets`
Create a new set with cards.

**Body**
```json
{
  "title": "Biology Ch3",
  "description": "Cell biology basics",
  "ai_generated": false,
  "cards": [
    { "question": "What is mitosis?", "answer": "Cell division producing two identical daughter cells." }
  ]
}
```
**Response 201:** `{ "set": { "id", "title", "description", "ai_generated", "created_at" } }`

---

### GET `/sets/:id`
Get a single set with all its cards.

**Response 200:**
```json
{
  "set": { "id": 1, "title": "...", ... },
  "cards": [
    { "id": 5, "question": "...", "answer": "...", "position": 0 }
  ]
}
```

---

### PUT `/sets/:id`
Replace a set's metadata and cards entirely.

**Body:** Same shape as POST `/sets`.  
**Response 200:** `{ "message": "Set updated" }`

---

### DELETE `/sets/:id`
**Response 200:** `{ "message": "Set deleted" }`

---

## Quiz 🔒

### POST `/quiz/attempts`
Submit a completed quiz attempt.

**Body**
```json
{
  "set_id": 1,
  "answers": [
    { "card_id": 5, "user_answer": "mitosis", "is_correct": true },
    { "card_id": 6, "user_answer": "wrong",   "is_correct": false }
  ]
}
```
**Response 201:**
```json
{ "attempt_id": 3, "score": 1, "total": 2, "percent": 50.00 }
```

---

### GET `/quiz/history`
All quiz attempts for the current user, newest first (max 100).

**Response 200:**
```json
{
  "history": [
    { "id": 3, "set_id": 1, "set_name": "Biology Ch3",
      "score": 8, "total_questions": 10, "percent": 80.00, "taken_at": "..." }
  ]
}
```

---

### GET `/quiz/history/:set_id`
Attempts filtered to a single set.

---

### GET `/quiz/attempts/:id`
Full attempt detail with per-question breakdown.

**Response 200:**
```json
{
  "attempt": { "id": 3, "score": 8, "total_questions": 10, "percent": 80, ... },
  "answers": [
    { "card_id": 5, "question": "...", "correct_answer": "...",
      "user_answer": "...", "is_correct": 1 }
  ]
}
```

---

### GET `/quiz/stats`
Aggregate stats (attempts, avg %, best %) per set.

---

## AI Generation 🔒

### POST `/ai/generate`
Generate flashcards from raw notes using Claude.

**Body**
```json
{ "notes": "Mitosis is the process of...", "count": 10 }
```
- `count` — number of cards to generate (3–30, default 10)

**Response 200:**
```json
{
  "cards": [
    { "question": "What are the phases of mitosis?",
      "answer": "Prophase, Metaphase, Anaphase, Telophase" }
  ]
}
```

> After reviewing, save the cards via `POST /sets` with `"ai_generated": true`.

---

## Health Check

### GET `/health`
`{ "status": "ok", "ts": "2025-..." }`

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request |
| 401 | Missing / expired token |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Validation error — `{ "errors": [{ "msg": "...", "path": "..." }] }` |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Rate Limits

| Route group | Limit |
|-------------|-------|
| `/api/*` | 200 req / 15 min |
| `/api/auth/*` | 20 req / 15 min |
| `/api/ai/*` | 10 req / hour |

---

## Setup

```bash
# 1. Create database
mysql -u root -p < sql/schema.sql

# 2. Configure environment
cd backend
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, SMTP, Anthropic key

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
```

Include `api-client.js` in every frontend page before your page scripts:
```html
<script src="js/api.js"></script>
```

Then use the global `NC` object:
```js
// Login
const { user } = await NC.AuthAPI.login(email, password);

// Load sets
const { sets } = await NC.SetsAPI.list();

// Generate AI cards
const { cards } = await NC.AIAPI.generate(notesText, 10);

// Submit quiz
await NC.QuizAPI.submitAttempt(setId, answers);
```
