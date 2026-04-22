// js/generate_set.js – AI flashcard generation: paste notes → review cards → save

(function () {
  if (!NC.requireAuth()) return;

  const stepInput    = document.getElementById('step-input');
  const stepReview   = document.getElementById('step-review');
  const errorMsg     = document.getElementById('error-msg');
  const generateBtn  = document.getElementById('generateBtn');
  const loadingEl    = document.getElementById('loading');
  const genContainer = document.getElementById('generated-cards-container');
  const saveBtn      = document.getElementById('saveGeneratedBtn');
  const regenBtn     = document.getElementById('regenerateBtn');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  }
  function hideError() { errorMsg.classList.add('hidden'); }

  // ── Step 1: Generate ──────────────────────────────────────────────────────────
  generateBtn.addEventListener('click', async () => {
    hideError();
    const title = document.getElementById('setTitle').value.trim();
    const notes = document.getElementById('notesInput').value.trim();
    if (!title) { showError('Please enter a set title.'); return; }
    if (notes.length < 50) { showError('Please paste at least a few sentences of notes.'); return; }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';
    loadingEl.classList.remove('hidden');

    try {
      const { cards } = await NC.AIAPI.generate(notes, 10);
      renderPreview(cards);
      stepInput.classList.add('hidden');
      stepReview.classList.remove('hidden');
    } catch (err) {
      showError(err.message || 'Generation failed. Please try again.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Flashcards';
      loadingEl.classList.add('hidden');
    }
  });

  // ── Step 2: Render editable preview ───────────────────────────────────────────
  function renderPreview(cards) {
    genContainer.innerHTML = '';
    cards.forEach((card, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;';
      row.innerHTML = `
        <div style="flex:1">
          <div class="form-group" style="margin-bottom:8px;">
            <label>Question ${i + 1}</label>
            <input type="text" class="gen-question" value="${escHtml(card.question)}" required/>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Answer ${i + 1}</label>
            <input type="text" class="gen-answer" value="${escHtml(card.answer)}" required/>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm"
          style="margin-top:26px;flex-shrink:0;" title="Remove">✕</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        row.remove();
        renumberGenRows();
      });
      genContainer.appendChild(row);
    });
  }

  function renumberGenRows() {
    genContainer.querySelectorAll('div > div > div').forEach((group, i) => {
      // Each wrapper has 2 form-groups; renumber their labels
    });
    // Simple renumber by re-querying
    const rows = genContainer.children;
    Array.from(rows).forEach((row, i) => {
      const labels = row.querySelectorAll('label');
      if (labels[0]) labels[0].textContent = `Question ${i + 1}`;
      if (labels[1]) labels[1].textContent = `Answer ${i + 1}`;
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getReviewCards() {
    const rows = genContainer.querySelectorAll('div');
    const cards = [];
    // Each direct child of genContainer is a row
    Array.from(genContainer.children).forEach(row => {
      const q = row.querySelector('.gen-question')?.value.trim();
      const a = row.querySelector('.gen-answer')?.value.trim();
      if (q && a) cards.push({ question: q, answer: a });
    });
    return cards;
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('setTitle').value.trim();
    const cards = getReviewCards();
    if (!cards.length) { alert('No cards to save.'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await NC.SetsAPI.create({ title, description: '', cards, ai_generated: true });
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Failed to save: ' + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Set';
    }
  });

  // ── Regenerate: go back to step 1 ────────────────────────────────────────────
  regenBtn.addEventListener('click', () => {
    stepReview.classList.add('hidden');
    stepInput.classList.remove('hidden');
    genContainer.innerHTML = '';
  });
})();
