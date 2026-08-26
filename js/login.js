document.addEventListener('DOMContentLoaded', function() {

  onAuthStateChanged(function(user) {
    if (user) {
      window.location.href = 'admin.html';
    }
  });

  var loginForm = document.getElementById('login-form');
  var forgotForm = document.getElementById('forgot-form');
  var forgotLink = document.getElementById('forgot-link');
  var backLink = document.getElementById('back-link');
  var loginPanel = document.getElementById('login-panel');
  var forgotPanel = document.getElementById('forgot-panel');

  if (forgotLink) {
    forgotLink.addEventListener('click', function() {
      loginPanel.style.display = 'none';
      forgotPanel.classList.add('is-open');
    });
  }

  if (backLink) {
    backLink.addEventListener('click', function() {
      forgotPanel.classList.remove('is-open');
      loginPanel.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      var email = document.getElementById('login-email').value;
      var password = document.getElementById('login-password').value;
      var status = document.getElementById('login-status');
      var btn = document.getElementById('login-btn');

      status.className = 'form-status';
      status.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      firebaseLogin(email, password).then(function() {
        sessionStorage.setItem('just_logged_in', '1');
        window.location.href = 'admin.html';
      }).catch(function(err) {
        var messages = {
          'auth/user-not-found': 'No account found with that email.',
          'auth/wrong-password': 'Incorrect password.',
          'auth/invalid-credential': 'Incorrect email or password.',
          'auth/invalid-email': 'Please enter a valid email.',
          'auth/too-many-requests': 'Too many attempts. Try again later.'
        };
        status.textContent = messages[err.code] || 'Login failed. Please try again.';
        status.className = 'form-status is-error';
        btn.disabled = false;
        btn.textContent = 'Sign In';
      });
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', function(e) {
      e.preventDefault();

      var email = document.getElementById('forgot-email').value;
      var status = document.getElementById('forgot-status');
      var btn = document.getElementById('forgot-btn');

      status.className = 'form-status';
      status.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Sending...';

      firebaseForgotPassword(email).then(function() {
        status.textContent = 'Reset email sent! Check your inbox and spam folder.';
        status.className = 'form-status is-success';
        forgotForm.reset();
        btn.disabled = false;
        btn.textContent = 'Send Reset Email';
      }).catch(function(err) {
        var messages = {
          'auth/user-not-found': 'No account found with that email.',
          'auth/invalid-email': 'Please enter a valid email address.'
        };
        status.textContent = messages[err.code] || 'Could not send reset email.';
        status.className = 'form-status is-error';
        btn.disabled = false;
        btn.textContent = 'Send Reset Email';
      });
    });
  }

});