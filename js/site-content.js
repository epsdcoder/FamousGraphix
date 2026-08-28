/* =========================================================
   SITE-CONTENT.JS
   Fetches editable text/branding for every page from
   /api/content (backed by data/site-content.json) and fills
   it into the page. This is what lets the admin panel edit
   sidebar branding, theme color, categories, footer, About
   text, and Contact text — all without touching HTML files.

   Runs on every page (index/about/contact/admin) — it quietly
   does nothing on elements that don't exist on a given page.
   ========================================================= */

document.addEventListener('DOMContentLoaded', loadSiteContent);

async function loadSiteContent() {
  let content;
  try {
    const res = await fetch(API_BASE + '/api/content');
    if (!res.ok) throw new Error('Bad response from server');
    content = await res.json();
  } catch (err) {
    console.warn('Could not load site content from backend.', err);
    return; // leave defaults / "Loading…" placeholders as-is
  }

  if (content.site) fillSidebarAndTopbar(content.site);
  if (content.footer) fillFooter(content.footer);
  if (content.theme) applyTheme(content.theme);
  if (content.categories) fillFilterButtons(content.categories);
  if (content.about) fillAboutPage(content.about);
  if (content.contact) fillContactPage(content.contact);
}

/* ---------- Sidebar + mobile topbar (every page) ---------- */
function fillSidebarAndTopbar(site) {
  document.querySelectorAll('.sidebar__title').forEach(el => { el.textContent = site.name || 'Portfolio'; });
  document.querySelectorAll('.sidebar__subtitle').forEach(el => { el.textContent = site.tagline || ''; });
  document.querySelectorAll('.sidebar__avatar, .topbar__avatar').forEach(el => {
    if (site.avatar) el.src = site.avatar;
  });
  document.querySelectorAll('.topbar__brand span').forEach(el => { el.textContent = site.name || 'Portfolio'; });

  // Social links
  const socialContainer = document.querySelector('.sidebar__social');
  if (socialContainer && site.social) {
    const links = [
      { key: 'instagram', icon: '📷', label: 'Instagram', base: 'https://instagram.com/' },
      { key: 'twitter',   icon: '🐦', label: 'Twitter',   base: 'https://twitter.com/' },
      { key: 'linkedin',  icon: '💼', label: 'LinkedIn',  base: 'https://linkedin.com/in/' },
      { key: 'youtube',   icon: '▶️', label: 'YouTube',   base: 'https://youtube.com/@' },
      { key: 'whatsapp',  icon: '💬', label: 'WhatsApp',  base: 'https://wa.me/' }
    ];
    const html = links
      .filter(l => site.social[l.key] && site.social[l.key].trim())
      .map(l => `
        <a class="social-link" href="${l.base}${escapeHTML(site.social[l.key])}" target="_blank" rel="noopener" title="${l.label}">
          <span>${l.icon}</span> ${l.label}
        </a>
      `).join('');
    socialContainer.innerHTML = html || '';
  }
}

/* ---------- Footer (every page) ---------- */
function fillFooter(footer) {
  const textEl = document.getElementById('footer-text');
  if (textEl) textEl.textContent = footer.text || '';

  const blogContainer = document.getElementById('footer-blog-posts');
  if (blogContainer && Array.isArray(footer.blogPosts)) {
    blogContainer.innerHTML = footer.blogPosts.map(post => {
      const link = (post.link || '').trim();
      let icon = (post.image || '').trim();
      if (!icon && link) {
        try {
          const host = new URL(link).hostname;
          icon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
        } catch (e) { /* invalid URL, leave icon blank */ }
      }
      const inner = `
        ${icon ? `<img src="${escapeHTML(icon)}" alt="">` : ''}
        <div class="blog-post__meta">
          <strong>${escapeHTML(post.title)}</strong>
          <span>${escapeHTML(post.subtitle)}</span>
        </div>
      `;
      return link
        ? `<a class="blog-post" href="${escapeHTML(link)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="blog-post">${inner}</div>`;
    }).join('');
  }

  const tagsContainer = document.getElementById('footer-tags');
  if (tagsContainer && Array.isArray(footer.tags)) {
    tagsContainer.innerHTML = footer.tags.map((tag, idx) =>
      `<span class="tag${idx === 0 ? ' is-active' : ''}">${escapeHTML(tag)}</span>`
    ).join('');
    if (typeof initPopularTags === 'function') initPopularTags();
  }
}

/* ---------- Theme (accent color) ---------- */
function applyTheme(theme) {
  if (theme.accentColor) {
    document.documentElement.style.setProperty('--color-accent', theme.accentColor);
  }
}

/* ---------- Portfolio filter buttons (index.html) ---------- */
function fillFilterButtons(categories) {
  const container = document.getElementById('filter-buttons');
  if (!container) return; // not on this page

  const buttonsHTML = ['<button class="filter-btn is-active" data-filter="all" type="button">ALL</button>']
    .concat(categories.map(cat =>
      `<button class="filter-btn" data-filter="${escapeHTML(cat.toLowerCase())}" type="button">${escapeHTML(cat)}</button>`
    ));
  container.innerHTML = buttonsHTML.join('');

  if (typeof initGalleryFilters === 'function') initGalleryFilters();
}

/* ---------- About page ---------- */
function fillAboutPage(about) {
  const bioEl = document.getElementById('about-bio-text');
  if (bioEl) bioEl.textContent = about.bio || '';

  const img1 = document.getElementById('about-hero-img-1');
  const img2 = document.getElementById('about-hero-img-2');
  if (img1 && about.heroImage1) img1.src = about.heroImage1;
  if (img2 && about.heroImage2) img2.src = about.heroImage2;

  const skillsContainer = document.getElementById('skills-container');
  if (skillsContainer && Array.isArray(about.skills)) {
    skillsContainer.innerHTML = about.skills.map(skill => `
      <div class="skill">
        <div class="skill__label"><span>${escapeHTML(skill.name)}</span></div>
        <div class="skill-bar">
          <div class="skill-bar__fill" data-percent="${skill.percent}" style="width:0%;">${skill.percent}%</div>
        </div>
      </div>
    `).join('');
    // Re-trigger the animated fill-in now that bars exist in the DOM
    if (typeof initSkillBars === 'function') initSkillBars();
  }

  const pricingContainer = document.getElementById('pricing-container');
  if (pricingContainer && Array.isArray(about.pricing)) {
    pricingContainer.innerHTML = about.pricing.map(plan => `
      <div class="price-card ${plan.featured ? 'price-card--featured' : ''}">
        <div class="price-card__head">${escapeHTML(plan.name)}</div>
        ${plan.features.map(f => `<div class="price-card__row">${escapeHTML(f)}</div>`).join('')}
        <div class="price-card__amount">$${plan.price}</div>
        <div class="price-card__period">per month</div>
        <div class="price-card__cta"><a class="btn" href="contact.html">Sign Up</a></div>
      </div>
    `).join('');
  }
}

/* ---------- Contact page ---------- */
function fillContactPage(contact) {
  const introEl = document.getElementById('contact-intro-text');
  if (introEl) introEl.textContent = contact.intro || '';

  const emailEl = document.getElementById('contact-email-text');
  if (emailEl) emailEl.textContent = contact.email || '';

  const locationEl = document.getElementById('contact-location-text');
  if (locationEl) locationEl.textContent = contact.location || '';

  const responseEl = document.getElementById('contact-response-text');
  if (responseEl) responseEl.textContent = contact.responseTime || '';

  const whatsappBtn = document.getElementById('whatsapp-btn');
  if (whatsappBtn && contact.whatsappNumber) {
    whatsappBtn.href = `https://wa.me/${contact.whatsappNumber}`;
  }
}

/* ---------- Utility ---------- */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}