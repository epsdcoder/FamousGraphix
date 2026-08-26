/* =========================================================
   ADMIN-SERVICES-TESTIMONIALS.JS
   Handles the admin CRUD for Services and Testimonials.
   Loaded only on admin.html, after admin.js.
   ========================================================= */

let currentServices = [];
let currentTestimonials = [];

document.addEventListener('DOMContentLoaded', () => {
  // Services
  document.getElementById('add-service-btn').addEventListener('click', () => openServiceModal());
  document.getElementById('service-form').addEventListener('submit', handleSaveService);
  document.getElementById('service-modal-cancel').addEventListener('click', () => closeServiceTestimonialModal('service-modal'));

  // Testimonials
  document.getElementById('add-testimonial-btn').addEventListener('click', () => openTestimonialModal());
  document.getElementById('testimonial-form').addEventListener('submit', handleSaveTestimonial);
  document.getElementById('testimonial-modal-cancel').addEventListener('click', () => closeServiceTestimonialModal('testimonial-modal'));

  // Testimonial avatar upload button
  const avatarInput = document.getElementById('testimonial-avatar');
  const avatarBtn = document.getElementById('testimonial-avatar-upload-btn');
  if (avatarInput && avatarBtn && typeof attachUploadButton === 'function') {
    attachUploadButton(avatarInput, avatarBtn);
  }

  // Load both tables after auth is ready
  waitForAuth(() => {
    loadServicesTable();
    loadTestimonialsTable();
  });
});

/* ---------- Wait for Firebase auth to be ready ---------- */
function waitForAuth(cb) {
  // Firebase auth is handled by admin.js redirect.
  // By the time this script runs, user is already authenticated.
  // We just wait for the DOM to be ready, then load tables.
  if (typeof onAuthStateChanged === 'function') {
    onAuthStateChanged((user) => {
      if (user) cb();
    });
  } else {
    // Fallback: small delay then run
    setTimeout(cb, 500);
  }
}

/* =========================================================
   SERVICES
   ========================================================= */
async function loadServicesTable() {
  const tbody = document.getElementById('services-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';

  try {
    const res = await fetch('/api/services');
    currentServices = await res.json();

    if (!currentServices.length) {
      tbody.innerHTML = '<tr><td colspan="4">No services yet. Click "+ Add Service".</td></tr>';
      return;
    }

    tbody.innerHTML = currentServices.map(s => `
      <tr>
        <td style="font-size:1.5rem;">${escapeHTMLST(s.icon || '')}</td>
        <td>${escapeHTMLST(s.title)}</td>
        <td>${escapeHTMLST((s.description || '').slice(0, 60))}${s.description && s.description.length > 60 ? '…' : ''}</td>
        <td>
          <div class="admin-actions">
            <button class="btn btn--outline" data-edit-service="${s.id}" type="button">Edit</button>
            <button class="btn btn--danger" data-delete-service="${s.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit-service]').forEach(btn => {
      btn.addEventListener('click', () => openServiceModal(btn.dataset.editService));
    });
    tbody.querySelectorAll('[data-delete-service]').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteService(btn.dataset.deleteService));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Could not load services: ${escapeHTMLST(err.message)}</td></tr>`;
  }
}

function openServiceModal(id) {
  const modal = document.getElementById('service-modal');
  const title = document.getElementById('service-modal-title');
  document.getElementById('service-form').reset();
  document.getElementById('service-form-status').textContent = '';
  document.getElementById('service-form-status').className = 'form-status';

  if (id) {
    const s = currentServices.find(s => s.id === id);
    if (!s) return;
    title.textContent = 'Edit Service';
    document.getElementById('service-id').value = s.id;
    document.getElementById('service-icon').value = s.icon || '';
    document.getElementById('service-title').value = s.title || '';
    document.getElementById('service-description').value = s.description || '';
  } else {
    title.textContent = 'Add Service';
    document.getElementById('service-id').value = '';
  }
  modal.classList.add('is-open');
}

async function handleSaveService(e) {
  e.preventDefault();
  const status = document.getElementById('service-form-status');
  const saveBtn = document.getElementById('service-modal-save');
  status.textContent = '';
  status.className = 'form-status';

  const id = document.getElementById('service-id').value;
  const payload = {
    icon: document.getElementById('service-icon').value.trim(),
    title: document.getElementById('service-title').value.trim(),
    description: document.getElementById('service-description').value.trim()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const url = id ? `/api/services/${id}` : '/api/services';
    const method = id ? 'PUT' : 'POST';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save service.');
    closeServiceTestimonialModal('service-modal');
    loadServicesTable();
  } catch (err) {
    status.textContent = err.message;
    status.className = 'form-status is-error';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function handleDeleteService(id) {
  if (!confirm('Delete this service? This cannot be undone.')) return;
  try {
    const res = await authFetch(`/api/services/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Could not delete service.');
    loadServicesTable();
  } catch (err) {
    alert(err.message);
  }
}

/* =========================================================
   TESTIMONIALS
   ========================================================= */
async function loadTestimonialsTable() {
  const tbody = document.getElementById('testimonials-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';

  try {
    const res = await fetch('/api/testimonials');
    currentTestimonials = await res.json();

    if (!currentTestimonials.length) {
      tbody.innerHTML = '<tr><td colspan="5">No testimonials yet. Click "+ Add Testimonial".</td></tr>';
      return;
    }

    tbody.innerHTML = currentTestimonials.map(t => `
      <tr>
        <td>${escapeHTMLST(t.name)}</td>
        <td>${escapeHTMLST(t.role || '')}</td>
        <td>${'★'.repeat(Math.max(0, Math.min(5, t.rating || 0)))}</td>
        <td>${escapeHTMLST((t.text || '').slice(0, 60))}${t.text && t.text.length > 60 ? '…' : ''}</td>
        <td>
          <div class="admin-actions">
            <button class="btn btn--outline" data-edit-testimonial="${t.id}" type="button">Edit</button>
            <button class="btn btn--danger" data-delete-testimonial="${t.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit-testimonial]').forEach(btn => {
      btn.addEventListener('click', () => openTestimonialModal(btn.dataset.editTestimonial));
    });
    tbody.querySelectorAll('[data-delete-testimonial]').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteTestimonial(btn.dataset.deleteTestimonial));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Could not load testimonials: ${escapeHTMLST(err.message)}</td></tr>`;
  }
}

function openTestimonialModal(id) {
  const modal = document.getElementById('testimonial-modal');
  const title = document.getElementById('testimonial-modal-title');
  document.getElementById('testimonial-form').reset();
  document.getElementById('testimonial-form-status').textContent = '';
  document.getElementById('testimonial-form-status').className = 'form-status';

  if (id) {
    const t = currentTestimonials.find(t => t.id === id);
    if (!t) return;
    title.textContent = 'Edit Testimonial';
    document.getElementById('testimonial-id').value = t.id;
    document.getElementById('testimonial-name').value = t.name || '';
    document.getElementById('testimonial-role').value = t.role || '';
    document.getElementById('testimonial-rating').value = t.rating || 5;
    document.getElementById('testimonial-text').value = t.text || '';
    document.getElementById('testimonial-avatar').value = t.avatar || '';
  } else {
    title.textContent = 'Add Testimonial';
    document.getElementById('testimonial-id').value = '';
    document.getElementById('testimonial-rating').value = 5;
  }
  modal.classList.add('is-open');
}

async function handleSaveTestimonial(e) {
  e.preventDefault();
  const status = document.getElementById('testimonial-form-status');
  const saveBtn = document.getElementById('testimonial-modal-save');
  status.textContent = '';
  status.className = 'form-status';

  const id = document.getElementById('testimonial-id').value;
  const payload = {
    name: document.getElementById('testimonial-name').value.trim(),
    role: document.getElementById('testimonial-role').value.trim(),
    rating: Number(document.getElementById('testimonial-rating').value) || 5,
    text: document.getElementById('testimonial-text').value.trim(),
    avatar: document.getElementById('testimonial-avatar').value.trim()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const url = id ? `/api/testimonials/${id}` : '/api/testimonials';
    const method = id ? 'PUT' : 'POST';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save testimonial.');
    closeServiceTestimonialModal('testimonial-modal');
    loadTestimonialsTable();
  } catch (err) {
    status.textContent = err.message;
    status.className = 'form-status is-error';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function handleDeleteTestimonial(id) {
  if (!confirm('Delete this testimonial? This cannot be undone.')) return;
  try {
    const res = await authFetch(`/api/testimonials/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Could not delete testimonial.');
    loadTestimonialsTable();
  } catch (err) {
    alert(err.message);
  }
}

/* ---------- Close modal ---------- */
function closeServiceTestimonialModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('is-open');
}

/* ---------- Utility ---------- */
function escapeHTMLST(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}