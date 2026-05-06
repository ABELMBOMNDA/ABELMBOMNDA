// js/cards-editor.js – shared card row builder used by create_set and edit_set pages

window.CardsEditor = (function () {
  let cardCount = 0;
  let tfMode    = false;

  // ── Build one card row ────────────────────────────────────────────────────────
  function buildRow(question = '', answer = '', explanation = '') {
    cardCount++;
    const num = cardCount;
    const row = document.createElement('div');
    row.className = 'card-row';
    row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;';

    const answerSection = tfMode
      ? `<div class="form-group" style="margin-bottom:8px;">
           <label>Answer ${num}</label>
           <div class="tf-toggle">
             <button type="button" class="tf-opt${answer === 'False' ? '' : ' tf-selected'}" data-val="True">True</button>
             <button type="button" class="tf-opt${answer === 'False' ? ' tf-selected' : ''}" data-val="False">False</button>
             <input type="hidden" class="card-answer" value="${answer === 'False' ? 'False' : 'True'}"/>
           </div>
         </div>
         <div class="form-group" style="margin-bottom:0">
           <label>Explanation ${num}</label>
           <textarea class="card-explanation" placeholder="Explain why this is true or false…" rows="2">${escHtml(explanation)}</textarea>
         </div>`
      : `<div class="form-group" style="margin-bottom:0">
           <label>Answer ${num}</label>
           <input type="text" class="card-answer" placeholder="Answer…" value="${escHtml(answer)}" required/>
         </div>`;

    row.innerHTML = `
      <div style="flex:1">
        <div class="form-group" style="margin-bottom:8px;">
          <label>Question ${num}</label>
          <input type="text" class="card-question" placeholder="Question…" value="${escHtml(question)}" required/>
        </div>
        ${answerSection}
      </div>
      <button type="button" class="btn btn-ghost btn-sm remove-card-btn"
        style="margin-top:26px;flex-shrink:0;"
        title="Remove card">✕</button>
    `;

    // Wire up TF toggle buttons
    if (tfMode) {
      const opts    = row.querySelectorAll('.tf-opt');
      const hidden  = row.querySelector('.card-answer');
      opts.forEach(btn => {
        btn.addEventListener('click', () => {
          opts.forEach(b => b.classList.remove('tf-selected'));
          btn.classList.add('tf-selected');
          hidden.value = btn.dataset.val;
        });
      });
    }

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
      // FIX: scope label search inside each row individually
      // label:first-of-type and label:last-of-type don't scope to the row —
      // they match across all siblings in the parent, causing wrong labels.
      // querySelectorAll('label') scoped to the row always finds exactly two labels.
      const labels = row.querySelectorAll('label');
      labels[0].textContent = `Question ${i + 1}`;
      labels[1].textContent = `Answer ${i + 1}`;
      if (tfMode && labels[2]) labels[2].textContent = `Explanation ${i + 1}`;
    });
    cardCount = container.querySelectorAll('.card-row').length;
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  function setMode(isTrueFalse) {
    tfMode = isTrueFalse;
    const container = document.getElementById('cards-container');
    if (container) container.innerHTML = '';
    cardCount = 0;
  }

  function addCard(question, answer, explanation) {
    const container = document.getElementById('cards-container');
    container.appendChild(buildRow(question, answer, explanation));
  }

  function getCards() {
    const container = document.getElementById('cards-container');
    const rows = container.querySelectorAll('.card-row');
    const cards = [];
    rows.forEach(row => {
      const q = row.querySelector('.card-question').value.trim();
      const a = row.querySelector('.card-answer').value.trim();
      if (tfMode) {
        const e = row.querySelector('.card-explanation').value.trim();
        if (q || a) cards.push({ question: q, answer: a, explanation: e });
      } else {
        if (q || a) cards.push({ question: q, answer: a });
      }
    });
    return cards;
  }

  function reset() {
    cardCount = 0;
    tfMode    = false;
    const container = document.getElementById('cards-container');
    if (container) container.innerHTML = '';
  }

  return { addCard, getCards, reset, setMode };
})();
