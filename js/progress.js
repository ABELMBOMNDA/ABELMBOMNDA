// js/progress.js – quiz history and per-set aggregate stats

(function () {
  if (!NC.requireAuth()) return;

  const historyContainer = document.getElementById('history-container');
  const noHistory        = document.getElementById('no-history');

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function scoreColor(pct) {
    if (pct >= 80) return 'var(--success)';
    if (pct >= 60) return '#f59e0b';
    return 'var(--error)';
  }

  // ── Render stats summary ──────────────────────────────────────────────────────
  function renderStats(stats) {
    if (!stats.length) return;

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:36px;';
    section.innerHTML = `<h3 style="margin-bottom:16px;">Performance by Set</h3>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;';

    stats.forEach(s => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--white);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);border:1px solid var(--border);';
      card.innerHTML = `
        <p style="font-weight:700;margin-bottom:8px;font-size:15px;">${escHtml(s.set_name)}</p>
        <p style="font-size:13px;color:var(--text-light);margin-bottom:4px;">${s.attempts} attempt${s.attempts !== 1 ? 's' : ''}</p>
        <p style="font-size:13px;color:var(--text-light);">Avg: <strong style="color:${scoreColor(s.avg_percent)}">${parseFloat(s.avg_percent).toFixed(0)}%</strong>
          &nbsp;Best: <strong style="color:${scoreColor(s.best_percent)}">${parseFloat(s.best_percent).toFixed(0)}%</strong></p>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    historyContainer.appendChild(section);
  }

  // ── Render history list ───────────────────────────────────────────────────────
  function renderHistory(history) {
    if (!history.length) return;

    const section = document.createElement('div');
    section.innerHTML = `<h3 style="margin-bottom:16px;">Recent Attempts</h3>`;

    const list = document.createElement('div');
    list.className = 'history-list';

    history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div>
          <p class="set-name">${escHtml(item.set_name)}</p>
          <p class="taken-at">${formatDate(item.taken_at)}</p>
        </div>
        <div style="text-align:right;">
          <p class="score-badge" style="color:${scoreColor(item.percent)}">
            ${item.score}/${item.total_questions}
          </p>
          <p style="font-size:13px;color:var(--text-light);">${parseFloat(item.percent).toFixed(0)}%</p>
        </div>
      `;
      list.appendChild(row);
    });

    section.appendChild(list);
    historyContainer.appendChild(section);
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  async function load() {
    historyContainer.innerHTML = '<p style="color:var(--text-light);">Loading…</p>';
    try {
      const [{ history }, { stats }] = await Promise.all([
        NC.QuizAPI.getHistory(),
        NC.QuizAPI.getStats(),
      ]);

      historyContainer.innerHTML = '';

      if (!history.length) {
        noHistory.classList.remove('hidden');
        return;
      }

      renderStats(stats);
      renderHistory(history);
    } catch (err) {
      historyContainer.innerHTML = `<p class="error-msg">Failed to load progress: ${err.message}</p>`;
    }
  }

  load();
})();
