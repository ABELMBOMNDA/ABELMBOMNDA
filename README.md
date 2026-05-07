# 🧠 NeuralCards

AI-powered flashcard study app built for COSC 412 – Software Engineering, Towson University.

Students can manually create flashcard sets, generate them automatically from notes using the ChatGPT API, quiz themselves, and track their progress over time.

You can access the project at <https://neuralcards.ndy.sh>

---

## Team Members

- Fortune Okogun
- Abel Mbomnda
- Andreas Papacharalampous
- Judelle Talabert
- Ethan Duyani Atembina Reis

---

## Tech Stack

**Backend:** Node.js · Express · MySQL · JWT Authentication · OpenAI API  
**Frontend:** Vanilla HTML · CSS · JavaScript (no build step required)

---

## Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org) v18 or higher
- [MySQL](https://dev.mysql.com/downloads/mysql/) v8 or higher
- [VS Code](https://code.visualstudio.com) with the **Live Server** extension

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/ABELMBOMNDA/ABELMBOMNDA
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

```bash
copy .env.example .env
```

Then open `.env` and fill in your values:

```env
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=any_long_random_string
JWT_REFRESH_SECRET=a_different_long_random_string
OPENAI_API_KEY=sk-your-openai-key-here
CORS_ORIGINS=http://localhost:3000
```


### 4. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS neuralcards;"
```

Enter your MySQL root password when prompted.

### 5. Run the migration

```bash
npm run migrate
```

You should see: `✅  Database migrated successfully.`

### 6. Start the backend server

```bash
npm run dev
```

You should see: `🚀  NeuralCards API running on http://localhost:3000`

Leave this terminal running while you use the app.

### 7. Open the frontend

Visit `http://localhost:3000/pages/login.html` to login to the app.

---

## Project Structure

```
neuralcards/
├── server.js               # Express entry point
├── schema.sql              # MySQL schema
├── package.json
├── .env.example            # Copy to .env and fill in your values
├── .gitignore
├── config/
│   └── db.js               # MySQL connection pool
├── middleware/
│   ├── auth.js             # JWT token verification
│   └── validate.js         # Request validation error handler
├── routes/
│   ├── auth.js             # /api/auth/*
│   ├── sets.js             # /api/sets/*
│   ├── quiz.js             # /api/quiz/*
│   └── ai.js               # /api/ai/generate
├── scripts/
│   └── migrate.js          # Runs schema.sql to set up the database
├── css/                    # Stylesheets
├── js/                     # Frontend JavaScript
└── pages/                  # HTML pages
```

---

## Pages

| Page | Description |
|---|---|
| `pages/login.html` | Sign in |
| `pages/register.html` | Create account |
| `pages/dashboard.html` | View and manage flashcard sets |
| `pages/create_set.html` | Manually create a set |
| `pages/edit_set.html?id=` | Edit an existing set |
| `pages/generate_set.html` | Generate flashcards from notes using ChatGPT |
| `pages/study.html?id=` | Flip-card study mode |
| `pages/quiz.html?id=` | Take a quiz |
| `pages/results.html?id=` | View quiz results |
| `pages/progress.html` | Quiz history and stats |

---

## Troubleshooting

**`npm run migrate` fails** — Check that `DB_PASSWORD` in your `.env` matches your MySQL root password.

**`npm run dev` fails with "Cannot find module"** — Make sure you ran `npm install` and are inside the `neuralcards/` folder.

**CORS error in browser** — Make sure the backend is running and `CORS_ORIGINS=http://127.0.0.1:5500` is in your `.env`.

**AI generation doesn't work** — Check that `OPENAI_API_KEY` in your `.env` is valid. Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
