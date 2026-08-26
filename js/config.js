/* =========================================================
   CONFIG.JS — API base URL
   Locally: uses relative URLs (empty string)
   On Vercel: points to the Render backend
   ========================================================= */
var API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? ''
  : 'https://famousgraphix.onrender.com';
