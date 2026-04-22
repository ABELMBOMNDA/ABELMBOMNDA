// js/create_set.js – create a new flashcard set

(function () {
  if (!NC.requireAuth()) return;

  const errorMsg  = document.getElementById('error-msg');
  const addCardBtn = document.getElementById('addCardBtn');
  const saveSetBtn = document.getElementById('saveSetBtn');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideError() { errorMsg.classList.add('hidden'); }

  // Start with two blank cards
  CardsEditor.reset();
  CardsEditor.addCard();
  CardsEditor.addCard();

  // ── Add card ──────────────────────────────────────────────────────────────────
  addCardBtn.addEventListener('click', () => {
    CardsEditor.addCard();
    // Focus the new question field
    const rows = document.querySelectorAll('.card-row');
    const last = rows[rows.length - 1];
    if (last) last.querySelector('.card-question').focus();
  });

  // ── Save ──────────────────────────────────────────────────────────────────────
  saveSetBtn.addEventListener('click', async () => {
    hideError();
    const title = document.getElementById('setTitle').value.trim();
    const desc  = document.getElementById('setDesc').value.trim();
    if (!title) { showError('Please enter a set title.'); return; }

    const cards = CardsEditor.getCards();
    if (!cards.length) { showError('Please add at least one card.'); return; }

    const blank = cards.find(c => !c.question || !c.answer);
    if (blank) { showError('All cards must have both a question and an answer.'); return; }

    saveSetBtn.disabled = true;
    saveSetBtn.textContent = 'Saving…';
    try {
      await NC.SetsAPI.create({ title, description: desc, cards, ai_generated: false });
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message || 'Failed to save set. Please try again.');
      saveSetBtn.disabled = false;
      saveSetBtn.textContent = 'Save Set';
    }
  });
})();
