/* =========================================================
   PORTFOLIO.JS
   Fetches portfolio items from the backend (/api/portfolio)
   and renders the gallery grid on index.html.

   Falls back to a small built-in sample set if the API
   can't be reached (e.g. opening index.html as a plain
   file instead of running it through the Node server).
   ========================================================= */

const FALLBACK_ITEMS = [
  { id: 'f1', title: 'Mountain Road', category: 'photos', image: 'images/sample-1.jpg', description: '' },
  { id: 'f2', title: 'Northern Lights', category: 'photos', image: 'images/sample-2.jpg', description: '' },
  { id: 'f3', title: 'Golden Ridge', category: 'photos', image: 'images/sample-3.jpg', description: '' }
];

document.addEventListener('DOMContentLoaded', loadPortfolio);

async function loadPortfolio() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;

  let items;
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error('Bad response from server');
    items = await res.json();
  } catch (err) {
    console.warn('Could not reach backend, showing sample items instead.', err);
    items = FALLBACK_ITEMS;
  }

  renderGallery(gallery, items);
  // Re-apply filter logic now that items exist in the DOM
  if (typeof initGalleryFilters === 'function') initGalleryFilters();
}

function renderGallery(container, items) {
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No portfolio items yet. Add some from the <a href="admin.html">admin page</a>.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="gallery-item" data-category="${escapeHTML(item.category)}">
      <div class="gallery-item__media">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy">
      </div>
      <div class="gallery-item__body">
        <span class="gallery-item__tag">${escapeHTML(item.category)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description || '')}</p>
      </div>
    </article>
  `).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
