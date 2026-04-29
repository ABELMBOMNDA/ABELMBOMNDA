// js/auth.js – handles login, register, and reset-password pages

(function () {
  // ── Helpers ──────────────────────────────────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById('error-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideError() {
    const el = document.getElementById('error-msg');
    if (el) el.classList.add('hidden');
  }
  function showSuccess(msg) {
    const el = document.getElementById('success-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
  }

  // ── Login Page ────────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    NC.redirectIfAuthed();

    const submitBtn = loginForm.querySelector('[type="submit"]');
    submitBtn.dataset.label = submitBtn.textContent;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      setLoading(submitBtn, true);
      try {
        await NC.AuthAPI.login(email, password);
        window.location.href = 'dashboard.html';
      } catch (err) {
        showError(err.message || 'Login failed. Please try again.');
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── Register Page ─────────────────────────────────────────────────────────────
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    NC.redirectIfAuthed();

    const submitBtn = registerForm.querySelector('[type="submit"]');
    submitBtn.dataset.label = submitBtn.textContent;

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      const full_name = document.getElementById('full_name').value.trim();
      const email     = document.getElementById('email').value.trim();
      const password  = document.getElementById('password').value;
      if (password.length < 8) {
        showError('Password must be at least 8 characters.');
        return;
      }
      setLoading(submitBtn, true);
      try {
        await NC.AuthAPI.register(full_name, email, password);
        window.location.href = 'dashboard.html';
      } catch (err) {
        showError(err.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── Reset Password Page ────────────────────────────────────────────────────────
  const sendResetBtn = document.getElementById('sendResetBtn');
  if (sendResetBtn) {
    sendResetBtn.dataset.label = sendResetBtn.textContent;

    // If a token is in the URL, switch to the "set new password" view
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');

    if (token) {
      // Swap UI to new-password form
      const stepRequest = document.getElementById('step-request');
      if (stepRequest) {
        stepRequest.innerHTML = `
          <p>Enter your new password below.</p>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" placeholder="At least 8 characters" required/>
          </div>
          <div id="error-msg"  class="error-msg  hidden"></div>
          <div id="success-msg" class="success-msg hidden"></div>
          <button id="confirmResetBtn" class="btn btn-primary btn-full">Set New Password</button>
        `;

        document.getElementById('confirmResetBtn').addEventListener('click', async () => {
          const pwd = document.getElementById('newPassword').value;
          hideError();
          if (pwd.length < 8) { showError('Password must be at least 8 characters.'); return; }
          const btn = document.getElementById('confirmResetBtn');
          btn.disabled = true; btn.textContent = 'Saving…';
          try {
            await NC.AuthAPI.resetPassword(token, pwd);
            showSuccess('Password updated! Redirecting to login…');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
          } catch (err) {
            showError(err.message || 'Reset failed. The link may have expired.');
            btn.disabled = false; btn.textContent = 'Set New Password';
          }
        });
      }
    } else {
      // Normal "send reset link" flow
      sendResetBtn.addEventListener('click', async () => {
        hideError();
        const email = document.getElementById('email').value.trim();
        if (!email) { showError('Please enter your email address.'); return; }
        setLoading(sendResetBtn, true);
        try {
          await NC.AuthAPI.forgotPassword(email);
          showSuccess('If that email is registered, a reset link has been sent.');
          document.getElementById('email').value = '';
        } catch (err) {
          showError(err.message || 'Something went wrong. Please try again.');
        } finally {
          setLoading(sendResetBtn, false);
        }
      });
    }
  }
})();
