// js/api.js  – NeuralCards frontend API client
// Place this in your frontend /js/ directory and include before other scripts.

const API_BASE = 'http://beautiful-unity-production-f9a1.up.railway.app/api'; // ← update for production

// ── Token storage ─────────────────────────────────────────────────────────────
const Auth = {
  get accessToken()  { return localStorage.getItem('nc_access'); },
  get refreshToken() { return localStorage.getItem('nc_refresh'); },
  get user()         { return JSON.parse(localStorage.getItem('nc_user') || 'null'); },

  save(data) {
    localStorage.setItem('nc_access',  data.access_token);
    localStorage.setItem('nc_refresh', data.refresh_token);
    localStorage.setItem('nc_user',    JSON.stringify(data.user));
  },
  clear() {
    localStorage.removeItem('nc_access');
    localStorage.removeItem('nc_refresh');
    localStorage.removeItem('nc_user');
  },
  isLoggedIn() { return !!this.accessToken; },
};

// ── Core fetch with auto-refresh ──────────────────────────────────────────────
let _refreshing = null; // singleton promise to avoid parallel refresh calls

async function apiFetch(path, options = {}) {
  const makeRequest = (token) =>
    fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res = await makeRequest(Auth.accessToken);

  // Auto-refresh on 401
  if (res.status === 401 && Auth.refreshToken) {
    if (!_refreshing) {
      _refreshing = fetch(`/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: Auth.refreshToken }),
      })
        .then(async r => {
          if (!r.ok) throw new Error('Refresh failed');
          const data = await r.json();
          Auth.save({ ...data, user: Auth.user }); // keep user object
          return data.access_token;
        })
        .catch(() => {
          Auth.clear();
          window.location.href = '/pages/login.html';
        })
        .finally(() => { _refreshing = null; });
    }

    const newToken = await _refreshing;
    if (newToken) res = await makeRequest(newToken);
  }

  // Parse JSON (even errors)
  const ct   = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (typeof data === 'object' ? data.error || data.errors?.[0]?.msg : data) || res.statusText;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }

  return data;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
const AuthAPI = {
  async register(full_name, email, password) {
    const data = await apiFetch('/auth/register', { method: 'POST', body: { full_name, email, password } });
    Auth.save(data);
    return data;
  },
  async login(email, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    Auth.save(data);
    return data;
  },
  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST', body: { refresh_token: Auth.refreshToken } });
    } finally {
      Auth.clear();
      window.location.href = '/pages/login.html';
    }
  },
  async forgotPassword(email) {
    return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } });
  },
  async resetPassword(token, password) {
    return apiFetch('/auth/reset-password', { method: 'POST', body: { token, password } });
  },
};

// ── Sets API ──────────────────────────────────────────────────────────────────
const SetsAPI = {
  list(search = '')   { return apiFetch(`/sets${search ? `?search=${encodeURIComponent(search)}` : ''}`); },
  get(id)             { return apiFetch(`/sets/${id}`); },
  create(payload)     { return apiFetch('/sets',     { method: 'POST',   body: payload }); },
  update(id, payload) { return apiFetch(`/sets/${id}`, { method: 'PUT', body: payload }); },
  delete(id)          { return apiFetch(`/sets/${id}`, { method: 'DELETE' }); },
};

// ── Quiz API ──────────────────────────────────────────────────────────────────
const QuizAPI = {
  submitAttempt(set_id, answers) {
    return apiFetch('/quiz/attempts', { method: 'POST', body: { set_id, answers } });
  },
  getHistory()         { return apiFetch('/quiz/history'); },
  getSetHistory(setId) { return apiFetch(`/quiz/history/${setId}`); },
  getAttempt(id)       { return apiFetch(`/quiz/attempts/${id}`); },
  getStats()           { return apiFetch('/quiz/stats'); },
};

// ── AI API ────────────────────────────────────────────────────────────────────
const AIAPI = {
  generate(notes, count = 10) {
    return apiFetch('/ai/generate', { method: 'POST', body: { notes, count } });
  },
};

// ── Guard: redirect to login if not authenticated ─────────────────────────────
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

// ── Guard: redirect to dashboard if already authenticated ────────────────────
function redirectIfAuthed() {
  if (Auth.isLoggedIn()) {
    window.location.href = '/pages/dashboard.html';
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
window.NC = { Auth, AuthAPI, SetsAPI, QuizAPI, AIAPI, requireAuth, redirectIfAuthed };
