/* =========================================================
   SERVER.JS — Portfolio Site Backend (Firebase Auth + Firestore)
   ========================================================= */

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR          = path.join(__dirname, '..', 'data');
const PORTFOLIO_FILE    = path.join(DATA_DIR, 'portfolio.json');
const MESSAGES_FILE     = path.join(DATA_DIR, 'messages.json');
const CONTENT_FILE      = path.join(DATA_DIR, 'site-content.json');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');
const SERVICES_FILE     = path.join(DATA_DIR, 'services.json');

/* ---------------------------------------------------------
   Firebase Admin — Firestore is now the permanent data store.
   Local JSON files under /data are ONLY used once, to seed
   Firestore the first time this runs (so existing content
   isn't lost during the migration). After that, Firestore
   is the single source of truth and survives restarts/deploys.

   Credentials: set an environment variable on Render called
   FIREBASE_SERVICE_ACCOUNT containing the full contents of
   your service account JSON key (as one line). Locally, it
   falls back to reading serviceAccountKey.json from disk.
   --------------------------------------------------------- */
const FIREBASE_PROJECT_ID = 'portfolio-site-9399d';

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  return require('../serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount())
});
const db = admin.firestore();

/* ---------------------------------------------------------
   Firestore helpers
   --------------------------------------------------------- */
async function getAll(collectionName, orderField, direction) {
  const snap = await db.collection(collectionName).get();
  const docs = snap.docs.map(d => d.data());
  docs.sort((a, b) => {
    const av = a[orderField], bv = b[orderField];
    if (av === bv) return 0;
    return direction === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
  return docs;
}

async function setDoc(collectionName, id, data) {
  await db.collection(collectionName).doc(id).set(data);
}

async function updateDoc(collectionName, id, patch) {
  await db.collection(collectionName).doc(id).update(patch);
}

async function deleteDoc(collectionName, id) {
  await db.collection(collectionName).doc(id).delete();
}

async function getContentDoc() {
  const doc = await db.collection('siteContent').doc('main').get();
  return doc.exists ? doc.data() : {};
}

async function setContentDoc(data) {
  await db.collection('siteContent').doc('main').set(data, { merge: true });
}

/* ---------------------------------------------------------
   One-time seed — if a Firestore collection is empty, fill
   it from the matching local JSON file (existing project
   data), so migrating to Firestore doesn't lose anything.
   Safe to leave in permanently: it only ever acts on empty
   collections, so it's a no-op after the first run.
   --------------------------------------------------------- */
async function seedIfEmpty(collectionName, filePath) {
  const snap = await db.collection(collectionName).limit(1).get();
  if (!snap.empty) return;
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const items = JSON.parse(raw);
    const batch = db.batch();
    items.forEach(item => {
      const id = item.id || crypto.randomUUID();
      batch.set(db.collection(collectionName).doc(id), { ...item, id });
    });
    await batch.commit();
    console.log(`Seeded Firestore collection "${collectionName}" with ${items.length} item(s).`);
  } catch (err) {
    console.log(`Skipped seeding "${collectionName}":`, err.message);
  }
}

async function seedContentIfEmpty() {
  const doc = await db.collection('siteContent').doc('main').get();
  if (doc.exists) return;
  try {
    const raw = await fs.readFile(CONTENT_FILE, 'utf-8');
    await db.collection('siteContent').doc('main').set(JSON.parse(raw));
    console.log('Seeded Firestore site content.');
  } catch (err) {
    console.log('Skipped seeding site content:', err.message);
  }
}

async function seedAll() {
  await Promise.all([
    seedIfEmpty('portfolio', PORTFOLIO_FILE),
    seedIfEmpty('testimonials', TESTIMONIALS_FILE),
    seedIfEmpty('services', SERVICES_FILE),
    seedIfEmpty('messages', MESSAGES_FILE),
    seedContentIfEmpty()
  ]);
}

/* ---------------------------------------------------------
   Firebase Auth — verify ID tokens from the client
   --------------------------------------------------------- */
async function verifyFirebaseToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Token audience mismatch');
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

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

/* ---------------------------------------------------------
   File upload API (legacy — image uploads now go straight
   to Cloudinary from the browser; this route is unused but
   left in place harmlessly)
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
  try { res.json(await getAll('portfolio', 'createdAt', 'desc')); }
  catch (err) { res.status(500).json({ error: 'Could not read portfolio data.' }); }
});

app.post('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const { title, category, image, description } = req.body;
    if (isBlank(title) || isBlank(category) || isBlank(image))
      return res.status(400).json({ error: 'title, category, and image are required.' });
    const newItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category: category.trim().toLowerCase(),
      image: image.trim(),
      description: (description || '').trim(),
      createdAt: Date.now()
    };
    await setDoc('portfolio', newItem.id, newItem);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save the new item.' }); }
});

app.put('/api/portfolio/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('portfolio').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Item not found.' });
    const { title, category, image, description } = req.body;
    const patch = {
      ...(title !== undefined && { title: title.trim() }),
      ...(category !== undefined && { category: category.trim().toLowerCase() }),
      ...(image !== undefined && { image: image.trim() }),
      ...(description !== undefined && { description: description.trim() })
    };
    await updateDoc('portfolio', req.params.id, patch);
    res.json({ ...doc.data(), ...patch });
  } catch (err) { res.status(500).json({ error: 'Could not update the item.' }); }
});

app.delete('/api/portfolio/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('portfolio').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Item not found.' });
    await deleteDoc('portfolio', req.params.id);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete the item.' }); }
});

/* ---------------------------------------------------------
   Site content API
   --------------------------------------------------------- */
app.get('/api/content', async (req, res) => {
  try { res.json(await getContentDoc()); }
  catch (err) { res.status(500).json({ error: 'Could not read site content.' }); }
});

app.put('/api/content', requireAuth, async (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object')
      return res.status(400).json({ error: 'Invalid content payload.' });
    const current = await getContentDoc();
    const mergeableKeys = ['site', 'categories', 'theme', 'about', 'contact', 'footer'];
    const updated = { ...current };
    mergeableKeys.forEach(key => {
      if (incoming[key] !== undefined) updated[key] = incoming[key];
    });
    await setContentDoc(updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Could not save site content.' }); }
});

/* ---------------------------------------------------------
   Testimonials API
   --------------------------------------------------------- */
app.get('/api/testimonials', async (req, res) => {
  try { res.json(await getAll('testimonials', 'createdAt', 'desc')); }
  catch (err) { res.status(500).json({ error: 'Could not read testimonials.' }); }
});

app.post('/api/testimonials', requireAuth, async (req, res) => {
  try {
    const { name, role, rating, text, avatar } = req.body;
    if (!name || !text)
      return res.status(400).json({ error: 'Name and text are required.' });
    const newItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: (role || '').trim(),
      rating: Number(rating) || 5,
      text: text.trim(),
      avatar: (avatar || '').trim(),
      createdAt: Date.now()
    };
    await setDoc('testimonials', newItem.id, newItem);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save testimonial.' }); }
});

app.put('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('testimonials').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found.' });
    await updateDoc('testimonials', req.params.id, req.body);
    res.json({ ...doc.data(), ...req.body });
  } catch (err) { res.status(500).json({ error: 'Could not update testimonial.' }); }
});

app.delete('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    await deleteDoc('testimonials', req.params.id);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: 'Could not delete testimonial.' }); }
});

/* ---------------------------------------------------------
   Services API
   --------------------------------------------------------- */
app.get('/api/services', async (req, res) => {
  try { res.json(await getAll('services', 'createdAt', 'asc')); }
  catch (err) { res.status(500).json({ error: 'Could not read services.' }); }
});

app.post('/api/services', requireAuth, async (req, res) => {
  try {
    const { icon, title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const newItem = {
      id: crypto.randomUUID(),
      icon: (icon || '').trim(),
      title: title.trim(),
      description: (description || '').trim(),
      createdAt: Date.now()
    };
    await setDoc('services', newItem.id, newItem);
    res.status(201).json(newItem);
  } catch (err) { res.status(500).json({ error: 'Could not save service.' }); }
});

app.put('/api/services/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('services').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found.' });
    await updateDoc('services', req.params.id, req.body);
    res.json({ ...doc.data(), ...req.body });
  } catch (err) { res.status(500).json({ error: 'Could not update service.' }); }
});

app.delete('/api/services/:id', requireAuth, async (req, res) => {
  try {
    await deleteDoc('services', req.params.id);
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
    const newMessage = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      receivedAt: new Date().toISOString(),
      read: false
    };
    await setDoc('messages', newMessage.id, newMessage);
    res.status(201).json({ ok: true, message: 'Thanks! Your message has been sent.' });
  } catch (err) { res.status(500).json({ error: 'Something went wrong sending your message.' }); }
});

app.get('/api/messages', requireAuth, async (req, res) => {
  try { res.json(await getAll('messages', 'receivedAt', 'desc')); }
  catch (err) { res.status(500).json({ error: 'Could not read messages.' }); }
});

app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('messages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Message not found.' });
    const patch = {};
    if (req.body.read !== undefined) patch.read = !!req.body.read;
    await updateDoc('messages', req.params.id, patch);
    res.json({ ...doc.data(), ...patch });
  } catch (err) { res.status(500).json({ error: 'Could not update message.' }); }
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const doc = await db.collection('messages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Message not found.' });
    await deleteDoc('messages', req.params.id);
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
seedAll().finally(() => {
  app.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
    console.log(`Login page:  http://localhost:${PORT}/login.html`);
    console.log(`Admin page:  http://localhost:${PORT}/admin.html`);
  });
});