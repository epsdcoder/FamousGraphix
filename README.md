# My Portfolio — Multi‑Page Website (HTML/CSS/JS + Node Backend)

A 4‑page portfolio website (Portfolio, About, Contact, Admin) built with plain
HTML, CSS and JavaScript on the front end, and a small Node.js/Express backend
that powers the portfolio gallery, the contact form, and an admin panel for
editing content without touching code.

```
portfolio-site/
├── index.html          ← Portfolio (gallery) page
├── about.html           ← About / skills / pricing page
├── contact.html         ← Contact form page
├── admin.html            ← Admin login + dashboard (protected)
├── package.json
├── css/
│   ├── style.css        ← layout, components, colors, type
│   └── responsive.css    ← breakpoints / mobile menu
├── js/
│   ├── main.js           ← shared: mobile menu, nav highlight, filters, skill bars
│   ├── portfolio.js       ← loads gallery items from the backend (index.html)
│   ├── contact.js          ← submits the contact form to the backend
│   └── admin.js            ← admin login + CRUD for portfolio items + messages
├── server/
│   └── server.js          ← Express server + REST API
└── data/
    ├── portfolio.json      ← portfolio items "database" (flat JSON file)
    └── messages.json        ← contact form submissions "database"
```

## 1. Open it in VS Code

1. Unzip the project folder.
2. In VS Code: **File → Open Folder…** and select `portfolio-site`.
3. Install the **Live Server** or **Live Preview** extension if you also want
   to preview *static* HTML quickly — but for the contact form and admin
   panel to work you need to run the real backend (step 2 below), because
   those features talk to the API.

## 2. Run the backend

You need [Node.js](https://nodejs.org) installed (v18+ recommended).

Open a terminal in VS Code (`` Ctrl+` ``) inside the `portfolio-site` folder and run:

```bash
npm install
npm start
```

You should see:

```
Portfolio server running at http://localhost:3000
Admin page:           http://localhost:3000/admin.html
Admin password:       admin123  (change in server/server.js)
```

Now open **http://localhost:3000** in your browser. All 4 pages, the
contact form, and the admin panel will work fully, because Express is both
serving the static files *and* the API from the same server.

> Tip: `npm run dev` restarts the server automatically whenever you save a
> backend file, using Node's built‑in `--watch` flag.

## 3. Editing content

### Change text, images, nav links
Edit the HTML files directly (`index.html`, `about.html`, `contact.html`,
`admin.html`). Each page repeats the same sidebar/footer markup — if you
change one (e.g. add a nav link), copy the same change into the other pages.

### Change colors, fonts, spacing
Edit `css/style.css` — all colors and sizes are defined once at the top as
CSS variables (the `:root { ... }` block), so changing
`--color-accent` there updates every accent‑colored button/highlight
across the whole site.

### Change mobile breakpoints
Edit `css/responsive.css`.

### Replace placeholder images
The `images/` folder currently has simple SVG placeholders
(`avatar.svg`, `about-1.svg`, `about-2.svg`, `blog-1.svg`, `blog-2.svg`) so the
site works out of the box with no external downloads. Replace them with your
own photos — keep the same filenames, or update the `src=` attributes in the
HTML if you rename them. Add `images/resume.pdf` if you want the "Download
Resume" button on the About page to work.

### Edit portfolio gallery items (two ways)
**Easiest:** open **http://localhost:3000/admin.html**, log in with the admin
password (`admin123` by default), and use **Add / Edit / Delete** — changes
save instantly to `data/portfolio.json`.

**Manual:** edit `data/portfolio.json` directly in VS Code. Each item looks
like:

```json
{
  "id": "p1",
  "title": "Mountain Road",
  "category": "photos",
  "image": "https://example.com/photo.jpg",
  "description": "Short description text."
}
```

`category` must be one of `design`, `photos`, or `art` to match the filter
buttons on the Portfolio page.

### Change the admin password
Open `server/server.js` and edit this line near the top:

```js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
```

Replace `'admin123'` with your own password (or set the `ADMIN_PASSWORD`
environment variable instead of hardcoding it — recommended if you ever
deploy this publicly).

### View contact form messages
Anyone who submits the contact form gets saved to `data/messages.json`. You
can read them there directly, or log into `admin.html` to see them in a
table.

## 4. How the pieces talk to each other

- **Portfolio page** (`index.html` + `js/portfolio.js`) calls
  `GET /api/portfolio` on page load and renders the gallery grid from the
  response. If the backend isn't running, it falls back to a small built‑in
  sample list so the page doesn't look broken.
- **Contact page** (`contact.html` + `js/contact.js`) calls
  `POST /api/contact` with `{ name, email, message }`. The server validates
  the fields and appends the message to `data/messages.json`.
- **Admin page** (`admin.html` + `js/admin.js`) calls `POST /api/admin/login`
  with the password to get a temporary token, then uses that token
  (`Authorization: Bearer <token>`) to call the protected
  `POST/PUT/DELETE /api/portfolio/...` and `GET /api/messages` routes.

## 5. Deploying

This is a normal Node/Express app, so it deploys anywhere that runs Node:
Render, Railway, Fly.io, a VPS, etc. Two things to do before going live:

1. Set a real `ADMIN_PASSWORD` environment variable (don't leave the default).
2. The JSON "database" in `/data` works fine for a small personal site, but
   if you expect heavy traffic or multiple editors at once, swap it for a
   real database later — the API routes in `server/server.js` are written so
   that swap only touches the `readJSON`/`writeJSON` helper functions.

## 6. Browser support / accessibility notes

- Mobile sidebar collapses into a hamburger‑triggered drawer below 768px.
- All interactive elements have visible keyboard focus styles.
- Forms use native HTML5 validation (`required`, `type="email"`,
  `minlength`) plus a friendlier JS-driven status message.
