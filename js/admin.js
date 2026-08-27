/* =========================================================
   ADMIN.JS — Firebase Auth version
   ========================================================= */

/* ---------------------------------------------------------
   Cloudinary — free image hosting (no credit card required).
   Replace these two values with your own after creating a
   free account at https://cloudinary.com and an UNSIGNED
   upload preset in Settings > Upload > Upload presets.
   --------------------------------------------------------- */
var CLOUDINARY_CLOUD_NAME = 'cia2gvqg';
var CLOUDINARY_UPLOAD_PRESET = 'zvyzkjhj';

async function uploadImageToCloudinary(file) {
  if (CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME' || CLOUDINARY_UPLOAD_PRESET === 'YOUR_UPLOAD_PRESET') {
    throw new Error('Cloudinary is not set up yet. Fill in CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in js/admin.js.');
  }
  var formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  var res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
    method: 'POST',
    body: formData
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : 'Upload failed.');
  return data.secure_url;
}

var currentItems = [];
var currentAboutData = null;

document.addEventListener('DOMContentLoaded', function() {

  // Firebase auth — give it up to 5 seconds to resolve before redirecting
  var redirectTimer = setTimeout(function() {
    window.location.href = 'login.html';
  }, 5000);

  onAuthStateChanged(function(user) {
    if (user) {
      clearTimeout(redirectTimer);
      initDashboard();
    } else {
      // Only redirect if Firebase has fully initialized (not just null state)
      // We check if the app is initialized
      if (firebase.apps.length > 0) {
        clearTimeout(redirectTimer);
        window.location.href = 'login.html';
      }
    }
  });
});

function initDashboard() {
  var logoutBtn = document.getElementById('logout-btn');
  var addBtn = document.getElementById('add-item-btn');
  var itemForm = document.getElementById('item-form');
  var cancelBtn = document.getElementById('modal-cancel-btn');
  var aboutForm = document.getElementById('about-edit-form');
  var contactForm = document.getElementById('contact-edit-form');
  var addSkillBtn = document.getElementById('add-skill-btn');
  var addPricingBtn = document.getElementById('add-pricing-btn');
  var siteForm = document.getElementById('site-edit-form');
  var addBlogPostBtn = document.getElementById('add-blog-post-btn');
  var socialForm = document.getElementById('social-edit-form');
  var changePasswordForm = document.getElementById('change-password-form');

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (addBtn) addBtn.addEventListener('click', function() { openModal(); });
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (itemForm) itemForm.addEventListener('submit', handleSaveItem);
  if (aboutForm) aboutForm.addEventListener('submit', handleSaveAbout);
  if (contactForm) contactForm.addEventListener('submit', handleSaveContact);
  if (addSkillBtn) addSkillBtn.addEventListener('click', function() { addSkillRow({ name: '', percent: 80 }); });
  if (addPricingBtn) addPricingBtn.addEventListener('click', function() { addPricingCard({ name: '', price: 0, features: [], featured: false }); });
  if (siteForm) siteForm.addEventListener('submit', handleSaveSite);
  if (addBlogPostBtn) addBlogPostBtn.addEventListener('click', function() { addBlogPostRow({ title: '', subtitle: '', image: '' }); });
  if (socialForm) socialForm.addEventListener('submit', handleSaveSocial);
  if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);

  showDashboard();
}

function handleLogout() {
  firebaseLogout().then(function() {
    window.location.href = 'login.html';
  }).catch(function() {
    window.location.href = 'login.html';
  });
}

function showDashboard() {
  loadPortfolioItems();
  loadMessages();
  loadSiteContentIntoForms();
}

async function authFetch(url, options) {
  options = options || {};
  var token = await getAuthToken();
  var headers = options.headers || {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  options.headers = headers;
  var res = await fetch(url, options);
  if (res.status === 401) {
    await firebaseLogout();
    window.location.href = 'login.html';
    throw new Error('Session expired.');
  }
  return res;
}

async function handleChangePassword(e) {
  e.preventDefault();
  var status = document.getElementById('change-password-status');
  var btn = e.target.querySelector('button[type="submit"]');
  var currentPass = document.getElementById('current-password').value;
  var newPass = document.getElementById('new-password').value;
  var confirmPass = document.getElementById('confirm-password').value;

  status.className = 'form-status';
  status.textContent = '';

  if (newPass !== confirmPass) {
    status.textContent = 'New passwords do not match.';
    status.className = 'form-status is-error';
    return;
  }
  if (newPass.length < 6) {
    status.textContent = 'New password must be at least 6 characters.';
    status.className = 'form-status is-error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    await firebaseChangePassword(currentPass, newPass);
    status.textContent = 'Password updated successfully!';
    status.className = 'form-status is-success';
    e.target.reset();
  } catch (err) {
    var messages = {
      'auth/wrong-password': 'Current password is incorrect.',
      'auth/too-many-requests': 'Too many attempts. Please wait.',
      'auth/requires-recent-login': 'Please log out and log back in first.'
    };
    status.textContent = messages[err.code] || 'Could not update password.';
    status.className = 'form-status is-error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

async function loadPortfolioItems() {
  var tbody = document.getElementById('admin-table-body');
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try {
    var res = await fetch(API_BASE + '/api/portfolio');
    currentItems = await res.json();
    if (!currentItems.length) {
      tbody.innerHTML = '<tr><td colspan="5">No items yet. Click "+ Add Item".</td></tr>';
      return;
    }
    tbody.innerHTML = currentItems.map(function(item) {
      return '<tr>' +
        '<td><img src="' + escapeHTML(item.image) + '" alt=""></td>' +
        '<td>' + escapeHTML(item.title) + '</td>' +
        '<td><span class="badge">' + escapeHTML(item.category) + '</span></td>' +
        '<td>' + escapeHTML((item.description || '').slice(0, 60)) + (item.description && item.description.length > 60 ? '...' : '') + '</td>' +
        '<td><div class="admin-actions">' +
        '<button class="btn btn--outline" data-edit="' + item.id + '" type="button">Edit</button>' +
        '<button class="btn btn--danger" data-delete="' + item.id + '" type="button">Delete</button>' +
        '</div></td></tr>';
    }).join('');
    tbody.querySelectorAll('[data-edit]').forEach(function(btn) {
      btn.addEventListener('click', function() { openModal(btn.dataset.edit); });
    });
    tbody.querySelectorAll('[data-delete]').forEach(function(btn) {
      btn.addEventListener('click', function() { handleDeleteItem(btn.dataset.delete); });
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Could not load items.</td></tr>';
  }
}

function openModal(itemId) {
  var modal = document.getElementById('item-modal');
  var title = document.getElementById('modal-title');
  var form = document.getElementById('item-form');
  var status = document.getElementById('item-form-status');
  status.textContent = '';
  status.className = 'form-status';
  form.reset();

  if (itemId) {
    var item = currentItems.find(function(i) { return i.id === itemId; });
    if (!item) return;
    title.textContent = 'Edit Portfolio Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-title').value = item.title;
    document.getElementById('item-category').value = item.category;
    document.getElementById('item-image').value = item.image;
    document.getElementById('item-description').value = item.description || '';
  } else {
    title.textContent = 'Add Portfolio Item';
    document.getElementById('item-id').value = '';
  }

  var imageInput = document.getElementById('item-image');
  var imageUploadBtn = document.getElementById('item-image-upload-btn');
  if (imageInput && imageUploadBtn) attachUploadButton(imageInput, imageUploadBtn);
  modal.classList.add('is-open');
}

function closeModal() {
  document.getElementById('item-modal').classList.remove('is-open');
}

async function handleSaveItem(e) {
  e.preventDefault();
  var status = document.getElementById('item-form-status');
  var saveBtn = document.getElementById('modal-save-btn');
  status.textContent = '';
  status.className = 'form-status';
  var id = document.getElementById('item-id').value;
  var payload = {
    title: document.getElementById('item-title').value.trim(),
    category: document.getElementById('item-category').value,
    image: document.getElementById('item-image').value.trim(),
    description: document.getElementById('item-description').value.trim()
  };
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  try {
    var url = id ? API_BASE + '/api/portfolio/' + id : API_BASE + '/api/portfolio';
    var method = id ? 'PUT' : 'POST';
    var res = await authFetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save item.');
    closeModal();
    loadPortfolioItems();
  } catch (err) {
    status.textContent = err.message;
    status.className = 'form-status is-error';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function handleDeleteItem(id) {
  if (!confirm('Delete this item? Cannot be undone.')) return;
  try {
    var res = await authFetch(API_BASE + '/api/portfolio/' + id, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Could not delete.');
    loadPortfolioItems();
  } catch (err) { alert(err.message); }
}

async function loadMessages() {
  var tbody = document.getElementById('messages-table-body');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try {
    var res = await authFetch(API_BASE + '/api/messages');
    var messages = await res.json();
    if (!messages.length) { tbody.innerHTML = '<tr><td colspan="4">No messages yet.</td></tr>'; return; }
    tbody.innerHTML = messages.map(function(m) {
      return '<tr><td>' + new Date(m.receivedAt).toLocaleString() + '</td><td>' + escapeHTML(m.name) + '</td><td>' + escapeHTML(m.email) + '</td><td>' + escapeHTML(m.message) + '</td></tr>';
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4">Could not load messages.</td></tr>';
  }
}

async function loadSiteContentIntoForms() {
  try {
    var res = await fetch(API_BASE + '/api/content');
    var content = await res.json();
    if (content.about) {
      currentAboutData = content.about;
      document.getElementById('about-bio-input').value = content.about.bio || '';
      renderSkillsEditor(content.about.skills || []);
      renderPricingEditor(content.about.pricing || []);
      var img1Input = document.getElementById('about-hero-img-1-input');
      var img2Input = document.getElementById('about-hero-img-2-input');
      if (img1Input) img1Input.value = content.about.heroImage1 || '';
      if (img2Input) img2Input.value = content.about.heroImage2 || '';
      var img1Btn = document.getElementById('about-hero-img-1-upload-btn');
      var img2Btn = document.getElementById('about-hero-img-2-upload-btn');
      if (img1Input && img1Btn) attachUploadButton(img1Input, img1Btn);
      if (img2Input && img2Btn) attachUploadButton(img2Input, img2Btn);
    }
    if (content.contact) {
      document.getElementById('contact-intro-input').value = content.contact.intro || '';
      document.getElementById('contact-email-input').value = content.contact.email || '';
      document.getElementById('contact-location-input').value = content.contact.location || '';
      document.getElementById('contact-response-input').value = content.contact.responseTime || '';
      document.getElementById('contact-whatsapp-input').value = content.contact.whatsappNumber || '';
    }
    if (content.site) {
      document.getElementById('site-name-input').value = content.site.name || '';
      document.getElementById('site-tagline-input').value = content.site.tagline || '';
      document.getElementById('site-avatar-input').value = content.site.avatar || '';
      if (content.site.social) {
        var s = content.site.social;
        var fields = { instagram: 'social-instagram', twitter: 'social-twitter', linkedin: 'social-linkedin', youtube: 'social-youtube', whatsapp: 'social-whatsapp' };
        Object.entries(fields).forEach(function(entry) {
          var el = document.getElementById(entry[1]);
          if (el) el.value = s[entry[0]] || '';
        });
      }
      var avatarInput = document.getElementById('site-avatar-input');
      var avatarUploadBtn = document.getElementById('avatar-upload-btn');
      if (avatarInput && avatarUploadBtn) attachUploadButton(avatarInput, avatarUploadBtn);
    }
    if (content.theme) document.getElementById('theme-accent-input').value = content.theme.accentColor || '#4db6ac';
    if (content.categories) document.getElementById('categories-input').value = content.categories.join('\n');
    if (content.footer) {
      document.getElementById('footer-text-input').value = content.footer.text || '';
      document.getElementById('footer-tags-input').value = (content.footer.tags || []).join('\n');
      renderBlogPostsEditor(content.footer.blogPosts || []);
    }
  } catch (err) { console.error('Could not load site content.', err); }
}

function renderSkillsEditor(skills) {
  var container = document.getElementById('about-skills-editor');
  container.innerHTML = '';
  skills.forEach(function(skill) { addSkillRow(skill); });
}

function addSkillRow(skill) {
  var container = document.getElementById('about-skills-editor');
  var row = document.createElement('div');
  row.className = 'editor-row';
  row.innerHTML = '<input type="text" class="skill-name-input" placeholder="Skill name" value="' + escapeHTML(skill.name || '') + '">' +
    '<input type="number" class="skill-percent-input" min="0" max="100" placeholder="%" value="' + (skill.percent !== undefined ? skill.percent : 80) + '">' +
    '<button type="button" class="remove-row-btn">Remove</button>';
  row.querySelector('.remove-row-btn').addEventListener('click', function() { row.remove(); });
  container.appendChild(row);
}

function collectSkillsFromEditor() {
  var rows = document.querySelectorAll('#about-skills-editor .editor-row');
  var skills = [];
  rows.forEach(function(row) {
    var name = row.querySelector('.skill-name-input').value.trim();
    var percent = Number(row.querySelector('.skill-percent-input').value) || 0;
    if (name) skills.push({ name: name, percent: Math.min(100, Math.max(0, percent)) });
  });
  return skills;
}

function renderPricingEditor(plans) {
  var container = document.getElementById('about-pricing-editor');
  container.innerHTML = '';
  plans.forEach(function(plan) { addPricingCard(plan); });
}

function addPricingCard(plan) {
  var container = document.getElementById('about-pricing-editor');
  var card = document.createElement('div');
  card.className = 'pricing-editor-card';
  card.innerHTML =
    '<label>Plan name</label><input type="text" class="plan-name-input" value="' + escapeHTML(plan.name || '') + '">' +
    '<label>Monthly price ($)</label><input type="number" class="plan-price-input" min="0" value="' + (plan.price || 0) + '">' +
    '<label>Features (one per line)</label><textarea class="plan-features-input" rows="4">' + escapeHTML((plan.features || []).join('\n')) + '</textarea>' +
    '<label class="featured-check"><input type="checkbox" class="plan-featured-input" ' + (plan.featured ? 'checked' : '') + '> Highlight this plan</label>' +
    '<button type="button" class="remove-row-btn">Remove Package</button>';
  card.querySelector('.remove-row-btn').addEventListener('click', function() { card.remove(); });
  container.appendChild(card);
}

function collectPricingFromEditor() {
  var cards = document.querySelectorAll('#about-pricing-editor .pricing-editor-card');
  var plans = [];
  cards.forEach(function(card) {
    var name = card.querySelector('.plan-name-input').value.trim();
    var price = Number(card.querySelector('.plan-price-input').value) || 0;
    var features = card.querySelector('.plan-features-input').value.split('\n').map(function(f) { return f.trim(); }).filter(Boolean);
    var featured = card.querySelector('.plan-featured-input').checked;
    if (name) plans.push({ name: name, price: price, features: features, featured: featured });
  });
  return plans;
}

async function handleSaveAbout(e) {
  e.preventDefault();
  var status = document.getElementById('about-form-status');
  status.textContent = ''; status.className = 'form-status';
  var img1 = document.getElementById('about-hero-img-1-input');
  var img2 = document.getElementById('about-hero-img-2-input');
  var payload = { about: Object.assign({}, currentAboutData, {
    bio: document.getElementById('about-bio-input').value.trim(),
    skills: collectSkillsFromEditor(),
    pricing: collectPricingFromEditor(),
    heroImage1: img1 ? img1.value.trim() : '',
    heroImage2: img2 ? img2.value.trim() : ''
  })};
  try {
    var res = await authFetch(API_BASE + '/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    currentAboutData = data.about;
    status.textContent = 'About page saved!'; status.className = 'form-status is-success';
  } catch (err) { status.textContent = err.message; status.className = 'form-status is-error'; }
}

async function handleSaveContact(e) {
  e.preventDefault();
  var status = document.getElementById('contact-form-edit-status');
  status.textContent = ''; status.className = 'form-status';
  var payload = { contact: {
    intro: document.getElementById('contact-intro-input').value.trim(),
    email: document.getElementById('contact-email-input').value.trim(),
    location: document.getElementById('contact-location-input').value.trim(),
    responseTime: document.getElementById('contact-response-input').value.trim(),
    whatsappNumber: document.getElementById('contact-whatsapp-input').value.trim()
  }};
  try {
    var res = await authFetch(API_BASE + '/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    status.textContent = 'Contact page saved!'; status.className = 'form-status is-success';
  } catch (err) { status.textContent = err.message; status.className = 'form-status is-error'; }
}

function renderBlogPostsEditor(posts) {
  var container = document.getElementById('footer-blog-editor');
  container.innerHTML = '';
  posts.forEach(function(post) { addBlogPostRow(post); });
}

function addBlogPostRow(post) {
  var container = document.getElementById('footer-blog-editor');
  var row = document.createElement('div');
  row.className = 'blog-editor-row';
  row.innerHTML = '<input type="text" class="blog-title-input" placeholder="Title" value="' + escapeHTML(post.title || '') + '">' +
    '<input type="text" class="blog-subtitle-input" placeholder="Subtitle" value="' + escapeHTML(post.subtitle || '') + '">' +
    '<input type="text" class="blog-image-input" placeholder="Image path/URL" value="' + escapeHTML(post.image || '') + '">' +
    '<button type="button" class="remove-row-btn">Remove</button>';
  row.querySelector('.remove-row-btn').addEventListener('click', function() { row.remove(); });
  container.appendChild(row);
}

function collectBlogPostsFromEditor() {
  var rows = document.querySelectorAll('#footer-blog-editor .blog-editor-row');
  var posts = [];
  rows.forEach(function(row) {
    var title = row.querySelector('.blog-title-input').value.trim();
    var subtitle = row.querySelector('.blog-subtitle-input').value.trim();
    var image = row.querySelector('.blog-image-input').value.trim();
    if (title) posts.push({ title: title, subtitle: subtitle, image: image });
  });
  return posts;
}

async function handleSaveSocial(e) {
  e.preventDefault();
  var status = document.getElementById('social-form-status');
  status.textContent = ''; status.className = 'form-status';
  var payload = { site: {
    name: document.getElementById('site-name-input').value.trim(),
    tagline: document.getElementById('site-tagline-input').value.trim(),
    avatar: document.getElementById('site-avatar-input').value.trim(),
    social: {
      instagram: document.getElementById('social-instagram').value.trim(),
      twitter: document.getElementById('social-twitter').value.trim(),
      linkedin: document.getElementById('social-linkedin').value.trim(),
      youtube: document.getElementById('social-youtube').value.trim(),
      whatsapp: document.getElementById('social-whatsapp').value.trim()
    }
  }};
  try {
    var res = await authFetch(API_BASE + '/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    status.textContent = 'Social links saved!'; status.className = 'form-status is-success';
  } catch (err) { status.textContent = err.message; status.className = 'form-status is-error'; }
}

async function handleSaveSite(e) {
  e.preventDefault();
  var status = document.getElementById('site-form-status');
  status.textContent = ''; status.className = 'form-status';
  var categories = document.getElementById('categories-input').value.split('\n').map(function(c) { return c.trim(); }).filter(Boolean);
  var tags = document.getElementById('footer-tags-input').value.split('\n').map(function(t) { return t.trim(); }).filter(Boolean);
  var payload = {
    site: { name: document.getElementById('site-name-input').value.trim(), tagline: document.getElementById('site-tagline-input').value.trim(), avatar: document.getElementById('site-avatar-input').value.trim() },
    theme: { accentColor: document.getElementById('theme-accent-input').value },
    categories: categories,
    footer: { text: document.getElementById('footer-text-input').value.trim(), blogPosts: collectBlogPostsFromEditor(), tags: tags }
  };
  try {
    var res = await authFetch(API_BASE + '/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save.');
    status.textContent = 'Saved! Refresh any page to see changes.'; status.className = 'form-status is-success';
  } catch (err) { status.textContent = err.message; status.className = 'form-status is-error'; }
}

function attachUploadButton(inputEl, buttonEl) {
  buttonEl.addEventListener('click', function() {
    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', async function() {
      var file = fileInput.files[0];
      if (!file) return;
      var originalText = buttonEl.textContent;
      buttonEl.textContent = 'Uploading...'; buttonEl.disabled = true;
      try {
        var downloadURL = await uploadImageToCloudinary(file);
        inputEl.value = downloadURL;
        inputEl.dispatchEvent(new Event('input'));
      } catch (err) { alert('Upload failed: ' + err.message); }
      finally { buttonEl.textContent = originalText; buttonEl.disabled = false; document.body.removeChild(fileInput); }
    });
    fileInput.click();
  });
}

function escapeHTML(str) {
  var div = document.createElement('div');
  div.textContent = str !== null && str !== undefined ? str : '';
  return div.innerHTML;
}