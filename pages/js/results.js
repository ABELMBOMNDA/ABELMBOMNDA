// js/results.js – displays quiz results passed from quiz.js via sessionStorage

(function () {
  if (!NC.requireAuth()) return;

  const params = new URLSearchParams(window.location.search);
  const setId  = parseInt(params.get('id'));

  const raw = sessionStorage.getItem('nc_last_result');
  if (!raw) {
    // No result data – send back to dashboard
    window.location.href = 'dashboard.html';
    return;
  }

  sessionStorage.removeItem('nc_last_result');
  const result = JSON.parse(raw);

  const scoreText    = document.getElementById('scoreText');
  const scorePercent = document.getElementById('scorePercent');
  const scoreMessage = document.getElementById('scoreMessage');
  const retakeBtn    = document.getElementById('retakeBtn');
  const studyBtn     = document.getElementById('studyBtn');

  // ── Populate ──────────────────────────────────────────────────────────────────
  scoreText.textContent    = `${result.score} / ${result.total}`;
  scorePercent.textContent = `${result.percent.toFixed(0)}%`;

  let message;
  if (result.percent === 100) {
    message = 'Perfect score! You nailed it 🎉';
  } else if (result.percent >= 80) {
    message = 'Great job! Keep it up 💪';
  } else if (result.percent >= 60) {
    message = 'Good effort — review the ones you missed.';
  } else {
    message = 'Keep studying — you\'ll get there! 📖';
  }
  scoreMessage.textContent = message;

  // Color code the score
  if (result.percent >= 80) {
    scoreText.style.color = 'var(--success)';
  } else if (result.percent < 60) {
    scoreText.style.color = 'var(--error)';
  }

  // ── Links ─────────────────────────────────────────────────────────────────────
  if (setId) {
    retakeBtn.href = `quiz.html?id=${setId}`;
    studyBtn.href  = `study.html?id=${setId}`;
  } else {
    retakeBtn.classList.add('hidden');
    studyBtn.classList.add('hidden');
  }
})();
