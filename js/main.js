/* =========================================================
   MAIN.JS
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
  highlightActiveNav();
  initGalleryFilters();
  initSkillBars();
  initPopularTags();
  initScrollReveal();
});

/* ---------- Mobile sidebar drawer ---------- */
function initMobileSidebar() {
  const toggleBtn = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!toggleBtn || !sidebar || !overlay) return;

  const closeSidebar = () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  const openSidebar = () => {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
  };

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
}

/* ---------- Highlight current page in sidebar nav ---------- */
function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar__nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ---------- Portfolio category filter ---------- */
function initGalleryFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.gallery-item');
  if (!buttons.length || !items.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;
      buttons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      items.forEach(item => {
        const matches = category === 'all' || item.dataset.category === category;
        item.classList.toggle('is-hidden', !matches);
      });
    });
  });
}

/* ---------- Animate skill bars into view ---------- */
function initSkillBars() {
  const bars = document.querySelectorAll('.skill-bar__fill[data-percent]');
  if (!bars.length) return;

  const animate = (el) => {
    const pct = el.dataset.percent;
    el.textContent = pct + '%';
    requestAnimationFrame(() => {
      setTimeout(() => { el.style.width = pct + '%'; }, 50);
    });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(b => {
      b.style.width = '0%';
      b.textContent = '';
      observer.observe(b);
    });
  } else {
    bars.forEach(animate);
  }
}

/* ---------- Footer popular tags ---------- */
function initPopularTags() {
  const tags = document.querySelectorAll('.tag-list .tag');
  if (!tags.length) return;
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      tags.forEach(t => t.classList.remove('is-active'));
      tag.classList.add('is-active');
    });
  });
}

/* ---------- Scroll reveal ---------- */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => observer.observe(el));
  } else {
    els.forEach(el => el.classList.add('is-visible'));
  }
}

/* ---------- Lightbox popup ---------- */
function initLightbox() {
  if (document.getElementById('lightbox')) return;

  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <div class="lightbox__inner">
      <button class="lightbox__close" id="lightbox-close" aria-label="Close">✕</button>
      <button class="lightbox__nav lightbox__prev" id="lightbox-prev" aria-label="Previous">‹</button>
      <button class="lightbox__nav lightbox__next" id="lightbox-next" aria-label="Next">›</button>
      <img class="lightbox__img" id="lightbox-img" src="" alt="">
      <div class="lightbox__caption" id="lightbox-caption"></div>
      <div class="lightbox__actions">
        <a class="btn btn--outline" id="lightbox-download" download>Download Image</a>
        <a class="btn btn--accent" id="lightbox-open" target="_blank" rel="noopener">Full View</a>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);

  let currentIndex = 0;
  let galleryImages = [];

  function openLightbox(index) {
    currentIndex = index;
    const item = galleryImages[currentIndex];
    document.getElementById('lightbox-img').src = item.src;
    document.getElementById('lightbox-img').alt = item.alt;
    document.getElementById('lightbox-caption').textContent = item.caption;
    document.getElementById('lightbox-download').href = item.src;
    document.getElementById('lightbox-open').href = item.src;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      const img = document.getElementById('lightbox-img');
      if (img) img.src = '';
    }, 300);
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    openLightbox(currentIndex);
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % galleryImages.length;
    openLightbox(currentIndex);
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', showPrev);
  document.getElementById('lightbox-next').addEventListener('click', showNext);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  function attachToGallery() {
    const items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

    galleryImages = [];
    items.forEach((item, index) => {
      const img = item.querySelector('.gallery-item__media img');
      const title = item.querySelector('h3');
      if (!img) return;

      const imgSrc = img.src;
      const imgCaption = title ? title.textContent : '';

      galleryImages.push({
        src: imgSrc,
        alt: img.alt || '',
        caption: imgCaption
      });

      // Add overlay buttons if not already added
      const media = item.querySelector('.gallery-item__media');
      if (media && !media.querySelector('.gallery-item__overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'gallery-item__overlay';
        overlay.innerHTML = `
          <button class="gallery-overlay-btn gallery-overlay-btn--preview" data-index="${index}">Preview</button>
          <a class="gallery-overlay-btn gallery-overlay-btn--download" href="${imgSrc}" download>Download</a>
        `;
        media.appendChild(overlay);
      }

      // Preview button opens lightbox
      const previewBtn = item.querySelector('.gallery-overlay-btn--preview');
      if (previewBtn) {
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openLightbox(index);
        });
      }

      // Download button stops lightbox from opening
      const downloadBtn = item.querySelector('.gallery-overlay-btn--download');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });
  }

  attachToGallery();

  const gallery = document.getElementById('gallery');
  if (gallery) {
    const observer = new MutationObserver(() => {
      attachToGallery();
      if (typeof initGalleryFilters === 'function') initGalleryFilters();
    });
    observer.observe(gallery, { childList: true });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initLightbox, 800);
});