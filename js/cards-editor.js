// js/cards-editor.js – shared card row builder used by create_set and edit_set pages

window.CardsEditor = (function () {
  let cardCount = 0;

  // ── Build one card row ────────────────────────────────────────────────────────
  function buildRow(question = '', answer = '') {
    cardCount++;
    const num = cardCount;
    const row = document.createElement('div');
    row.className = 'card-row';
    row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;';
    row.innerHTML = `
      <div style="flex:1">
        <div class="form-group" style="margin-bottom:8px;">
          <label>Question ${num}</label>
          <input type="text" class="card-question" placeholder="Question…" value="${escHtml(question)}" required/>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Answer ${num}</label>
          <input type="text" class="card-answer" placeholder="Answer…" value="${escHtml(answer)}" required/>
        </div>
      </div>
      <button type="button" class="btn btn-ghost btn-sm remove-card-btn"
        style="margin-top:26px;flex-shrink:0;"
        title="Remove card">✕</button>
    `;
    row.querySelector('.remove-card-btn').addEventListener('click', () => {
      row.remove();
      renumberRows();
    });
    return row;
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renumberRows() {
    const container = document.getElementById('cards-container');
    if (!container) return;
    container.querySelectorAll('.card-row').forEach((row, i) => {
      row.querySelector('label:first-of-type').textContent = `Question ${i + 1}`;
      row.querySelector('label:last-of-type').textContent  = `Answer ${i + 1}`;
    });
    cardCount = container.querySelectorAll('.card-row').length;
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  function addCard(question, answer) {
    const container = document.getElementById('cards-container');
    container.appendChild(buildRow(question, answer));
  }

  function getCards() {
    const container = document.getElementById('cards-container');
    const rows = container.querySelectorAll('.card-row');
    const cards = [];
    rows.forEach(row => {
      const q = row.querySelector('.card-question').value.trim();
      const a = row.querySelector('.card-answer').value.trim();
      if (q || a) cards.push({ question: q, answer: a });
    });
    return cards;
  }

  function reset() {
    cardCount = 0;
    const container = document.getElementById('cards-container');
    if (container) container.innerHTML = '';
  }

  return { addCard, getCards, reset };
})();
