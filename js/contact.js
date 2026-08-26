/* =========================================================
   CONTACT.JS
   Handles the contact form on contact.html:
   - basic client-side validation
   - POSTs to /api/contact on the backend
   - shows success / error feedback without leaving the page
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusBox = document.getElementById('form-status');
  const submitBtn = document.getElementById('contact-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim()
    };

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      showStatus(data.message || 'Thanks! Your message has been sent.', 'success');
      form.reset();
    } catch (err) {
      showStatus(err.message || 'Could not send your message. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Sending…' : 'Send Message';
  }

  function showStatus(text, type) {
    statusBox.textContent = text;
    statusBox.className = 'form-status is-' + type;
  }

  function hideStatus() {
    statusBox.textContent = '';
    statusBox.className = 'form-status';
  }
});
