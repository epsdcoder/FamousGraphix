/* =========================================================
   SERVER.JS — Portfolio Site Backend (Firebase Auth version)
   ========================================================= */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR          = path.join(__dirname, '..', 'data');
const PORTFOLIO_FILE    = path.join(DATA_DIR, 'portfolio.json');
const MESSAGES_FILE     = path.join(DATA_DIR, 'messages.json');
const CONTENT_FILE      = path.join(DATA_DIR, 'site-content.json');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');
const SERVICES_FILE     = path.join(DATA_DIR, 'services.json');

/* ---------------------------------------------------------
   Firebase Admin — verify ID tokens from the client
   --------------------------------------------------------- */
const FIREBASE_PROJECT_ID = 'portfolio-site-9399d';

async function verifyFirebaseToken(token) {
  // Verify Firebase ID token using Google's public keys
  // Split the JWT to get the header and payload
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  // Decode payload (base64url)
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');

  // Check audience matches our Firebase project
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Token audience mismatch');

  // Check issuer
  if (payload.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) throw new Error('Invalid issuer');

  return payload;
}

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  try {
    await verifyFirebaseToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

app.use(express.json());

// CORS — allow Vercel frontend to talk to this Render backend
app.use(function(req, res, next) {
  var allowed = ['https://famous-graphix.vercel.app', 'http://localhost:3000'];
  var origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.static(path.join(__dirname, '..')));

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

/* ---------------------------------------------------------
   File upload API
   --------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'images'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed.'));
};

const upload = multer({
  storage, fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({ path: 'images/' + req.file.filename });
});

/* ---------------------------------------------------------
   Portfolio API
   --------------------------------------------------------- */
app.get('/api/portfolio', async (req, res) => {
  try { res.json(await readJSON(PORTFOLIO_FILE)); }
  catch (err) { res.status(500).json({ error: 'Could not read portfolio data.' }); }
});

app.post('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const { title, category, image, description } = req.body;
    if (isBlank(title) || isBlank(category) || isBlank(image))
      return res.status(400).json({ error: 'title, category, and image are required.' });
    const items = await readJSON(PORTFOLIO_FILE);
    const newItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category: category.trim().toLowerCase(),
      image: image.trim(),
      description: (description || '').trim()
    };
    items.unshift(newItem);
    await writeJSON(PORTFOLIO_FILE, items);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save the new item.' }); }
});

app.put('/api/portfolio/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(PORTFOLIO_FILE);
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found.' });
    const { title, category, image, description } = req.body;
    items[idx] = {
      ...items[idx],
      ...(title !== undefined && { title: title.trim() }),
      ...(category !== undefined && { category: category.trim().toLowerCase() }),
      ...(image !== undefined && { image: image.trim() }),
      ...(description !== undefined && { description: description.trim() })
    };
    await writeJSON(PORTFOLIO_FILE, items);
    res.json(items[idx]);
  } catch (err) { res.status(500).json({ error: 'Could not update the item.' }); }
});

app.delete('/api/portfolio/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(PORTFOLIO_FILE);
    const next = items.filter(i => i.id !== req.params.id);
    if (next.length === items.length)
      return res.status(404).json({ error: 'Item not found.' });
    await writeJSON(PORTFOLIO_FILE, next);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete the item.' }); }
});

/* ---------------------------------------------------------
   Site content API
   --------------------------------------------------------- */
app.get('/api/content', async (req, res) => {
  try { res.json(await readJSON(CONTENT_FILE)); }
  catch (err) { res.status(500).json({ error: 'Could not read site content.' }); }
});

app.put('/api/content', requireAuth, async (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object')
      return res.status(400).json({ error: 'Invalid content payload.' });
    const current = await readJSON(CONTENT_FILE);
    const mergeableKeys = ['site', 'categories', 'theme', 'about', 'contact', 'footer'];
    const updated = { ...current };
    mergeableKeys.forEach(key => {
      if (incoming[key] !== undefined) updated[key] = incoming[key];
    });
    await writeJSON(CONTENT_FILE, updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Could not save site content.' }); }
});

/* ---------------------------------------------------------
   Testimonials API
   --------------------------------------------------------- */
app.get('/api/testimonials', async (req, res) => {
  try { res.json(await readJSON(TESTIMONIALS_FILE)); }
  catch (err) { res.status(500).json({ error: 'Could not read testimonials.' }); }
});

app.post('/api/testimonials', requireAuth, async (req, res) => {
  try {
    const { name, role, rating, text, avatar } = req.body;
    if (!name || !text)
      return res.status(400).json({ error: 'Name and text are required.' });
    const items = await readJSON(TESTIMONIALS_FILE);
    const newItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: (role || '').trim(),
      rating: Number(rating) || 5,
      text: text.trim(),
      avatar: (avatar || '').trim()
    };
    items.unshift(newItem);
    await writeJSON(TESTIMONIALS_FILE, items);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save testimonial.' }); }
});

app.put('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(TESTIMONIALS_FILE);
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    items[idx] = { ...items[idx], ...req.body };
    await writeJSON(TESTIMONIALS_FILE, items);
    res.json(items[idx]);
  } catch (err) { res.status(500).json({ error: 'Could not update testimonial.' }); }
});

app.delete('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(TESTIMONIALS_FILE);
    const next = items.filter(i => i.id !== req.params.id);
    await writeJSON(TESTIMONIALS_FILE, next);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete testimonial.' }); }
});

/* ---------------------------------------------------------
   Services API
   --------------------------------------------------------- */
app.get('/api/services', async (req, res) => {
  try { res.json(await readJSON(SERVICES_FILE)); }
  catch (err) { res.status(500).json({ error: 'Could not read services.' }); }
});

app.post('/api/services', requireAuth, async (req, res) => {
  try {
    const { icon, title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const items = await readJSON(SERVICES_FILE);
    const newItem = {
      id: crypto.randomUUID(),
      icon: (icon || '').trim(),
      title: title.trim(),
      description: (description || '').trim()
    };
    items.push(newItem);
    await writeJSON(SERVICES_FILE, items);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save service.' }); }
});

app.put('/api/services/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(SERVICES_FILE);
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    items[idx] = { ...items[idx], ...req.body };
    await writeJSON(SERVICES_FILE, items);
    res.json(items[idx]);
  } catch (err) { res.status(500).json({ error: 'Could not update service.' }); }
});

app.delete('/api/services/:id', requireAuth, async (req, res) => {
  try {
    const items = await readJSON(SERVICES_FILE);
    const next = items.filter(i => i.id !== req.params.id);
    await writeJSON(SERVICES_FILE, next);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete service.' }); }
});

/* ---------------------------------------------------------
   Contact form API
   --------------------------------------------------------- */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (isBlank(name) || isBlank(email) || isBlank(message))
      return res.status(400).json({ error: 'Name, email, and message are all required.' });
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email))
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    const messages = await readJSON(MESSAGES_FILE);
    messages.unshift({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      receivedAt: new Date().toISOString(),
      read: false
    });
    await writeJSON(MESSAGES_FILE, messages);
    res.status(201).json({ ok: true, message: 'Thanks! Your message has been sent.' });
  } catch (err) { res.status(500).json({ error: 'Something went wrong sending your message.' }); }
});

app.get('/api/messages', requireAuth, async (req, res) => {
  try { res.json(await readJSON(MESSAGES_FILE)); }
  catch (err) { res.status(500).json({ error: 'Could not read messages.' }); }
});

app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const messages = await readJSON(MESSAGES_FILE);
    const idx = messages.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Message not found.' });
    if (req.body.read !== undefined) messages[idx].read = !!req.body.read;
    await writeJSON(MESSAGES_FILE, messages);
    res.json(messages[idx]);
  } catch (err) { res.status(500).json({ error: 'Could not update message.' }); }
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const messages = await readJSON(MESSAGES_FILE);
    const next = messages.filter(m => m.id !== req.params.id);
    if (next.length === messages.length)
      return res.status(404).json({ error: 'Message not found.' });
    await writeJSON(MESSAGES_FILE, next);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete message.' }); }
});

/* ---------------------------------------------------------
   Error handler
   --------------------------------------------------------- */
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Only image'))
    return res.status(400).json({ error: err.message });
  next(err);
});

/* ---------------------------------------------------------
   Start server
   --------------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
  console.log(`Login page:  http://localhost:${PORT}/login.html`);
  console.log(`Admin page:  http://localhost:${PORT}/admin.html`);
});