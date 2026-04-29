// js/dashboard.js – loads flashcard sets, handles search, logout, and delete

(function () {
  if (!NC.requireAuth()) return;

  const container  = document.getElementById('sets-container');
  const emptyMsg   = document.getElementById('empty-msg');
  const searchInput = document.getElementById('searchInput');
  const logoutBtn  = document.getElementById('logoutBtn');

  // ── Greeting ──────────────────────────────────────────────────────────────────
  const user = NC.Auth.user;
  if (user) {
    const header = document.querySelector('.dashboard-header h2');
    if (header) {
      const first = user.full_name ? user.full_name.split(' ')[0] : '';
      header.textContent = first ? `Hey ${first}, your sets` : 'My Flashcard Sets';
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderSets(sets) {
    // Clear everything except the empty-msg paragraph
    Array.from(container.children).forEach(child => {
      if (child.id !== 'empty-msg') child.remove();
    });

    if (!sets.length) {
      emptyMsg.classList.remove('hidden');
      return;
    }
    emptyMsg.classList.add('hidden');

    sets.forEach(set => {
      const card = document.createElement('div');
      card.className = 'set-card';
      card.dataset.id = set.id;
      card.innerHTML = `
        <h3>${escHtml(set.title)}</h3>
        <p class="meta">
          ${set.card_count} card${set.card_count !== 1 ? 's' : ''}
          ${set.ai_generated ? ' · ✨ AI' : ''}
          · Updated ${formatDate(set.updated_at)}
        </p>
        <div class="set-card-actions">
          <a href="study.html?id=${set.id}"  class="btn btn-primary btn-sm">Study</a>
          <a href="quiz.html?id=${set.id}"   class="btn btn-secondary btn-sm">Quiz</a>
          <a href="edit_set.html?id=${set.id}" class="btn btn-ghost btn-sm">Edit</a>
          <button class="btn btn-ghost btn-sm delete-btn" data-id="${set.id}">Delete</button>
        </div>
      `;
      container.appendChild(card);
    });

    // Wire up delete buttons
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(parseInt(btn.dataset.id)));
    });
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Load sets ─────────────────────────────────────────────────────────────────
  async function loadSets(search = '') {
    container.innerHTML = '<p style="color:var(--text-light);padding:20px">Loading…</p>';
    try {
      const { sets } = await NC.SetsAPI.list(search);
      // Re-append emptyMsg since we wiped innerHTML
      if (!document.getElementById('empty-msg')) {
        const p = document.createElement('p');
        p.id = 'empty-msg';
        p.className = 'hidden';
        p.textContent = 'No flashcard sets yet. Create one to get started!';
        container.appendChild(p);
      }
      renderSets(sets);
    } catch (err) {
      container.innerHTML = `<p class="error-msg">Failed to load sets: ${err.message}</p>`;
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!confirm('Delete this set? This cannot be undone.')) return;
    try {
      await NC.SetsAPI.delete(id);
      const card = container.querySelector(`.set-card[data-id="${id}"]`);
      if (card) card.remove();
      // Show empty message if nothing left
      const remaining = container.querySelectorAll('.set-card');
      if (!remaining.length) {
        const em = document.getElementById('empty-msg');
        if (em) em.classList.remove('hidden');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────────
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadSets(searchInput.value.trim()), 300);
  });

  // ── Logout ─────────────────────────────────────────────────────────────────────
  logoutBtn.addEventListener('click', () => NC.AuthAPI.logout());

  // ── Init ──────────────────────────────────────────────────────────────────────
  loadSets();
})();
