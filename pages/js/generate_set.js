// js/generate_set.js – AI flashcard generation: paste notes → review cards → save

(function () {
  if (!NC.requireAuth()) return;

  const stepInput    = document.getElementById('step-input');
  const stepReview   = document.getElementById('step-review');
  const errorMsg     = document.getElementById('error-msg');
  const generateBtn  = document.getElementById('generateBtn');
  const tfToggle     = document.getElementById('tfModeToggle');
  const loadingEl    = document.getElementById('loading');
  const genContainer = document.getElementById('generated-cards-container');
  const saveBtn      = document.getElementById('saveGeneratedBtn');
  const regenBtn     = document.getElementById('regenerateBtn');

  let tfActive = false;

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  }
  function hideError() { errorMsg.classList.add('hidden'); }

  // ── TF mode toggle ────────────────────────────────────────────────────────────
  tfToggle.addEventListener('click', () => {
    tfActive = !tfActive;
    tfToggle.classList.toggle('btn-tf-mode-active', tfActive);
  });

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
      const { cards } = await NC.AIAPI.generate(notes, 10, tfActive);
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

      const answerSection = tfActive
        ? `<div class="form-group" style="margin-bottom:8px;">
             <label>Answer ${i + 1}</label>
             <div class="tf-toggle">
               <button type="button" class="tf-opt${card.answer === 'False' ? '' : ' tf-selected'}" data-val="True">True</button>
               <button type="button" class="tf-opt${card.answer === 'False' ? ' tf-selected' : ''}" data-val="False">False</button>
               <input type="hidden" class="gen-answer" value="${card.answer === 'False' ? 'False' : 'True'}"/>
             </div>
           </div>
           <div class="form-group" style="margin-bottom:0">
             <label>Explanation ${i + 1}</label>
             <textarea class="gen-explanation" rows="2" style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;">${escHtml(card.explanation || '')}</textarea>
           </div>`
        : `<div class="form-group" style="margin-bottom:0">
             <label>Answer ${i + 1}</label>
             <input type="text" class="gen-answer" value="${escHtml(card.answer)}" required/>
           </div>`;

      row.innerHTML = `
        <div style="flex:1">
          <div class="form-group" style="margin-bottom:8px;">
            <label>Question ${i + 1}</label>
            <input type="text" class="gen-question" value="${escHtml(card.question)}" required/>
          </div>
          ${answerSection}
        </div>
        <button type="button" class="btn btn-ghost btn-sm"
          style="margin-top:26px;flex-shrink:0;" title="Remove">✕</button>
      `;

      // Wire TF toggle buttons
      if (tfActive) {
        const opts   = row.querySelectorAll('.tf-opt');
        const hidden = row.querySelector('.gen-answer');
        opts.forEach(btn => {
          btn.addEventListener('click', () => {
            opts.forEach(b => b.classList.remove('tf-selected'));
            btn.classList.add('tf-selected');
            hidden.value = btn.dataset.val;
          });
        });
      }

      row.querySelector('button[title="Remove"]').addEventListener('click', () => {
        row.remove();
        renumberGenRows();
      });

      genContainer.appendChild(row);
    });
  }

  function renumberGenRows() {
    Array.from(genContainer.children).forEach((row, i) => {
      const labels = row.querySelectorAll('label');
      if (labels[0]) labels[0].textContent = `Question ${i + 1}`;
      if (labels[1]) labels[1].textContent = `Answer ${i + 1}`;
      if (tfActive && labels[2]) labels[2].textContent = `Explanation ${i + 1}`;
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getReviewCards() {
    const cards = [];
    Array.from(genContainer.children).forEach(row => {
      const q = row.querySelector('.gen-question')?.value.trim();
      const a = row.querySelector('.gen-answer')?.value.trim();
      if (q && a) {
        const card = { question: q, answer: a };
        if (tfActive) {
          card.explanation = row.querySelector('.gen-explanation')?.value.trim() || '';
        }
        cards.push(card);
      }
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
      await NC.SetsAPI.create({ title, description: '', cards, ai_generated: true, true_false_mode: tfActive });
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
