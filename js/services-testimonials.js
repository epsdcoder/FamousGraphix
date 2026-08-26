/* =========================================================
   SERVICES-TESTIMONIALS.JS
   Fetches services and testimonials from the backend and
   renders them on the public pages (index.html / about.html).
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  loadServices();
  loadTestimonials();
});

/* ---------- Services ---------- */
async function loadServices() {
  const container = document.getElementById('services-container');
  if (!container) return;

  try {
    const res = await fetch(API_BASE + '/api/services');
    if (!res.ok) throw new Error('Could not load services');
    const services = await res.json();
    renderServices(container, services);
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Services coming soon.</p>';
  }
}

function renderServices(container, services) {
  if (!services.length) {
    container.innerHTML = '<p class="empty-state">No services listed yet.</p>';
    return;
  }
  container.innerHTML = services.map((s, i) => `
    <div class="service-card reveal reveal-delay-${(i % 4) + 1}">
      <div class="service-card__icon">${escapeHTML(s.icon || '✦')}</div>
      <h3 class="service-card__title">${escapeHTML(s.title)}</h3>
      <p class="service-card__desc">${escapeHTML(s.description)}</p>
    </div>
  `).join('');
  if (typeof initScrollReveal === 'function') initScrollReveal();
}

/* ---------- Testimonials ---------- */
async function loadTestimonials() {
  const container = document.getElementById('testimonials-container');
  if (!container) return;

  try {
    const res = await fetch(API_BASE + '/api/testimonials');
    if (!res.ok) throw new Error('Could not load testimonials');
    const testimonials = await res.json();
    renderTestimonials(container, testimonials);
  } catch (err) {
    container.innerHTML = '<p class="empty-state">No reviews yet.</p>';
  }
}

function renderTestimonials(container, testimonials) {
  if (!testimonials.length) {
    container.innerHTML = '<p class="empty-state">No testimonials yet.</p>';
    return;
  }
  container.innerHTML = testimonials.map((t, i) => `
    <div class="testimonial-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="testimonial-card__stars">${renderStars(t.rating)}</div>
      <p class="testimonial-card__text">"${escapeHTML(t.text)}"</p>
      <div class="testimonial-card__author">
        ${t.avatar
          ? `<img class="testimonial-card__avatar" src="${escapeHTML(t.avatar)}" alt="${escapeHTML(t.name)}">`
          : `<div class="testimonial-card__avatar-placeholder">${escapeHTML(t.name.charAt(0).toUpperCase())}</div>`
        }
        <div>
          <div class="testimonial-card__name">${escapeHTML(t.name)}</div>
          <div class="testimonial-card__role">${escapeHTML(t.role)}</div>
        </div>
      </div>
    </div>
  `).join('');
  if (typeof initScrollReveal === 'function') initScrollReveal();
}

function renderStars(rating) {
  const n = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}