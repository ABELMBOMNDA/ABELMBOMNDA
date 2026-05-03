// js/edit_set.js – load an existing set and save changes

(function () {
  if (!NC.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const setId  = parseInt(params.get('id'));
  if (!setId) { window.location.href = 'dashboard.html'; return; }

  const errorMsg      = document.getElementById('error-msg');
  const addCardBtn    = document.getElementById('addCardBtn');
  const saveSetBtn    = document.getElementById('saveSetBtn');
  const tfIndicator   = document.getElementById('tfModeIndicator');

  let currentTfMode = false;

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideError() { errorMsg.classList.add('hidden'); }

  // ── Load existing set ──────────────────────────────────────────────────────────
  async function load() {
    try {
      const data = await NC.SetsAPI.get(setId);
      document.getElementById('setTitle').value = data.set.title;
      document.getElementById('setDesc').value  = data.set.description || '';
      document.title = `Edit: ${data.set.title} – NeuralCards`;

      currentTfMode = !!data.set.true_false_mode;

      if (currentTfMode) {
        tfIndicator.classList.remove('hidden');
        CardsEditor.setMode(true);
      } else {
        CardsEditor.reset();
      }

      if (data.cards.length) {
        data.cards.forEach(c => CardsEditor.addCard(c.question, c.answer, c.explanation || ''));
      } else {
        CardsEditor.addCard();
      }
    } catch (err) {
      showError('Failed to load set: ' + err.message);
    }
  }

  // ── Add card ──────────────────────────────────────────────────────────────────
  addCardBtn.addEventListener('click', () => {
    CardsEditor.addCard();
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
      await NC.SetsAPI.update(setId, { title, description: desc, cards, true_false_mode: currentTfMode });
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError(err.message || 'Failed to save changes. Please try again.');
      saveSetBtn.disabled = false;
      saveSetBtn.textContent = 'Save Changes';
    }
  });

  load();
})();
