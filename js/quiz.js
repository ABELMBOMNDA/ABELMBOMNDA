// js/quiz.js – type-answer quiz flow with per-question feedback

(function () {
  if (!NC.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const setId  = parseInt(params.get('id'));
  if (!setId) { window.location.href = 'dashboard.html'; return; }

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  const quizTitle      = document.getElementById('quizTitle');
  const questionCounter = document.getElementById('questionCounter');
  const progressFill   = document.getElementById('progressFill');
  const questionText   = document.getElementById('questionText');
  const answerInput    = document.getElementById('answerInput');
  const submitBtn      = document.getElementById('submitAnswerBtn');
  const feedback       = document.getElementById('feedback');
  const nextBtn        = document.getElementById('nextQuestionBtn');

  // ── State ─────────────────────────────────────────────────────────────────────
  let cards    = [];
  let current  = 0;
  let answers  = [];   // { card_id, user_answer, is_correct }
  let submitted = false;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function normalize(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function updateProgress() {
    const pct = ((current) / cards.length) * 100;
    progressFill.style.width = pct + '%';
    questionCounter.textContent = `Question ${current + 1} of ${cards.length}`;
  }

  function showQuestion() {
    const card = cards[current];
    questionText.textContent = card.question;
    answerInput.value = '';
    answerInput.disabled = false;
    feedback.className = 'feedback hidden';
    feedback.textContent = '';
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
    nextBtn.classList.add('hidden');
    submitted = false;
    updateProgress();
    answerInput.focus();
  }

  // ── Submit answer ──────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (submitted) return;
    const card       = cards[current];
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) { answerInput.focus(); return; }

    const is_correct = normalize(userAnswer) === normalize(card.answer);
    answers.push({ card_id: card.id, user_answer: userAnswer, is_correct });

    // Show feedback
    submitted = true;
    answerInput.disabled = true;
    submitBtn.classList.add('hidden');

    feedback.classList.remove('hidden');
    if (is_correct) {
      feedback.className = 'feedback correct';
      feedback.textContent = '✓ Correct!';
    } else {
      feedback.className = 'feedback wrong';
      feedback.textContent = `✗ Incorrect. The answer was: ${card.answer}`;
    }

    // Show Next / Finish
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = current < cards.length - 1 ? 'Next Question →' : 'Finish Quiz';
  }

  submitBtn.addEventListener('click', handleSubmit);
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });

  // ── Next question / Finish ────────────────────────────────────────────────────
  nextBtn.addEventListener('click', async () => {
    current++;
    if (current < cards.length) {
      showQuestion();
    } else {
      await finishQuiz();
    }
  });

  // ── Finish: submit attempt then redirect ──────────────────────────────────────
  async function finishQuiz() {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Saving…';
    try {
      const result = await NC.QuizAPI.submitAttempt(setId, answers);
      // Pass results to results page via sessionStorage
      sessionStorage.setItem('nc_last_result', JSON.stringify({
        score:   result.score,
        total:   result.total,
        percent: result.percent,
        setId,
      }));
      window.location.href = `results.html?id=${setId}`;
    } catch (err) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Finish Quiz';
      alert('Failed to save results: ' + err.message);
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  async function load() {
    questionText.textContent = 'Loading…';
    try {
      const data = await NC.SetsAPI.get(setId);
      cards = data.cards;
      if (!cards.length) {
        questionText.textContent = 'This set has no cards. Add some first!';
        submitBtn.classList.add('hidden');
        return;
      }
      // Shuffle cards for each quiz attempt
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      quizTitle.textContent  = data.set.title;
      document.title = `Quiz: ${data.set.title} – NeuralCards`;
      showQuestion();
    } catch (err) {
      questionText.textContent = 'Failed to load: ' + err.message;
    }
  }

  load();
})();
