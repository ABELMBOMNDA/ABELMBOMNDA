// js/quiz.js – type-answer quiz flow with per-question feedback

(function () {
  if (!NC.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const setId  = parseInt(params.get('id'));
  if (!setId) { window.location.href = 'dashboard.html'; return; }

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  const quizTitle       = document.getElementById('quizTitle');
  const questionCounter = document.getElementById('questionCounter');
  const progressFill    = document.getElementById('progressFill');
  const questionText    = document.getElementById('questionText');
  const answerInput     = document.getElementById('answerInput');
  const submitBtn       = document.getElementById('submitAnswerBtn');
  const tfButtonGroup   = document.getElementById('tfButtonGroup');
  const trueBtn         = document.getElementById('trueBtn');
  const falseBtn        = document.getElementById('falseBtn');
  const feedback        = document.getElementById('feedback');
  const nextBtn         = document.getElementById('nextQuestionBtn');

  // ── State ─────────────────────────────────────────────────────────────────────
  let cards     = [];
  let current   = 0;
  let answers   = [];
  let submitted = false;
  let isTF      = false;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function normalize(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function updateProgress() {
    const pct = (current / cards.length) * 100;
    progressFill.style.width = pct + '%';
    questionCounter.textContent = `Question ${current + 1} of ${cards.length}`;
  }

  function showQuestion() {
    const card = cards[current];
    questionText.textContent = card.question;
    feedback.className = 'feedback hidden';
    feedback.textContent = '';
    nextBtn.classList.add('hidden');
    submitted = false;
    updateProgress();

    if (isTF) {
      answerInput.classList.add('hidden');
      submitBtn.classList.add('hidden');
      tfButtonGroup.classList.remove('hidden');
      trueBtn.disabled  = false;
      falseBtn.disabled = false;
      trueBtn.classList.remove('tf-quiz-selected');
      falseBtn.classList.remove('tf-quiz-selected');
    } else {
      answerInput.value = '';
      answerInput.disabled = false;
      answerInput.classList.remove('hidden');
      submitBtn.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      tfButtonGroup.classList.add('hidden');
      answerInput.focus();
    }
  }

  // ── Handle answer (shared logic) ──────────────────────────────────────────────
  function handleAnswer(userAnswer) {
    if (submitted) return;
    const card       = cards[current];
    const is_correct = normalize(userAnswer) === normalize(card.answer);
    answers.push({ card_id: card.id, user_answer: userAnswer, is_correct });

    submitted = true;
    feedback.classList.remove('hidden');

    if (isTF) {
      trueBtn.disabled  = true;
      falseBtn.disabled = true;
      if (is_correct) {
        feedback.className = 'feedback correct';
        feedback.textContent = `Correct! — ${card.explanation || ''}`;
      } else {
        feedback.className = 'feedback wrong';
        feedback.textContent = `Incorrect. The answer is ${card.answer}. — ${card.explanation || ''}`;
      }
    } else {
      answerInput.disabled = true;
      submitBtn.classList.add('hidden');
      if (is_correct) {
        feedback.className = 'feedback correct';
        feedback.textContent = 'Correct!';
      } else {
        feedback.className = 'feedback wrong';
        feedback.textContent = `Incorrect. The answer was: ${card.answer}`;
      }
    }

    nextBtn.classList.remove('hidden');
    nextBtn.textContent = current < cards.length - 1 ? 'Next Question →' : 'Finish Quiz';
  }

  // ── Standard mode submit ──────────────────────────────────────────────────────
  submitBtn.addEventListener('click', () => {
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) { answerInput.focus(); return; }
    handleAnswer(userAnswer);
  });

  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const userAnswer = answerInput.value.trim();
      if (!userAnswer) return;
      handleAnswer(userAnswer);
    }
  });

  // ── TF mode buttons ───────────────────────────────────────────────────────────
  trueBtn.addEventListener('click', () => {
    trueBtn.classList.add('tf-quiz-selected');
    handleAnswer('True');
  });
  falseBtn.addEventListener('click', () => {
    falseBtn.classList.add('tf-quiz-selected');
    handleAnswer('False');
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
      isTF  = !!data.set.true_false_mode;
      cards = data.cards;
      if (!cards.length) {
        questionText.textContent = 'This set has no cards. Add some first!';
        submitBtn.classList.add('hidden');
        return;
      }
      // Shuffle
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      quizTitle.textContent = data.set.title;
      document.title = `Quiz: ${data.set.title} – NeuralCards`;
      showQuestion();
    } catch (err) {
      questionText.textContent = 'Failed to load: ' + err.message;
    }
  }

  load();
})();
