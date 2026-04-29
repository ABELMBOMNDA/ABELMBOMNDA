// js/study.js – flashcard flip, navigation, and shuffle

(function () {
  if (!NC.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const setId  = parseInt(params.get('id'));
  if (!setId) { window.location.href = 'dashboard.html'; return; }

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  const setTitleEl   = document.getElementById('setTitle');
  const cardCounter  = document.getElementById('cardCounter');
  const flipCard     = document.getElementById('flipCard');
  const questionText = document.getElementById('questionText');
  const answerText   = document.getElementById('answerText');
  const prevBtn      = document.getElementById('prevBtn');
  const nextBtn      = document.getElementById('nextBtn');
  const shuffleBtn   = document.getElementById('shuffleBtn');
  const quizLink     = document.getElementById('quizLink');

  // ── State ─────────────────────────────────────────────────────────────────────
  let cards   = [];
  let current = 0;

  // ── Render card ───────────────────────────────────────────────────────────────
  function showCard(index) {
    const card = cards[index];
    questionText.textContent = card.question;
    answerText.textContent   = card.answer;
    flipCard.classList.remove('flipped');
    cardCounter.textContent = `Card ${index + 1} of ${cards.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === cards.length - 1;
  }

  // ── Flip ──────────────────────────────────────────────────────────────────────
  flipCard.addEventListener('click', () => {
    flipCard.classList.toggle('flipped');
  });

  // ── Navigation ────────────────────────────────────────────────────────────────
  prevBtn.addEventListener('click', () => {
    if (current > 0) { current--; showCard(current); }
  });
  nextBtn.addEventListener('click', () => {
    if (current < cards.length - 1) { current++; showCard(current); }
  });

  // Keyboard arrows
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === ' ')          { e.preventDefault(); flipCard.click(); }
  });

  // ── Shuffle ───────────────────────────────────────────────────────────────────
  shuffleBtn.addEventListener('click', () => {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    current = 0;
    showCard(current);
  });

  // ── Load ──────────────────────────────────────────────────────────────────────
  async function load() {
    questionText.textContent = 'Loading…';
    try {
      const data = await NC.SetsAPI.get(setId);
      cards = data.cards;
      if (!cards.length) {
        questionText.textContent = 'This set has no cards yet.';
        return;
      }
      setTitleEl.textContent = data.set.title;
      document.title = `Study: ${data.set.title} – NeuralCards`;
      quizLink.href  = `quiz.html?id=${setId}`;
      showCard(0);
    } catch (err) {
      questionText.textContent = 'Failed to load set: ' + err.message;
    }
  }

  load();
})();
