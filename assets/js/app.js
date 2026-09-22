(function () {
'use strict';
/* ===== 00-core.js ===== */
/* ==========================================================================
   00-core.js — configuration, helpers, i18n, icons, backend client
   All source files are concatenated into one IIFE by tools/build.js.
   ========================================================================== */

/* ---------- runtime configuration (window.BICON_CONFIG comes from config.js) ---------- */
const CFG = (function () {
  const d = {
    gasUrl: '',                 // Google Apps Script web app URL (…/exec)
    basePath: null,             // null = auto-detect; '' for Blogger root
    firebase: null,             // { apiKey, authDomain, projectId, appId }
    newsFeed: '/feeds/posts/default/-/News?alt=json&max-results=6',
    ojs: {
      baseUrl: 'https://proceeding.poltekkesbengkulu.ac.id/index.php/B-ICON',
      submitUrl: '',            // default: baseUrl + '/about/submissions'
      registerUrl: '',          // default: baseUrl + '/user/register'
      loginUrl: ''              // default: baseUrl + '/login'
    },
    features: {
      manuscriptUpload: true,   // allow a backup abstract/manuscript upload on the registration form
      posterUpload: true,       // allow accepted presenters to upload posters from My Registration
      appreciate: true,         // "appreciate" button on posters (needs Firestore + anonymous auth)
      demo: false,              // ?demo=1 shows sample posters (for previews only)
      whatsappFloat: true
    },
    limits: { abstractWords: 300, manuscriptMB: 5, proofMB: 3, posterMB: 8 },
    ga: ''
  };
  const u = window.BICON_CONFIG || {};
  const out = Object.assign({}, d, u);
  out.ojs = Object.assign({}, d.ojs, u.ojs || {});
  out.features = Object.assign({}, d.features, u.features || {});
  out.limits = Object.assign({}, d.limits, u.limits || {});
  const b = out.ojs.baseUrl.replace(/\/$/, '');
  out.ojs.submitUrl = out.ojs.submitUrl || b + '/about/submissions';
  out.ojs.registerUrl = out.ojs.registerUrl || b + '/user/register';
  out.ojs.loginUrl = out.ojs.loginUrl || b + '/login';
  return out;
})();

const SITE = window.BICON_SITE;
const ROOT = document.getElementById('bicon-root');

/* asset base: the folder that contains js/, css/, img/ … derived from this script's own URL */
const ASSET = (function () {
  let src = '';
  try { src = (document.currentScript && document.currentScript.src) || ''; } catch (e) { /* ignore */ }
  if (!src) {
    const s = document.querySelector('script[src*="app.js"], script[src*="app.min.js"]');
    src = s ? s.src : '';
  }
  return src.replace(/js\/app(\.min)?\.js.*$/, '') || 'assets/';
})();
const IMG = (f) => ASSET + 'img/' + f;
const SPK = (f) => ASSET + 'speakers/' + f;

/* ---------- tiny helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? (vals[i] == null || vals[i] === false ? '' : Array.isArray(vals[i]) ? vals[i].join('') : vals[i]) : ''), '');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('bicon26:' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bicon26:' + k, v); } catch (e) { /* private mode */ } },
  del(k) { try { localStorage.removeItem('bicon26:' + k); } catch (e) { /* ignore */ } }
};
const timers = [];
const addTimer = (id) => { timers.push(id); return id; };

/* ---------- language ---------- */
const LANG = (function () {
  let l = null;
  try { l = new URLSearchParams(location.search).get('lang'); } catch (e) { /* ignore */ }
  if (l === 'id' || l === 'en') { store.set('lang', l); return l; }
  const s = store.get('lang', null);
  if (s === 'id' || s === 'en') return s;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('id') ? 'id' : 'en';
})();
document.documentElement.lang = LANG;
const L = (en, id) => (LANG === 'id' ? id : en);
const t = (o) => (o && typeof o === 'object' ? (o[LANG] != null ? o[LANG] : o.en) : o);

/* ---------- dates (Asia/Jakarta) ---------- */
const TZ = 'Asia/Jakarta';
const LOC = LANG === 'id' ? 'id-ID' : 'en-GB';
const dObj = (iso) => new Date(iso + 'T00:00:00+07:00');
const fmt = (d, o) => new Intl.DateTimeFormat(LOC, Object.assign({ timeZone: TZ }, o)).format(d);
function fmtRange(a, b) {
  const A = dObj(a);
  if (!b || a === b) return fmt(A, { day: 'numeric', month: 'short', year: 'numeric' });
  const B = dObj(b);
  const sameM = fmt(A, { month: 'numeric', year: 'numeric' }) === fmt(B, { month: 'numeric', year: 'numeric' });
  const sameY = fmt(A, { year: 'numeric' }) === fmt(B, { year: 'numeric' });
  if (sameM) return fmt(A, { day: 'numeric' }) + '–' + fmt(B, { day: 'numeric', month: 'short', year: 'numeric' });
  if (sameY) return fmt(A, { day: 'numeric', month: 'short' }) + ' – ' + fmt(B, { day: 'numeric', month: 'short', year: 'numeric' });
  return fmt(A, { day: 'numeric', month: 'short', year: 'numeric' }) + ' – ' + fmt(B, { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayISO() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p; // YYYY-MM-DD
}
function dateStatus(item) {
  const today = todayISO();
  const end = item.end || item.start;
  if (today > end) return 'done';
  if (today >= item.start) return 'now';
  return 'next';
}

/* ---------- icons ---------- */
const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkc: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
  wa: '<path d="M21 12a9 9 0 01-13.4 7.8L3 21l1.3-4.4A9 9 0 1121 12z"/><path d="M9 9c0 3 3 6 6 6l1-2-2-1-1 .8c-.9-.4-1.5-1-1.8-1.8L12 10l-1-2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0114 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4"/>',
  chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1.1-4.6A8 8 0 1121 12z"/>',
  board: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z"/><path d="m14 6 4 4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3v3"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  family: '<circle cx="9" cy="6" r="3"/><path d="M3 20v-3a5 5 0 0110 0v3"/><circle cx="18" cy="11" r="2.2"/><path d="M15.5 20v-1.5a3 3 0 016 0V20"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 5.8-8 11-8 11z"/>',
  apple: '<path d="M12 7c-2-2-7-1-7 4 0 5 3 10 5 10 1 0 1.2-.6 2-.6s1 .6 2 .6c2 0 5-5 5-10 0-5-5-6-7-4z"/><path d="M12 7c0-2 1-4 3-5"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3"/><path d="M7.5 14h9"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
  leaf: '<path d="M20 4C10 4 4 9 4 15c0 3 2 5 5 5 6 0 11-6 11-16z"/><path d="M4 21c2-6 6-9 10-11"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  ext: '<path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8"/><path d="M12 8C10 8 7 7.5 7 5.5S10 3 12 8c2-5 5-4.5 5-2.5S14 8 12 8z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
  building: '<path d="M4 21V4a1 1 0 011-1h9a1 1 0 011 1v17M15 9h4a1 1 0 011 1v11M3 21h18M8 7h3M8 11h3M8 15h3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17v.01"/>',
  news: '<path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M18 8h2v10a2 2 0 01-2 2M8 8h6M8 12h6M8 16h4"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  ticket: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z"/><path d="M13 6v12"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
  cal2: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M8 15h3"/>'
};
function icon(name, cls) {
  return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.info) + '</svg>';
}

/* ---------- URL helpers ---------- */
const BASE = (function () {
  if (CFG.basePath != null) return CFG.basePath.replace(/\/$/, '');
  const p = location.pathname;
  const m = p.match(/^(.*?)\/p\/[^/]+\.html$/);
  if (m) return m[1];
  return p.replace(/\/[^/]*$/, '');
})();
const pageUrl = (slug) => BASE + '/p/' + slug + '.html';
const homeUrl = () => BASE + '/';

/* ---------- backend client (Google Apps Script) ---------- */
class BackendError extends Error {
  constructor(code, message, extra) { super(message || code); this.code = code; this.extra = extra || {}; }
}
async function gas(method, action, payload, opts) {
  opts = opts || {};
  if (!CFG.gasUrl) throw new BackendError('no_backend', L('The registration service is not connected yet.', 'Layanan registrasi belum terhubung.'));
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), opts.timeout || 45000);
  try {
    let res;
    if (method === 'GET') {
      const qs = new URLSearchParams(Object.assign({ action }, payload || {})).toString();
      res = await fetch(CFG.gasUrl + (CFG.gasUrl.includes('?') ? '&' : '?') + qs, { signal: ctl.signal, redirect: 'follow' });
    } else {
      // text/plain avoids a CORS pre-flight, which Apps Script cannot answer.
      res = await fetch(CFG.gasUrl, { method: 'POST', signal: ctl.signal, redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, lang: LANG }, payload || {})) });
    }
    let json;
    try { json = await res.json(); } catch (e) { throw new BackendError('bad_response', L('Unexpected response from the server. Please try again.', 'Respons server tidak sesuai. Silakan coba lagi.')); }
    if (!json || json.ok === false) throw new BackendError((json && json.code) || 'error', (json && json.message) || L('Request failed.', 'Permintaan gagal.'), json);
    return json;
  } catch (e) {
    if (e instanceof BackendError) throw e;
    if (e && e.name === 'AbortError') throw new BackendError('timeout', L('The request took too long. Check your connection and try again.', 'Permintaan terlalu lama. Periksa koneksi Anda lalu coba lagi.'));
    throw new BackendError('network', L('Could not reach the server. Check your connection and try again.', 'Tidak dapat menghubungi server. Periksa koneksi Anda lalu coba lagi.'));
  } finally { clearTimeout(to); }
}
const gasGet = (a, p, o) => gas('GET', a, p, o);
const gasPost = (a, p, o) => gas('POST', a, p, o);

/* ---------- toast ---------- */
let toastEl, toastT;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast(L('Copied to clipboard', 'Disalin ke papan klip')); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(L('Copied to clipboard', 'Disalin ke papan klip')); } catch (e2) { toast(txt); }
    ta.remove();
  }
}

/* ---------- modal ---------- */
let modalEl, lastFocus;
function openModal(inner, opts) {
  opts = opts || {};
  closeModal(true);
  lastFocus = document.activeElement;
  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.setAttribute('role', 'dialog'); modalEl.setAttribute('aria-modal', 'true');
  if (opts.label) modalEl.setAttribute('aria-label', opts.label);
  modalEl.innerHTML = '<div class="modal__box" style="' + (opts.width ? 'width:' + opts.width : '') + '"><button class="modal__x" type="button" aria-label="' + esc(L('Close', 'Tutup')) + '">' + icon('x') + '</button><div class="modal__scroll">' + inner + '</div></div>';
  document.body.appendChild(modalEl);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modalEl && modalEl.classList.add('is-open'));
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl || e.target.closest('.modal__x')) closeModal(); });
  const first = $('.modal__x', modalEl); first && first.focus();
  return modalEl;
}
function closeModal(instant) {
  if (!modalEl) return;
  const m = modalEl; modalEl = null;
  document.body.style.overflow = '';
  if (instant) m.remove(); else { m.classList.remove('is-open'); setTimeout(() => m.remove(), 220); }
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  if (typeof onModalClosed === 'function') onModalClosed();
}
let onModalClosed = null;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab' && modalEl) {
    const f = $$('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalEl).filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
});

/* ---------- misc ---------- */
function slugId(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(file);
  });
}
function humanSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function waLink(msg) { return 'https://wa.me/' + SITE.meta.contact.whatsapp.replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : ''); }
function trackById(n) { return SITE.tracks.find((x) => String(x.n) === String(n)); }
function speakerById(id) { return SITE.speakers.find((x) => x.id === id); }
function safeUrl(u) { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } }
function youtubeEmbed(u) {
  try {
    const x = new URL(u);
    let id = '';
    if (x.hostname.includes('youtu.be')) id = x.pathname.slice(1);
    else if (x.hostname.includes('youtube.com')) id = x.searchParams.get('v') || (x.pathname.match(/\/(embed|shorts)\/([\w-]+)/) || [])[2] || '';
    return /^[\w-]{6,20}$/.test(id) ? 'https://www.youtube-nocookie.com/embed/' + id : '';
  } catch (e) { return ''; }
}


/* ===== 10-layout.js ===== */
/* ==========================================================================
   10-layout.js — header, navigation, footer, shared page furniture
   ========================================================================== */

const M = SITE.meta;

function navModel() {
  return [
    { key: 'about', label: L('About', 'Tentang'), items: [
      { label: L('Background and objectives', 'Latar belakang dan tujuan'), sub: L('Why One Health, and what we aim to achieve', 'Mengapa One Health dan apa tujuan kita'), href: pageUrl('about'), icon: 'info' },
      { label: L('Organizing committee', 'Panitia penyelenggara'), sub: L('Who is behind B-ICON 2026', 'Siapa di balik B-ICON 2026'), href: pageUrl('committee'), icon: 'users' },
      { label: L('Gallery and past editions', 'Galeri dan edisi sebelumnya'), sub: L('Venue, posters and previous conferences', 'Lokasi, poster, dan konferensi terdahulu'), href: pageUrl('gallery'), icon: 'image' },
      { label: L('Frequently asked questions', 'Pertanyaan yang sering diajukan'), sub: L('Quick answers before you register', 'Jawaban singkat sebelum mendaftar'), href: pageUrl('faq'), icon: 'help' }
    ] },
    { key: 'programme', label: L('Programme', 'Program'), items: [
      { label: L('Plenary programme', 'Susunan acara pleno'), sub: L('27 October 2026, session by session', '27 Oktober 2026, sesi demi sesi'), href: pageUrl('programme'), icon: 'clock' },
      { label: L('Invited speakers', 'Pembicara undangan'), sub: L('Five experts from four countries', 'Lima pakar dari empat negara'), href: pageUrl('speakers'), icon: 'mic' },
      { label: L('Important dates and venue', 'Tanggal penting dan lokasi'), sub: L('Deadlines from submission to proceedings', 'Batas waktu dari pengiriman hingga prosiding'), href: pageUrl('important-dates'), icon: 'calendar' }
    ] },
    { key: 'cfp', label: L('Call for Papers', 'Call for Papers'), items: [
      { label: L('Call for papers and scope', 'Call for papers dan ruang lingkup'), sub: L('Ten tracks, oral and poster', 'Sepuluh bidang, oral dan poster'), href: pageUrl('call-for-papers'), icon: 'layers' },
      { label: L('Author guidelines', 'Panduan penulis'), sub: L('How to submit through the proceedings system', 'Cara mengirim lewat sistem prosiding'), href: pageUrl('author-guidelines'), icon: 'file' },
      { label: L('Publication options', 'Pilihan publikasi'), sub: L('Journals up to SINTA 2 and the B-ICON Proceeding', 'Jurnal hingga SINTA 2 dan Prosiding B-ICON'), href: pageUrl('call-for-papers') + '#publication', icon: 'book' }
    ] },
    { key: 'reg', label: L('Registration', 'Registrasi'), cta: true, items: [
      { label: L('Register now', 'Daftar sekarang'), sub: L('Presenters and participants', 'Presenter dan peserta'), href: pageUrl('registration'), icon: 'ticket' },
      { label: L('Fees and payment', 'Biaya dan pembayaran'), sub: L('Fees by category', 'Biaya per kategori'), href: pageUrl('registration') + '#fees', icon: 'wallet' },
      { label: L('My registration', 'Registrasi saya'), sub: L('Check status, upload payment proof and poster', 'Cek status, unggah bukti bayar dan poster'), href: pageUrl('my-registration'), icon: 'user' }
    ] },
    { key: 'expo', label: L('Poster Exhibition', 'Pameran Poster'), href: pageUrl('poster-exhibition') },
    { key: 'news', label: L('News', 'Berita'), href: pageUrl('news') },
    { key: 'contact', label: L('Contact', 'Kontak'), href: pageUrl('contact') }
  ];
}

function currentKey(slug) {
  const m = {
    about: 'about', committee: 'about', gallery: 'about', faq: 'about',
    programme: 'programme', speakers: 'programme', 'important-dates': 'programme',
    'call-for-papers': 'cfp', 'author-guidelines': 'cfp',
    registration: 'reg', 'my-registration': 'reg',
    'poster-exhibition': 'expo', news: 'news', contact: 'contact'
  };
  return m[slug] || '';
}

function announcement() {
  const ov = (window.__BICON_OVERRIDES && window.__BICON_OVERRIDES.announcements) || [];
  const a = ov.find((x) => x && x.active !== false && (x.text_en || x.text_id));
  if (a) return { text: LANG === 'id' ? (a.text_id || a.text_en) : (a.text_en || a.text_id), url: a.url || '', cta: LANG === 'id' ? (a.cta_id || a.cta_en || '') : (a.cta_en || a.cta_id || '') };
  const sub = SITE.dates.find((d) => d.id === 'submission');
  const today = todayISO();
  if (sub && today <= sub.end) {
    return {
      text: L('Call for papers is open. Submit your full paper by ' + fmtRange(sub.end, sub.end) + '.', 'Call for papers dibuka. Kirim naskah lengkap Anda paling lambat ' + fmtRange(sub.end, sub.end) + '.'),
      url: pageUrl('author-guidelines'), cta: L('How to submit', 'Cara mengirim')
    };
  }
  return null;
}

function headerHtml(slug) {
  const key = currentKey(slug);
  const nav = navModel().map((n) => {
    const active = n.key === key ? ' is-active' : '';
    const cta = n.cta ? ' nav__link--cta' : '';
    if (!n.items) return '<div class="nav__item"><a class="nav__link' + active + '" href="' + n.href + '">' + esc(n.label) + '</a></div>';
    return '<div class="nav__item"><button class="nav__link' + active + cta + '" type="button" aria-haspopup="true" aria-expanded="false">' + esc(n.label) + icon('chev', 'chev') + '</button><div class="nav__menu" role="menu">' +
      n.items.map((i) => '<a role="menuitem" href="' + i.href + '">' + icon(i.icon) + '<span>' + esc(i.label) + '<small>' + esc(i.sub) + '</small></span></a>').join('') + '</div></div>';
  }).join('');
  return html`
  <header class="site-header" id="top">
    <div class="wrap">
      <a class="brand" href="${homeUrl()}" aria-label="B-ICON 2026 — ${esc(L('Home', 'Beranda'))}">
        <img class="brand__pk" src="${IMG('poltekkes-logo.png')}" alt="Kemenkes Poltekkes Bengkulu" width="110" height="34">
        <span class="brand__sep" aria-hidden="true"></span>
        <span class="brand__bi"><img src="${IMG('bicon-icon.png')}" alt="" width="48" height="42"><span class="brand__txt">B-ICON<small>2026</small></span></span>
      </a>
      <nav class="nav" aria-label="${esc(L('Main', 'Utama'))}">${nav}</nav>
      <div class="header__tools">
        <div class="lang" role="group" aria-label="Language">
          <button type="button" data-lang="en" aria-pressed="${LANG === 'en'}">EN</button>
          <button type="button" data-lang="id" aria-pressed="${LANG === 'id'}">ID</button>
        </div>
        <button class="burger" type="button" aria-label="${esc(L('Open menu', 'Buka menu'))}" aria-controls="drawer" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
  </header>`;
}

function drawerHtml() {
  const groups = navModel().map((n) => {
    if (!n.items) return '<a class="drawer__link" href="' + n.href + '">' + esc(n.label) + '</a>';
    return '<div class="drawer__group"><button type="button" aria-expanded="false">' + esc(n.label) + icon('chev', 'chev') + '</button><div class="sub">' + n.items.map((i) => '<a href="' + i.href + '">' + esc(i.label) + '</a>').join('') + '</div></div>';
  }).join('');
  return html`
  <div class="drawer" id="drawer" aria-hidden="true">
    <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="${esc(L('Menu', 'Menu'))}">
      <div class="drawer__head">
        <a class="brand" href="${homeUrl()}"><img class="brand__bi-img" src="${IMG('bicon-icon.png')}" alt="" width="44" height="39" style="height:38px;width:auto"><span class="brand__txt" style="margin-left:6px">B-ICON<small>2026</small></span></a>
        <button class="burger" type="button" data-close aria-label="${esc(L('Close menu', 'Tutup menu'))}" style="display:inline-flex">${icon('x')}</button>
      </div>
      <div class="drawer__body">
        <a class="drawer__link" href="${homeUrl()}">${esc(L('Home', 'Beranda'))}</a>
        ${groups}
      </div>
      <div class="drawer__foot">
        <a class="btn btn--primary" href="${pageUrl('registration')}">${esc(L('Register now', 'Daftar sekarang'))} ${icon('arrow')}</a>
        <div class="lang" style="justify-self:start;display:inline-flex"><button type="button" data-lang="en" aria-pressed="${LANG === 'en'}">EN</button><button type="button" data-lang="id" aria-pressed="${LANG === 'id'}">ID</button></div>
      </div>
    </div>
  </div>`;
}

function footerHtml() {
  const c = M.contact;
  return html`
  <footer class="site-footer">
    <img class="foot-flower" src="${IMG('bicon-icon.png')}" alt="">
    <div class="wrap">
      <div class="foot-grid">
        <div class="foot-brand">
          <div class="logos"><img src="${IMG('poltekkes-logo.png')}" alt="Kemenkes Poltekkes Bengkulu"><i></i><img src="${IMG('bicon-icon.png')}" alt="B-ICON" style="height:42px"></div>
          <h4 style="letter-spacing:.02em;text-transform:none;font-size:18px;font-family:var(--font-d)">${esc(t(M.name))}</h4>
          <p>${esc(fmtRange(M.startDate, M.endDate))} · ${esc(L('Hybrid conference', 'Konferensi hibrida'))}<br>${esc(t(M.themeLocal))}.</p>
          <p style="font-size:13px;opacity:.75">${esc(L('Organised by ', 'Diselenggarakan oleh '))}${esc(t(M.organizer))}.</p>
        </div>
        <div>
          <h4>${esc(L('Conference', 'Konferensi'))}</h4>
          <ul class="foot-list">
            <li><a href="${pageUrl('about')}">${esc(L('About', 'Tentang'))}</a></li>
            <li><a href="${pageUrl('programme')}">${esc(L('Programme', 'Program'))}</a></li>
            <li><a href="${pageUrl('speakers')}">${esc(L('Invited speakers', 'Pembicara undangan'))}</a></li>
            <li><a href="${pageUrl('important-dates')}">${esc(L('Important dates', 'Tanggal penting'))}</a></li>
            <li><a href="${pageUrl('poster-exhibition')}">${esc(L('Poster exhibition', 'Pameran poster'))}</a></li>
            <li><a href="${pageUrl('faq')}">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4>${esc(L('Participate', 'Berpartisipasi'))}</h4>
          <ul class="foot-list">
            <li><a href="${pageUrl('call-for-papers')}">${esc(L('Call for papers', 'Call for papers'))}</a></li>
            <li><a href="${pageUrl('author-guidelines')}">${esc(L('Author guidelines', 'Panduan penulis'))}</a></li>
            <li><a href="${pageUrl('registration')}">${esc(L('Register', 'Registrasi'))}</a></li>
            <li><a href="${pageUrl('my-registration')}">${esc(L('My registration', 'Registrasi saya'))}</a></li>
            <li><a href="${CFG.ojs.baseUrl}" target="_blank" rel="noopener">${esc(L('Proceedings (OJS)', 'Prosiding (OJS)'))} ${icon('ext')}</a></li>
            <li><a href="${pageUrl('privacy')}">${esc(L('Privacy', 'Privasi'))}</a></li>
          </ul>
        </div>
        <div>
          <h4>${esc(L('Contact', 'Kontak'))}</h4>
          <ul class="foot-list">
            <li>${icon('pin')}<span>${esc(M.address)}</span></li>
            <li>${icon('wa')}<a href="${waLink()}" target="_blank" rel="noopener">${esc(c.whatsappLabel)}</a></li>
            <li>${icon('mail')}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
            <li>${icon('globe')}<a href="${esc(M.website)}">${esc(M.website.replace('https://', ''))}</a></li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">
        <span>© ${esc(M.year)} Poltekkes Kemenkes Bengkulu. ${esc(L('All rights reserved.', 'Hak cipta dilindungi.'))}</span>
        <span>${esc(L('Times shown in ', 'Waktu ditampilkan dalam '))}${esc(M.tzLabel)}</span>
      </div>
    </div>
  </footer>
  <button class="totop" type="button" aria-label="${esc(L('Back to top', 'Kembali ke atas'))}">${icon('up')}</button>
  ${CFG.features.whatsappFloat ? '<a class="wa-float" href="' + waLink('Hello B-ICON 2026 committee, ') + '" target="_blank" rel="noopener">' + icon('wa') + '<span>' + esc(L('Chat with committee', 'Chat panitia')) + '</span></a>' : ''}`;
}

/* page hero used on inner pages */
function pageHero(o) {
  return html`
  <section class="phero">
    <img class="phero__flower" src="${IMG('bicon-icon.png')}" alt="">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${homeUrl()}">${esc(L('Home', 'Beranda'))}</a><span aria-hidden="true">/</span>${o.parent ? '<a href="' + o.parent[1] + '">' + esc(o.parent[0]) + '</a><span aria-hidden="true">/</span>' : ''}<span>${esc(o.title)}</span></nav>
      <h1>${esc(o.title)}</h1>
      ${o.lead ? '<p>' + esc(o.lead) + '</p>' : ''}
      ${o.actions ? '<div class="phero__actions">' + o.actions + '</div>' : ''}
    </div>
  </section>`;
}

function secHead(eyebrow, title, lead, center) {
  return '<div class="sec-head' + (center ? ' sec-head--center' : '') + ' rv">' + (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') + '<h2 class="h2">' + esc(title) + '</h2>' + (lead ? '<p class="lead" style="margin-top:14px">' + esc(lead) + '</p>' : '') + '</div>';
}

function mountShell(slug, mainHtml) {
  const ann = announcement();
  const dismissed = store.get('ann-dismissed', '') === (ann && ann.text);
  ROOT.innerHTML =
    '<a class="skip-link" href="#main">' + esc(L('Skip to content', 'Lewati ke konten')) + '</a>' +
    (ann && !dismissed ? '<div class="annbar" role="region" aria-label="Announcement"><div class="wrap"><span>' + esc(ann.text) + (ann.url ? ' <a href="' + esc(ann.url) + '">' + esc(ann.cta || L('Learn more', 'Selengkapnya')) + '</a>' : '') + '</span><button type="button" aria-label="' + esc(L('Dismiss', 'Tutup')) + '" data-dismiss-ann>' + icon('x') + '</button></div></div>' : '') +
    headerHtml(slug) + '<main id="main" tabindex="-1">' + mainHtml + '</main>' + footerHtml() + drawerHtml();
  bindShell(ann);
  initReveal();
}

function bindShell(ann) {
  const header = $('.site-header');
  const totop = $('.totop');
  const onScroll = () => {
    header.classList.toggle('is-stuck', window.scrollY > 8);
    totop.classList.toggle('is-on', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  ROOT.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-lang]');
    if (lb) { store.set('lang', lb.dataset.lang); const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.href; return; }
    const dm = e.target.closest('[data-dismiss-ann]');
    if (dm) { store.set('ann-dismissed', ann ? ann.text : ''); dm.closest('.annbar').remove(); return; }
    const nb = e.target.closest('.nav__item > button.nav__link');
    if (nb) {
      const it = nb.parentElement, open = !it.classList.contains('is-open');
      $$('.nav__item.is-open').forEach((x) => { x.classList.remove('is-open'); x.firstElementChild.setAttribute('aria-expanded', 'false'); });
      if (open) { it.classList.add('is-open'); nb.setAttribute('aria-expanded', 'true'); }
      return;
    }
    if (!e.target.closest('.nav__item')) $$('.nav__item.is-open').forEach((x) => x.classList.remove('is-open'));
    const dg = e.target.closest('.drawer__group > button');
    if (dg) { const g = dg.parentElement; g.classList.toggle('is-open'); dg.setAttribute('aria-expanded', g.classList.contains('is-open')); return; }
    const dr = $('#drawer');
    if (e.target.closest('.header__tools .burger')) { dr.classList.add('is-open'); dr.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; return; }
    if (e.target.closest('[data-close]') || e.target === dr || (e.target.closest('.drawer a') && !e.target.closest('.drawer__group > button'))) { dr.classList.remove('is-open'); dr.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const dr = $('#drawer'); if (dr) { dr.classList.remove('is-open'); document.body.style.overflow = ''; } $$('.nav__item.is-open').forEach((x) => x.classList.remove('is-open')); } });
}

function initReveal() {
  const els = $$('.rv');
  const still = /[?&]nomotion\b/.test(location.search) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); if (still) ROOT.classList.add('nomotion'); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });
  els.forEach((e) => io.observe(e));
}


/* ===== 20-components.js ===== */
/* ==========================================================================
   20-components.js — reusable UI blocks
   ========================================================================== */

/* ---------- countdown ---------- */
function countdownHtml(label) {
  return '<div class="cd" data-cd="' + esc(M.startISO) + '" aria-live="off"><div class="cd__lbl">' + esc(label || L('Conference starts in', 'Konferensi dimulai dalam')) + '</div>' +
    ['d', 'h', 'm', 's'].map((k) => '<div class="cd__t"><b data-k="' + k + '">--</b><span>' + esc({ d: L('Days', 'Hari'), h: L('Hours', 'Jam'), m: L('Min', 'Menit'), s: L('Sec', 'Detik') }[k]) + '</span></div>').join('') + '</div>';
}
function initCountdowns() {
  $$('[data-cd]').forEach((el) => {
    const target = new Date(el.dataset.cd).getTime();
    const endT = dObj(M.endDate).getTime() + 86400000;
    const tick = () => {
      const now = Date.now();
      if (now >= endT) {
        el.innerHTML = '<div class="cd__lbl" style="font-size:15px;letter-spacing:.04em;text-transform:none">' + esc(L('B-ICON 2026 has concluded. Thank you to everyone who joined.', 'B-ICON 2026 telah usai. Terima kasih kepada semua yang bergabung.')) + '</div>';
        return true;
      }
      if (now >= target) {
        el.innerHTML = '<div class="cd__lbl" style="font-size:15px;letter-spacing:.04em;text-transform:none">' + esc(L('B-ICON 2026 is under way.', 'B-ICON 2026 sedang berlangsung.')) + '</div>';
        return true;
      }
      let s = Math.floor((target - now) / 1000);
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      const v = { d, h, m, s };
      Object.keys(v).forEach((k) => { const b = $('[data-k="' + k + '"]', el); if (b) b.textContent = String(v[k]).padStart(2, '0'); });
      return false;
    };
    if (!tick()) { const id = setInterval(() => { if (tick()) clearInterval(id); }, 1000); addTimer(id); }
  });
}

/* ---------- key dates ---------- */
function datesList() {
  const ov = (window.__BICON_OVERRIDES && window.__BICON_OVERRIDES.dates) || {};
  return SITE.dates.map((d) => {
    const o = ov[d.id];
    return o ? Object.assign({}, d, { start: o.start || d.start, end: o.end === undefined ? d.end : (o.end || null), note: o.note_en || o.note_id ? { en: o.note_en || '', id: o.note_id || o.note_en || '' } : d.note }) : d;
  });
}
function datesTimeline(limit) {
  const list = datesList();
  const statuses = list.map(dateStatus);
  let firstNext = statuses.findIndex((s) => s === 'next');
  if (statuses.includes('now')) firstNext = -1;
  const items = list.map((d, i) => {
    const st = statuses[i];
    let cls = st === 'done' ? 'is-done' : st === 'now' ? 'is-now' : (i === firstNext ? 'is-now' : '');
    if (d.highlight) cls += ' is-hi';
    const label = st === 'done' ? L('Done', 'Selesai') : st === 'now' ? (d.highlight ? L('Live', 'Berlangsung') : L('Open now', 'Dibuka')) : (i === firstNext ? L('Next', 'Berikutnya') : '');
    return '<li class="tl__i ' + cls + ' rv" data-d="' + (i % 4) + '">' + (label ? '<span class="tl__st">' + esc(label) + '</span>' : '') + '<div class="tl__ico">' + icon(d.icon || 'calendar') + '</div><div class="tl__d">' + esc(fmtRange(d.start, d.end)) + '</div><div class="tl__t">' + esc(t(d.label)) + '</div>' + (d.note ? '<div class="tl__n">' + esc(t(d.note)) + '</div>' : '') + '</li>';
  });
  return '<ol class="tl">' + items.slice(0, limit || items.length).join('') + '</ol>';
}

/* ---------- calendar (.ics) ---------- */
function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsDate(iso) { return iso.replace(/-/g, ''); }
function icsNextDay(iso) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); }
function buildIcs(events) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//B-ICON 2026//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events.forEach((e, i) => {
    out.push('BEGIN:VEVENT', 'UID:bicon2026-' + i + '-' + slugId(e.title) + '@biconhealth.poltekkesbengkulu.ac.id', 'DTSTAMP:' + now);
    if (e.allDay) { out.push('DTSTART;VALUE=DATE:' + icsDate(e.start), 'DTEND;VALUE=DATE:' + icsNextDay(e.end || e.start)); }
    else { out.push('DTSTART:' + e.startUtc, 'DTEND:' + e.endUtc); }
    out.push('SUMMARY:' + icsEscape(e.title));
    if (e.desc) out.push('DESCRIPTION:' + icsEscape(e.desc));
    if (e.loc) out.push('LOCATION:' + icsEscape(e.loc));
    out.push('END:VEVENT');
  });
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}
function downloadFile(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/calendar;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function utcFromWib(date, hhmm) { return new Date(date + 'T' + hhmm + ':00+07:00').toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); }
function icsSeminar() {
  return buildIcs([{ title: 'B-ICON 2026 Plenary Seminar', desc: t(M.theme) + '\n' + M.website, loc: t(M.venue) + ', ' + M.address + ' (hybrid)', startUtc: utcFromWib(M.seminarDate, M.seminarStart), endUtc: utcFromWib(M.seminarDate, M.seminarEnd) }]);
}
function icsDates() {
  return buildIcs(datesList().map((d) => ({ title: 'B-ICON 2026: ' + (d.label.en), desc: (d.note ? d.note.en + '\n' : '') + M.website, allDay: true, start: d.start, end: d.end || d.start })));
}

/* ---------- One Health graphic ---------- */
function oneHealthSvg() {
  const glyph = {
    human: '<g transform="translate(-14 -14) scale(1.17)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></g>',
    animal: '<g transform="translate(-14 -14) scale(1.17)" fill="#fff"><ellipse cx="12" cy="15.5" rx="4.5" ry="3.7"/><circle cx="5.5" cy="10.5" r="1.9"/><circle cx="9.3" cy="6.3" r="1.9"/><circle cx="14.7" cy="6.3" r="1.9"/><circle cx="18.5" cy="10.5" r="1.9"/></g>',
    env: '<g transform="translate(-14 -14) scale(1.17)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C10 4 4 9 4 15c0 3 2 5 5 5 6 0 11-6 11-16z"/><path d="M4 21c2-6 6-9 10-11"/></g>'
  };
  const n = SITE.oneHealth.nodes;
  const pos = { human: [200, 62, '#4E27BF'], animal: [64, 268, '#F47C20'], env: [336, 268, '#1FA463'] };
  const node = (k) => {
    const label = t(n.find((x) => x.id === k).label);
    const [x, y, c] = pos[k];
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="50" fill="' + c + '" opacity=".12" class="pulse"/><circle r="38" fill="' + c + '"/>' + glyph[k] + '<text y="68" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="19" fill="#1A1433">' + esc(label) + '</text></g>';
  };
  return '<div class="oh"><svg viewBox="0 0 400 350" role="img" aria-label="' + esc(L('One Health: people, animals and the environment are connected', 'One Health: manusia, hewan, dan lingkungan saling terhubung')) + '">' +
    '<defs><linearGradient id="ohg" x1="0" x2="1"><stop offset="0" stop-color="#4E27BF"/><stop offset=".5" stop-color="#F47C20"/><stop offset="1" stop-color="#1FA463"/></linearGradient></defs>' +
    '<path d="M200 62 L64 268 L336 268 Z" fill="none" stroke="url(#ohg)" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>' +
    '<path d="M200 62 L200 190 M64 268 L172 212 M336 268 L228 212" stroke="#CFC4F8" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="200" cy="200" r="54" fill="#fff" stroke="#EEE9FF" stroke-width="6"/>' +
    '<image href="' + IMG('bicon-icon.png') + '" x="158" y="161" width="84" height="74" preserveAspectRatio="xMidYMid meet"/>' +
    node('human') + node('animal') + node('env') + '</svg></div>';
}

/* ---------- speakers ---------- */
function sessionFor(id) { return SITE.schedule.find((s) => s.speaker === id); }
function speakersEmpty() {
  return '<div class="tba rv">' + icon('mic') + '<h3>' + esc(L('Speaker line-up coming soon', 'Daftar pembicara segera diumumkan')) +
    '</h3><p>' + esc(L('Invitations to invited speakers are in progress. Names, affiliations and session topics will be published here as soon as they are confirmed.', 'Undangan kepada para pembicara masih dalam proses konfirmasi. Nama, afiliasi, dan topik sesi akan dipublikasikan di sini setelah dikonfirmasi.')) +
    '</p></div>';
}
function speakerCard(s, opts) {
  opts = opts || {};
  const ses = sessionFor(s.id);
  return '<button type="button" class="card card--lift spk rv" data-speaker="' + esc(s.id) + '" data-d="' + ((s.n - 1) % 4) + '">' +
    '<div class="spk__img"><img src="' + SPK(s.photo) + '" alt="' + esc(s.name) + '" loading="lazy" width="360" height="360"><span class="chip chip--dark spk__field" style="background:rgba(27,11,77,.82);backdrop-filter:blur(4px)">' + esc(t(s.field)) + '</span></div>' +
    '<div class="spk__body"><div class="spk__n">' + esc(L('Speaker ', 'Pembicara ')) + s.n + (ses ? ' · ' + esc(ses.time) : '') + '</div>' +
    '<div class="spk__name">' + esc(s.name) + '</div>' +
    '<div class="spk__org">' + esc(t(s.role)) + '<br>' + esc(s.org) + '</div>' +
    '<div class="spk__topic">' + esc(t(s.topic)) + '</div>' +
    (opts.more === false ? '' : '<span class="spk__go">' + esc(L('Read profile', 'Lihat profil')) + ' ' + icon('arrow') + '</span>') + '</button>';
}
function speakerModal(s) {
  const ses = sessionFor(s.id);
  const inner = '<div class="spm"><div class="spm__side"><img src="' + SPK(s.photo) + '" alt="' + esc(s.name) + '"><div><h3>' + esc(s.name) + '</h3><p>' + esc(s.credentials) + (s.credentials ? '<br>' : '') + esc(t(s.role)) + '<br>' + esc(s.org) + '</p><p><span class="chip chip--dark">' + icon('globe') + ' ' + esc(t(s.country)) + '</span></p></div></div>' +
    '<div class="spm__main"><h4>' + esc(L('Session topic', 'Topik sesi')) + '</h4><div class="spm__topic">' + esc(t(s.topic)) + '</div>' +
    (ses ? '<p style="margin-top:12px"><span class="chip chip--o">' + icon('clock') + ' ' + esc(fmtRange(M.seminarDate)) + ', ' + esc(ses.time) + '–' + esc(ses.end) + ' WIB</span></p>' : '') +
    '<p style="margin-top:10px;color:var(--ink2)">' + esc(t(s.abstract)) + '</p>' +
    '<h4>' + esc(L('About the speaker', 'Tentang pembicara')) + '</h4><p style="color:var(--ink2);margin:0">' + esc(t(s.bio)) + '</p>' +
    (s.expertise && s.expertise.length ? '<h4>' + esc(L('Areas of expertise', 'Bidang keahlian')) + '</h4><div class="chips">' + s.expertise.map((e) => '<span class="chip">' + esc(e) + '</span>').join('') + '</div>' : '') +
    '</div></div>';
  openModal(inner, { label: s.name, width: '900px' });
}
function bindSpeakerCards(scope) {
  (scope || ROOT).addEventListener('click', (e) => {
    const b = e.target.closest('[data-speaker]'); if (!b) return;
    const s = speakerById(b.dataset.speaker); if (s) speakerModal(s);
  });
}

/* ---------- tracks / fees / publications ---------- */
function trackTile(tr, i) {
  return '<div class="track rv" data-d="' + (i % 4) + '" style="--tc:' + tr.color + '"><div class="track__ico">' + icon(tr.icon) + '</div><div><div class="track__n">' + esc(L('TRACK ', 'BIDANG ')) + String(tr.n).padStart(2, '0') + '</div><div class="track__t">' + esc(tr[LANG] || tr.en) + '</div></div></div>';
}
function feeCard(f, i, opts) {
  opts = opts || {};
  return '<div class="fee fee--' + f.tone + ' rv" data-d="' + (i % 4) + '">' + (opts.tag ? '<span class="chip chip--o fee__tag">' + esc(opts.tag) + '</span>' : '') + '<h3>' + esc(t(f.title)) + '</h3><small>' + esc(t(f.sub)) + '</small><div class="fee__amt">' + esc(f.amount) + '</div></div>';
}
function pubCard(p, i) {
  return '<div class="card pub rv' + (p.n === 5 ? ' pub--wide' : '') + '" data-d="' + (i % 4) + '"><div class="pub__n" style="background:' + p.color + '">' + p.n + '</div><div><div class="pub__t">' + esc(p.name) + '</div><span class="chip pub__i ' + (p.n === 5 ? 'chip--g' : '') + '">' + esc(p.index) + '</span>' +
    (p.restricted ? '<div class="tl__n" style="margin-top:8px;font-style:italic">' + esc(L('Available only for authors not affiliated with Poltekkes Kemenkes Bengkulu', 'Hanya untuk penulis yang tidak berafiliasi dengan Poltekkes Kemenkes Bengkulu')) + '</div>' : '') + '</div></div>';
}
function notesList(arr) {
  return '<ul class="notes">' + arr.map((n) => '<li>' + icon('checkc') + '<span>' + esc(t(n)) + '</span></li>').join('') + '</ul>';
}
function accordion(items) {
  return '<div class="acc">' + items.map((it, i) => '<details class="acc__i rv" data-d="' + (i % 3) + '"' + (i === 0 ? ' open' : '') + '><summary>' + esc(t(it.q)) + icon('chev') + '</summary><div class="acc__a"><p>' + esc(t(it.a)) + '</p></div></details>').join('') + '</div>';
}
function ctaBand(title, text, actions) {
  return '<div class="cta rv"><img class="cta__flower" src="' + IMG('bicon-icon.png') + '" alt=""><div style="position:relative"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p></div><div class="actions">' + actions + '</div></div>';
}
function btn(label, href, cls, ico, ext) {
  return '<a class="btn ' + (cls || 'btn--primary') + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(label) + (ico === false ? '' : ' ' + icon(ico || 'arrow')) + '</a>';
}
function ojsBtn(label, cls) { return btn(label || L('View the OJS proceedings system', 'Lihat sistem prosiding OJS'), CFG.ojs.baseUrl, cls || 'btn--primary', 'ext', true); }


/* ===== 30-pages.js ===== */
/* ==========================================================================
   30-pages.js — content pages
   Each page returns { title, desc, main, init }.
   ========================================================================== */

const PAGES = {};
const HOME_SUB = L('Addressing Infectious Diseases and Emerging Health Threats', 'Addressing Infectious Diseases and Emerging Health Threats');

/* ---------- native Blogger content (page body / posts), read from the hidden container ---------- */
function nativePosts() {
  const box = document.getElementById('bicon-native');
  if (!box) return [];
  return $$('.bn-post', box).map((a) => {
    const body = $('.bn-body', a);
    const div = document.createElement('div'); div.innerHTML = body ? body.innerHTML : '';
    const img = div.querySelector('img');
    const text = (div.textContent || '').replace(/\s+/g, ' ').trim();
    return { title: a.dataset.title || '', url: a.dataset.url || '', date: a.dataset.date || '', html: body ? body.innerHTML : '', text, img: img ? img.getAttribute('src') : '', snippet: text.length > 170 ? text.slice(0, 167).replace(/\s+\S*$/, '') + '…' : text };
  });
}
function extraBlock() {
  const p = nativePosts()[0];
  if (!p || !p.text && !/<img|<iframe|<table/i.test(p.html)) return '';
  return '<section class="section section--tight"><div class="wrap"><div class="article"><div class="article__body page-extra">' + p.html + '</div></div></div></section>';
}

/* ---------- news ---------- */
function newsCard(n, i) {
  return '<a class="card card--lift news rv" data-d="' + (i % 3) + '" href="' + esc(n.url) + '" style="text-decoration:none"><div class="news__img">' + (n.img ? '<img src="' + esc(n.img) + '" alt="" loading="lazy">' : '<img class="ph" src="' + IMG('bicon-icon.png') + '" alt="">') + '</div><div class="news__b"><div class="news__d">' + esc(n.date) + '</div><div class="news__t">' + esc(n.title) + '</div><div class="news__x">' + esc(n.snippet) + '</div></div></a>';
}
async function fetchNews(max) {
  if (!CFG.newsFeed) return [];
  if (CFG.newsFeed.charAt(0) === '/' && !(ROOT.dataset && ROOT.dataset.pt)) return [];   // relative feed only exists on Blogger
  try {
    const r = await fetch(CFG.newsFeed.replace(/max-results=\d+/, 'max-results=' + (max || 6)));
    if (!r.ok) return [];
    const j = await r.json();
    return ((j.feed && j.feed.entry) || []).map((e) => {
      const div = document.createElement('div'); div.innerHTML = (e.content && e.content.$t) || (e.summary && e.summary.$t) || '';
      const img = div.querySelector('img'); const text = (div.textContent || '').replace(/\s+/g, ' ').trim();
      const link = (e.link || []).find((l) => l.rel === 'alternate');
      const d = new Date(e.published.$t);
      return { title: e.title.$t, url: link ? link.href : '#', date: fmt(d, { day: 'numeric', month: 'long', year: 'numeric' }), img: img ? img.getAttribute('src') : ((e.media$thumbnail && e.media$thumbnail.url) || '').replace(/\/s72-c\//, '/s640/'), snippet: text.length > 150 ? text.slice(0, 147).replace(/\s+\S*$/, '') + '…' : text };
    });
  } catch (e) { return []; }
}
function newsEmpty() {
  return '<div class="empty"><img src="' + IMG('bicon-icon.png') + '" alt=""><h4>' + esc(L('No announcements yet', 'Belum ada pengumuman')) + '</h4><p>' + esc(L('Conference news and announcements will appear here.', 'Berita dan pengumuman konferensi akan tampil di sini.')) + '</p></div>';
}
async function fillNews(sel, max) {
  const el = $(sel); if (!el) return;
  const items = await fetchNews(max);
  el.innerHTML = items.length ? '<div class="grid grid--3">' + items.map(newsCard).join('') + '</div>' : newsEmpty();
  initReveal();
}

/* ==========================================================================
   HOME
   ========================================================================== */
PAGES.home = function () {
  const sub = SITE.dates.find((d) => d.id === 'submission');
  const open = todayISO() <= sub.end;
  const fees = SITE.fees;
  const invitedTalks = SITE.schedule.filter((s) => s.type === 'invited' && speakerById(s.speaker));
  const main = html`
  <section class="hero">
    <img class="hero__flower" src="${IMG('bicon-icon.png')}" alt="">
    <div class="wrap">
      <div>
        <div class="hero__badge"><img src="${IMG('bicon-icon.png')}" alt=""><span>${esc(t(M.name))}</span></div>
        <p class="hero__kicker">B-ICON ${esc(M.year)}</p>
        <h1>One Health <span class="accent">in Action</span></h1>
        <p class="hero__sub">${esc(HOME_SUB)}</p>
        <div class="hero__meta">
          <span class="chip">${icon('calendar')} ${esc(fmtRange(M.startDate, M.endDate))}</span>
          <span class="chip">${icon('globe')} ${esc(L('Hybrid conference', 'Konferensi hibrida'))}</span>
          <span class="chip">${icon('pin')} ${esc(L('Hybrid plenary · ', 'Pleno hibrida · ') + t(M.venue))}</span>
        </div>
        <div class="hero__cta">
          ${btn(L('Register now', 'Daftar sekarang'), pageUrl('registration'), 'btn--primary btn--lg', 'arrow')}
          ${btn(L('Submit your paper', 'Kirim naskah'), pageUrl('author-guidelines'), 'btn--ghost btn--lg', 'upload')}
        </div>
        ${countdownHtml()}
      </div>
      <div class="hero__visual">
        <div class="hero__ring"></div>
        <div class="hero__arch"><img src="${IMG('gedung-poltekkes.jpg')}" alt="${esc(L('Poltekkes Kemenkes Bengkulu building with its Rafflesia-inspired orange facade', 'Gedung Poltekkes Kemenkes Bengkulu dengan fasad oranye bermotif ukiran khas'))}" width="479" height="640" fetchpriority="high"></div>
        ${open ? `<div class="hero__float hero__float--a"><div class="badge-ico">${icon('upload')}</div><div>${esc(L('Call for papers is open', 'Call for papers dibuka'))}<small>${esc(L('Until ', 'Hingga ') + fmtRange(sub.end, sub.end))}</small></div></div>` : ''}
        <div class="hero__float hero__float--b"><img src="${IMG('bicon-icon.png')}" alt=""></div>
        <div class="hero__orgs"><img src="${IMG('poltekkes-logo.png')}" alt="Kemenkes Poltekkes Bengkulu"></div>
      </div>
    </div>
  </section>

  <div class="wrap">
    <div class="stats rv">${SITE.stats.map((s) => `<div class="stat"><b>${esc(s.value)}<em>${esc(s.suffix)}</em></b><span>${esc(t(s.label))}</span></div>`)}</div>
  </div>

  <section class="section" id="about">
    <div class="wrap split">
      <div class="rv">
        <div class="eyebrow">${esc(L('About the conference', 'Tentang konferensi'))}</div>
        <h2 class="h2">${esc(t(SITE.oneHealth.title))}</h2>
        <p class="lead" style="margin:18px 0 12px">${esc(t(SITE.oneHealth.lead))}</p>
        <p style="color:var(--ink2)">${esc(t(SITE.background[1]))}</p>
        <div class="tag-list">${SITE.oneHealth.themes.map((x) => '<span class="chip">' + esc(t(x)) + '</span>').join('')}</div>
        <div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">${btn(L('Read the background', 'Baca latar belakang'), pageUrl('about'), 'btn--violet')}${btn(L('See the programme', 'Lihat program'), pageUrl('programme'), 'btn--outline', 'clock')}</div>
      </div>
      <div class="rv" data-d="2">${oneHealthSvg()}</div>
    </div>
  </section>

  <section class="section section--tint" id="speakers">
    <div class="wrap">
      <div class="sec-head sec-head--row rv">
        <div><div class="eyebrow">${esc(L('Invited speakers', 'Pembicara undangan'))}</div><h2 class="h2">${esc(L(SITE.speakers.length ? 'Five experts, five disciplines, one conversation' : 'Invited speakers', SITE.speakers.length ? 'Lima pakar, lima disiplin, satu percakapan' : 'Pembicara undangan'))}</h2></div>
        ${btn(L('All speakers', 'Semua pembicara'), pageUrl('speakers'), 'btn--outline')}
      </div>
      ${SITE.speakers.length ? '<div class="grid grid--spk">' + SITE.speakers.map((s) => speakerCard(s)).join('') + '</div>' : speakersEmpty()}
    </div>
  </section>

  <section class="section" id="dates">
    <div class="wrap">
      <div class="sec-head sec-head--row rv">
        <div><div class="eyebrow">${esc(L('Important dates', 'Tanggal penting'))}</div><h2 class="h2">${esc(L('From submission to proceedings', 'Dari pengiriman hingga prosiding'))}</h2></div>
        <button class="btn btn--outline" type="button" data-ics="dates">${icon('cal2')} ${esc(L('Add all dates to calendar', 'Tambahkan semua ke kalender'))}</button>
      </div>
      ${datesTimeline()}
      <p class="tl__n" style="margin-top:16px">${esc(L('All times and dates are in ', 'Seluruh waktu dan tanggal dalam '))}${esc(M.tzLabel)}.</p>
    </div>
  </section>

  <section class="section section--tint" id="scope">
    <div class="wrap">
      ${secHead(L('Scientific scope', 'Ruang lingkup ilmiah'), L('Ten scientific tracks', 'Sepuluh bidang ilmiah'), L('Submissions are welcome within, but not limited to, these areas.', 'Naskah diterima dalam, namun tidak terbatas pada, bidang berikut.'))}
      <div class="grid grid--2">${SITE.tracks.map(trackTile)}</div>
      <div style="margin-top:32px;display:flex;gap:12px;flex-wrap:wrap" class="rv">${btn(L('Call for papers', 'Call for papers'), pageUrl('call-for-papers'), 'btn--violet')}${btn(L('Author guidelines', 'Panduan penulis'), pageUrl('author-guidelines'), 'btn--outline', 'file')}</div>
    </div>
  </section>

  <section class="section" id="fees">
    <div class="wrap">
      ${secHead(L('Registration fees', 'Biaya registrasi'), L('Simple, transparent fees for presenters and participants', 'Biaya yang sederhana dan transparan untuk presenter dan peserta'))}
      <div class="grid grid--4">${fees.presenters.concat(fees.participants).map((f, i) => feeCard(f, i))}</div>
      <div class="offer rv" style="margin-top:26px">${icon('gift')}<div><h4>${esc(t(fees.special.title))}</h4><p>${esc(t(fees.special.text))}</p></div></div>
      <div class="rv">${notesList(fees.notes.slice(0, 3))}</div>
      <div style="margin-top:26px" class="rv">${btn(L('Register now', 'Daftar sekarang'), pageUrl('registration'), 'btn--primary btn--lg')}</div>
    </div>
  </section>

  <section class="section section--tint" id="publication">
    <div class="wrap">
      ${secHead(L('Publication options', 'Pilihan publikasi'), L('Choose one output when you submit your paper', 'Pilih satu luaran saat mengirim naskah'), L('Presented papers can be published in nationally accredited journals or in the B-ICON Proceeding.', 'Makalah yang dipresentasikan dapat diterbitkan di jurnal terakreditasi nasional atau Prosiding B-ICON.'))}
      <div class="grid grid--2">${SITE.publications.map(pubCard)}</div>
      <div class="callout callout--o rv" style="margin-top:22px"><p>${esc(t(SITE.publicationNotes[2]))}</p></div>
    </div>
  </section>

  <section class="section" id="programme">
    <div class="wrap">
      <div class="sec-head sec-head--row rv">
        <div><div class="eyebrow">${esc(L('Plenary seminar · ', 'Seminar pleno · ') + fmtRange(M.seminarDate))}</div><h2 class="h2">${esc(L('Programme at a glance', 'Program sekilas'))}</h2></div>
        ${btn(L('Full programme', 'Program lengkap'), pageUrl('programme'), 'btn--outline', 'arrow')}
      </div>
      ${invitedTalks.length ? '' : speakersEmpty()}
      <div class="grid grid--2">${invitedTalks.map((k, i) => { const s = speakerById(k.speaker); return `<button type="button" class="card card--lift rv" data-speaker="${esc(s.id)}" data-d="${i % 2}" style="display:flex;gap:16px;align-items:center;text-align:left;padding:18px"><img class="prog__av" src="${SPK(s.photo)}" alt="" width="64" height="64" loading="lazy"><span><span class="spk__n">${esc(k.time)}–${esc(k.end)} WIB · ${esc(t(s.field))}</span><span style="display:block;font-family:var(--font-d);font-weight:700;font-size:18px;line-height:1.25;margin:4px 0">${esc(t(s.topic))}</span><span style="color:var(--muted);font-size:14px">${esc(s.name)}</span></span></button>`; })}</div>
    </div>
  </section>

  <section class="section expo" id="expo" style="overflow:hidden">
    <div class="wrap split" style="grid-template-columns:.9fr 1.1fr">
      <div class="rv">
        <div class="eyebrow" style="color:var(--a400)">${esc(L('Virtual poster exhibition', 'Pameran poster virtual'))}</div>
        <h2 class="h2" style="color:#fff">${esc(L('Walk the gallery from anywhere', 'Jelajahi galeri dari mana saja'))}</h2>
        <p class="lead" style="margin:16px 0 26px;color:rgba(255,255,255,.8)">${esc(L('Accepted posters are displayed in an online hall you can browse by track, search by keyword, read the abstract and show your appreciation to the authors.', 'Poster yang diterima ditampilkan di aula daring yang dapat Anda jelajahi per bidang, cari dengan kata kunci, baca abstraknya, dan berikan apresiasi kepada penulis.'))}</p>
        ${btn(L('Enter the exhibition', 'Masuk ke pameran'), pageUrl('poster-exhibition'), 'btn--primary btn--lg', 'arrow')}
      </div>
      <div class="rv" data-d="2" style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:end;padding:8px 12px 20px">
        <div class="frame"><div class="frame__mat"><img src="${IMG('poster-cfp.jpg')}" alt="${esc(L('B-ICON 2026 call for papers poster', 'Poster call for papers B-ICON 2026'))}" loading="lazy"></div></div>
        <div class="frame" style="transform:translateY(-16px)"><div class="frame__mat"><div class="frame__ph" style="flex-direction:column;gap:8px;font-size:14px;text-align:center;font-weight:700;color:var(--v600);padding:10px"><img src="${IMG('bicon-icon.png')}" alt="" width="60" style="opacity:.9"><span>${esc(L('Your poster here', 'Poster Anda di sini'))}</span></div></div></div>
        <div class="frame"><div class="frame__mat"><div class="frame__ph" style="flex-direction:column;gap:8px;font-size:14px;text-align:center;font-weight:700;color:var(--v600);padding:10px"><img src="${IMG('bicon-icon.png')}" alt="" width="60" style="opacity:.9"><span>${esc(L('Your poster here', 'Poster Anda di sini'))}</span></div></div></div>
      </div>
    </div>
  </section>

  <section class="section" id="news">
    <div class="wrap">
      <div class="sec-head sec-head--row rv">
        <div><div class="eyebrow">${esc(L('News', 'Berita'))}</div><h2 class="h2">${esc(L('Latest announcements', 'Pengumuman terbaru'))}</h2></div>
        ${btn(L('All news', 'Semua berita'), pageUrl('news'), 'btn--outline')}
      </div>
      <div id="home-news"><div class="empty">${esc(L('Loading…', 'Memuat…'))}</div></div>
    </div>
  </section>

  <section class="section section--tint" id="venue">
    <div class="wrap">
      <div class="split">
        <div class="rv">
          <div class="eyebrow">${esc(L('Venue and contact', 'Lokasi dan kontak'))}</div>
          <h2 class="h2">${esc(L('Hosted in Bengkulu, open to the world', 'Berpusat di Bengkulu, terbuka untuk dunia'))}</h2>
          <ul class="foot-list" style="margin:22px 0 26px;color:var(--ink2);gap:14px;font-size:16px">
            <li>${icon('pin')}<span><b>${esc(t(M.venue))}</b><br>${esc(M.address)}</span></li>
            <li>${icon('wa')}<span><a href="${waLink()}" target="_blank" rel="noopener">${esc(M.contact.whatsappLabel)}</a> (WhatsApp)</span></li>
            <li>${icon('mail')}<span><a href="mailto:${esc(M.contact.email)}">${esc(M.contact.email)}</a></span></li>
          </ul>
          <div class="partners">${`<div class="partner"><img src="${IMG('poltekkes-logo.png')}" alt="Kemenkes Poltekkes Bengkulu" style="max-height:44px"><span>Poltekkes Kemenkes Bengkulu</span></div>`}</div>
        </div>
        <div class="rv" data-d="2"><div class="map"><iframe title="${esc(L('Map of Poltekkes Kemenkes Bengkulu', 'Peta Poltekkes Kemenkes Bengkulu'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(M.mapQuery)}&output=embed"></iframe></div></div>
      </div>
      <div style="margin-top:56px">${ctaBand(L('Join us on 27 to 29 October 2026', 'Bergabunglah pada 27 sampai 29 Oktober 2026'), L('Present your research, hear from international experts and build collaborations for a healthier, better prepared region.', 'Presentasikan penelitian Anda, dengarkan pakar internasional, dan bangun kolaborasi untuk kawasan yang lebih sehat dan siap.'), btn(L('Register now', 'Daftar sekarang'), pageUrl('registration'), 'btn--primary btn--lg') + btn(L('Contact us', 'Hubungi kami'), pageUrl('contact'), 'btn--ghost btn--lg', 'mail'))}</div>
    </div>
  </section>`;
  return {
    title: t(M.name) + ' (B-ICON 2026)',
    desc: t(M.theme) + '. ' + fmtRange(M.startDate, M.endDate) + '.',
    main,
    init() { initCountdowns(); bindSpeakerCards(); fillNews('#home-news', 3); }
  };
};

/* ==========================================================================
   ABOUT
   ========================================================================== */
PAGES.about = function () {
  const o = SITE.objectives;
  const main = html`
  ${pageHero({ title: L('About B-ICON 2026', 'Tentang B-ICON 2026'), lead: t(M.themeLocal) + '.' })}
  <section class="section">
    <div class="wrap split" style="align-items:start">
      <div class="prose rv">
        <div class="eyebrow">${esc(L('Background', 'Latar belakang'))}</div>
        <h2 class="h2" style="margin-bottom:22px">${esc(t(M.theme))}</h2>
        ${SITE.background.map((p) => '<p>' + esc(t(p)) + '</p>')}
      </div>
      <div class="rv" data-d="2" style="position:sticky;top:calc(var(--header-h) + 24px)">
        <div class="card" style="padding:30px">${oneHealthSvg()}<p class="tl__n" style="text-align:center;margin:8px 0 0">${esc(L('People, animals and the environment share one health.', 'Manusia, hewan, dan lingkungan berbagi satu kesehatan.'))}</p></div>
        <div class="card" style="margin-top:18px;background:var(--v900);color:#fff;border:0"><div class="eyebrow" style="color:var(--a400)">${esc(L('Key facts', 'Fakta utama'))}</div>
          <ul class="foot-list" style="color:#fff;gap:14px;font-size:15.5px">
            <li>${icon('calendar')}<span>${esc(fmtRange(M.startDate, M.endDate))}</span></li>
            <li>${icon('globe')}<span>${esc(t(M.format))}</span></li>
            <li>${icon('pin')}<span>${esc(t(M.venue))}</span></li>
            <li>${icon('users')}<span>${esc(L('Target of about ', 'Target sekitar ') + M.targetParticipants + L(' participants from Indonesia and abroad', ' peserta dari dalam dan luar negeri'))}</span></li>
          </ul></div>
      </div>
    </div>
  </section>

  <section class="section section--tint">
    <div class="wrap">
      ${secHead(L('Objectives', 'Tujuan'), L('What we want to achieve', 'Apa yang ingin dicapai'))}
      <div class="card rv" style="background:linear-gradient(135deg,var(--v800),var(--v600));color:#fff;border:0;margin-bottom:26px"><div class="eyebrow" style="color:var(--a400)">${esc(L('General objective', 'Tujuan umum'))}</div><p style="font-family:var(--font-d);font-size:clamp(20px,2.4vw,27px);line-height:1.35;margin:0;font-weight:600;letter-spacing:-.01em">${esc(t(o.general))}</p></div>
      <ol class="num-list">${o.specific.map((s, i) => `<li class="rv" data-d="${i % 3}">${esc(t(s))}</li>`)}</ol>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead(L('Format', 'Bentuk kegiatan'), L('A scientific forum built around conversation', 'Forum ilmiah yang dibangun dari percakapan'), L('A hybrid plenary seminar of about seven hours, followed by online oral and poster presentations.', 'Seminar pleno hibrida sekitar tujuh jam, dilanjutkan presentasi oral dan poster secara daring.'))}
      <div class="grid grid--2">${SITE.format.items.map((f, i) => `<div class="card feat rv" data-d="${i % 2}"><div class="feat__ico">${icon(f.icon)}</div><div><h4>${esc(t(f.title))}</h4><p>${esc(t(f.text))}</p></div></div>`)}</div>
    </div>
  </section>

  <section class="section section--tint">
    <div class="wrap split" style="align-items:start">
      <div class="rv">
        <div class="eyebrow">${esc(L('Who should join', 'Siapa yang sebaiknya bergabung'))}</div>
        <h2 class="h2">${esc(L('A conference for every health profession', 'Konferensi untuk semua profesi kesehatan'))}</h2>
        <p class="lead" style="margin-top:14px">${esc(L('We aim to welcome about ', 'Kami menargetkan sekitar ') + M.targetParticipants + L(' participants from Indonesia and abroad.', ' peserta dari dalam dan luar negeri.'))}</p>
      </div>
      <ul class="check-list rv" data-d="2">${SITE.audience.map((a) => '<li>' + icon('checkc') + '<span>' + esc(t(a)) + '</span></li>')}</ul>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead(L('Organiser', 'Penyelenggara'), t(M.organizer))}
      <div class="card rv" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap"><img src="${IMG('poltekkes-logo.png')}" alt="Kemenkes Poltekkes Bengkulu" style="height:58px;width:auto"></div>
        <div style="flex:1;min-width:260px"><p style="margin:0 0 6px;font-weight:700">${esc(M.address)}</p><p style="margin:8px 0 0"><a href="${esc(M.orgWebsite)}" target="_blank" rel="noopener">${esc(M.orgWebsite.replace('https://', ''))} ${icon('ext')}</a></p></div>
      </div>
    </div>
  </section>
  ${extraBlock()}`;
  return { title: L('About B-ICON 2026', 'Tentang B-ICON 2026'), desc: t(SITE.background[0]).slice(0, 155), main, init() {} };
};

/* ==========================================================================
   PROGRAMME
   ========================================================================== */
function minutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
PAGES.programme = function () {
  const rows = SITE.schedule.map((s, i) => {
    const sp = s.speaker ? speakerById(s.speaker) : null;
    const dur = minutes(s.end) - minutes(s.time);
    const badge = { invited: ['chip--o', L('Invited speaker', 'Pembicara undangan')], panel: ['', L('Panel', 'Panel')], break: ['chip--line', L('Break', 'Istirahat')], registration: ['chip--line', L('Check-in', 'Registrasi')], opening: ['chip--line', L('Opening', 'Pembukaan')], closing: ['chip--line', L('Closing', 'Penutup')] }[s.type];
    let body;
    if (sp) {
      body = '<img class="prog__av" src="' + SPK(sp.photo) + '" alt="" width="64" height="64" loading="lazy"><div class="prog__body"><div class="spk__n" style="margin-bottom:2px">' + esc(t(s.title)) + '</div><div class="prog__ttl">' + esc(t(sp.topic)) + '</div><div class="prog__meta"><b>' + esc(sp.name) + '</b> · ' + esc(sp.org) + '</div></div>';
    } else {
      const panNames = (s.panelists || []).map((id) => speakerById(id)).filter(Boolean).map((x) => x.name);
      const pan = panNames.length ? '<div class="prog__meta">' + esc(L('Moderator and ', 'Moderator dan ')) + panNames.map(esc).join(', ') + '</div>' : '';
      body = '<div class="prog__body"><div class="prog__ttl">' + esc(t(s.title)) + '</div>' + (s.desc ? '<div class="prog__topic">' + esc(t(s.desc)) + '</div>' : '') + pan + '</div>';
    }
    const tag = sp ? 'button type="button" data-speaker="' + esc(sp.id) + '" style="text-align:left;width:100%;font:inherit;color:inherit"' : 'div';
    const tagEnd = sp ? 'button' : 'div';
    return '<div class="prog__row rv"><div class="prog__time">' + esc(s.time) + '<small>' + esc(L('until ', 'sampai ')) + esc(s.end) + '</small></div><' + tag + ' class="prog__card t-' + s.type + '">' + body + '<div class="prog__badge" style="text-align:right"><span class="chip ' + badge[0] + '">' + esc(badge[1]) + '</span><div class="prog__dur" style="margin-top:6px">' + dur + ' ' + esc(L('min', 'menit')) + '</div></div></' + tagEnd + '></div>';
  }).join('');
  const main = html`
  ${pageHero({ title: L('Plenary programme', 'Susunan acara pleno'), lead: L('Tuesday, 27 October 2026. Hybrid seminar at the Auditorium of Poltekkes Kemenkes Bengkulu and online. All times in WIB (UTC+7).', 'Selasa, 27 Oktober 2026. Seminar hibrida di Auditorium Poltekkes Kemenkes Bengkulu dan daring. Seluruh waktu dalam WIB (UTC+7).'), parent: [L('Programme', 'Program'), pageUrl('programme')], actions: `<button class="btn btn--primary" type="button" data-ics="seminar">${icon('cal2')} ${esc(L('Add to my calendar', 'Tambahkan ke kalender'))}</button>${btn(L('Register', 'Daftar'), pageUrl('registration'), 'btn--ghost')}` })}
  <section class="section">
    <div class="wrap">
      <div class="grid grid--3" style="margin-bottom:40px">
        <div class="card"><div class="eyebrow">${esc(L('Date', 'Tanggal'))}</div><b style="font-size:19px">${esc(fmt(dObj(M.seminarDate), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</b></div>
        <div class="card"><div class="eyebrow">${esc(L('Time', 'Waktu'))}</div><b style="font-size:19px">${esc(M.seminarStart)}–${esc(M.seminarEnd)} WIB</b><div class="tl__n">${esc(L('Check-in opens at 07:30', 'Registrasi dibuka pukul 07.30'))}</div></div>
        <div class="card"><div class="eyebrow">${esc(L('Where', 'Tempat'))}</div><b style="font-size:19px">${esc(t(M.venue))}</b><div class="tl__n">${esc(L('and online for remote participants', 'dan daring bagi peserta jarak jauh'))}</div></div>
      </div>
      <div class="prog">${rows}</div>
      <div class="callout callout--o rv" style="margin-top:34px"><p><b>${esc(L('Oral and poster presentations', 'Presentasi oral dan poster'))}</b> ${esc(L('run online on 28 October 2026. The best presenter announcement follows on 29 October 2026. The presenter schedule is announced after acceptance notifications on 17 October 2026.', 'berlangsung daring pada 28 Oktober 2026. Pengumuman best presenter menyusul pada 29 Oktober 2026. Jadwal presenter diumumkan setelah pemberitahuan penerimaan pada 17 Oktober 2026.'))}</p></div>
    </div>
  </section>${extraBlock()}`;
  return { title: L('Programme', 'Program'), desc: L('Plenary programme of B-ICON 2026 on 27 October 2026.', 'Susunan acara pleno B-ICON 2026 pada 27 Oktober 2026.'), main, init() { bindSpeakerCards(); } };
};

/* ==========================================================================
   SPEAKERS
   ========================================================================== */
PAGES.speakers = function () {
  const main = html`
  ${pageHero({ title: L('Invited speakers', 'Pembicara undangan'), lead: SITE.speakers.length ? L('Five experts from Singapore, Indonesia, Malaysia, Thailand and the United Kingdom, each speaking to one pillar of the One Health response.', 'Lima pakar dari Singapura, Indonesia, Malaysia, Thailand, dan Inggris Raya, masing-masing membahas satu pilar respons One Health.') : L('Invitations are being finalised. The confirmed line-up will appear here.', 'Undangan sedang difinalisasi. Daftar pembicara yang telah dikonfirmasi akan tampil di sini.'), parent: [L('Programme', 'Program'), pageUrl('programme')] })}
  <section class="section">
    <div class="wrap">
      ${SITE.speakers.length ? '<div class="grid grid--3">' + SITE.speakers.map((s) => speakerCard(s)).join('') + '</div><div class="callout rv" style="margin-top:34px"><p>' + esc(L('Select a speaker to read the full profile and session abstract.', 'Pilih pembicara untuk membaca profil lengkap dan abstrak sesi.')) + '</p></div>' : speakersEmpty()}
    </div>
  </section>${extraBlock()}`;
  return { title: L('Invited speakers', 'Pembicara undangan'), desc: L('Meet the five invited speakers of B-ICON 2026.', 'Kenali lima pembicara undangan B-ICON 2026.'), main, init() { bindSpeakerCards(); } };
};

/* ==========================================================================
   IMPORTANT DATES + VENUE
   ========================================================================== */
PAGES['important-dates'] = function () {
  const main = html`
  ${pageHero({ title: L('Important dates and venue', 'Tanggal penting dan lokasi'), lead: L('Keep these dates in view. Payment follows the acceptance notification.', 'Perhatikan tanggal berikut. Pembayaran dilakukan setelah pemberitahuan penerimaan.'), parent: [L('Programme', 'Program'), pageUrl('programme')], actions: `<button class="btn btn--primary" type="button" data-ics="dates">${icon('cal2')} ${esc(L('Add all dates to calendar', 'Tambahkan semua ke kalender'))}</button>` })}
  <section class="section">
    <div class="wrap">
      ${datesTimeline()}
      <p class="tl__n" style="margin-top:16px">${esc(L('All times and dates are in ', 'Seluruh waktu dan tanggal dalam '))}${esc(M.tzLabel)}. ${esc(L('Dates may be adjusted by the committee; the latest version is always shown here.', 'Tanggal dapat disesuaikan panitia; versi terbaru selalu ditampilkan di sini.'))}</p>
    </div>
  </section>
  <section class="section section--tint">
    <div class="wrap">
      ${secHead(L('Venue and format', 'Lokasi dan format'), L('Online for presenters, hybrid for the plenary seminar', 'Daring untuk presenter, hibrida untuk seminar pleno'))}
      <div class="grid grid--2">
        <div class="card feat rv"><div class="feat__ico">${icon('globe')}</div><div><h4>${esc(L('Hybrid conference', 'Konferensi hibrida'))}</h4><p>${esc(L('All oral and poster presentations are conducted online on 28 October 2026. The best presenter announcement follows on 29 October 2026. Access details are shared with registered participants by the committee.', 'Seluruh presentasi oral dan poster dilaksanakan daring pada 28 Oktober 2026. Pengumuman best presenter menyusul pada 29 Oktober 2026. Detail akses dibagikan panitia kepada peserta terdaftar.'))}</p></div></div>
        <div class="card feat rv" data-d="1"><div class="feat__ico">${icon('building')}</div><div><h4>${esc(t(M.venue))}</h4><p>${esc(L('The plenary seminar on 27 October is hybrid, with an onsite audience. ', 'Seminar pleno 27 Oktober berformat hibrida dengan peserta luring. '))}${esc(M.address)}</p></div></div>
      </div>
      <div class="rv" style="margin-top:26px"><div class="map"><iframe title="${esc(L('Map', 'Peta'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(M.mapQuery)}&output=embed"></iframe></div></div>
    </div>
  </section>${extraBlock()}`;
  return { title: L('Important dates', 'Tanggal penting'), desc: L('Deadlines and key dates for B-ICON 2026.', 'Batas waktu dan tanggal penting B-ICON 2026.'), main, init() {} };
};

/* ==========================================================================
   COMMITTEE
   ========================================================================== */
PAGES.committee = function () {
  const groups = SITE.committee.groups.filter((g) => g.members && g.members.length);
  const main = html`
  ${pageHero({ title: L('Organizing committee', 'Panitia penyelenggara'), lead: t(M.organizer) + '.', parent: [L('About', 'Tentang'), pageUrl('about')] })}
  <section class="section">
    <div class="wrap">
      ${groups.map((g) => `<div class="rv" style="margin-bottom:38px"><h3 class="h3" style="margin-bottom:18px">${esc(t(g.title))}</h3><div class="grid grid--3">${g.members.map((m) => `<div class="card person"><div class="person__av">${esc(m.name.replace(/^(Ns\.|Dr\.|Prof\.)\s*/i, '').charAt(0))}</div><div><b>${esc(m.name)}</b><span>${esc(t(m.role))}${m.org ? '<br>' + esc(m.org) : ''}</span></div></div>`).join('')}</div></div>`)}
      <div class="callout rv"><p>${esc(t(SITE.committee.note))}</p></div>
      <div class="rv" style="margin-top:30px;display:flex;gap:12px;flex-wrap:wrap">${btn(L('Contact the committee', 'Hubungi panitia'), pageUrl('contact'), 'btn--violet', 'mail')}</div>
    </div>
  </section>${extraBlock()}`;
  return { title: L('Organizing committee', 'Panitia penyelenggara'), desc: t(M.organizer), main, init() {} };
};

/* ==========================================================================
   CALL FOR PAPERS
   ========================================================================== */
PAGES['call-for-papers'] = function () {
  const sub = SITE.dates.find((d) => d.id === 'submission');
  const main = html`
  ${pageHero({ title: L('Call for papers', 'Call for papers'), lead: L('Submit your research on infectious diseases and emerging health threats. Present orally or as a poster, and publish in a journal up to SINTA 2.', 'Kirimkan penelitian Anda tentang penyakit menular dan ancaman kesehatan baru. Presentasikan secara oral atau poster, dan terbitkan di jurnal hingga SINTA 2.'), parent: [L('Call for Papers', 'Call for Papers'), pageUrl('call-for-papers')], actions: btn(L('Register as presenter', 'Daftar sebagai presenter'), pageUrl('registration'), 'btn--primary') + btn(L('Author guidelines', 'Panduan penulis'), pageUrl('author-guidelines'), 'btn--ghost', 'file') })}
  <section class="section">
    <div class="wrap split" style="align-items:start">
      <div class="rv">
        <div class="eyebrow">${esc(L('Theme', 'Tema'))}</div>
        <h2 class="h2">${esc(t(M.theme))}</h2>
        <p class="lead" style="margin:18px 0 22px">${esc(L('Full paper submission runs from ', 'Pengiriman naskah lengkap berlangsung ') + fmtRange(sub.start, sub.end) + L(', and acceptance is announced on 17 October 2026.', ', dan penerimaan diumumkan pada 17 Oktober 2026.'))}</p>
        <div class="grid grid--2" style="gap:14px">
          <div class="card feat" style="padding:20px"><div class="feat__ico" style="background:linear-gradient(135deg,var(--o500),var(--o600))">${icon('mic')}</div><div><h4>${esc(L('Oral presentation', 'Presentasi oral'))}</h4><p>${esc(L('Presented online in a scheduled session.', 'Dipresentasikan daring pada sesi terjadwal.'))}</p></div></div>
          <div class="card feat" style="padding:20px"><div class="feat__ico">${icon('board')}</div><div><h4>${esc(L('Poster presentation', 'Presentasi poster'))}</h4><p>${esc(L('Shown in the virtual poster exhibition.', 'Ditampilkan di pameran poster virtual.'))}</p></div></div>
        </div>
        <div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">${ojsBtn()}<a class="btn btn--outline" href="${IMG('poster-cfp.jpg')}" download>${icon('download')} ${esc(L('Download poster', 'Unduh poster'))}</a></div>
      </div>
      <div class="rv" data-d="2"><button class="poster-shot" type="button" data-zoom="${IMG('poster-cfp.jpg')}" aria-label="${esc(L('Enlarge the call for papers poster', 'Perbesar poster call for papers'))}"><img src="${IMG('poster-cfp.jpg')}" alt="${esc(L('B-ICON 2026 call for papers poster', 'Poster call for papers B-ICON 2026'))}" loading="lazy"><span class="chip chip--dark" style="background:rgba(27,11,77,.85)">${icon('zoom')} ${esc(L('Enlarge', 'Perbesar'))}</span></button></div>
    </div>
  </section>

  <section class="section section--tint" id="scope">
    <div class="wrap">
      ${secHead(L('Scope', 'Ruang lingkup'), L('Submissions are welcome within, but not limited to, these areas', 'Naskah diterima dalam, namun tidak terbatas pada, bidang berikut'))}
      <div class="grid grid--2">${SITE.tracks.map(trackTile)}</div>
    </div>
  </section>

  <section class="section" id="publication">
    <div class="wrap">
      ${secHead(L('Publication options', 'Pilihan publikasi'), L('Each presenter selects one preferred output at the time of submission', 'Setiap presenter memilih satu luaran publikasi saat pengiriman naskah'))}
      <div class="grid grid--2">${SITE.publications.map(pubCard)}</div>
      <div class="rv">${notesList(SITE.publicationNotes)}</div>
    </div>
  </section>

  <section class="section section--tint">
    <div class="wrap">
      ${secHead(L('Key dates', 'Tanggal penting'), L('Plan your submission', 'Rencanakan pengiriman Anda'))}
      ${datesTimeline(6)}
      <div style="margin-top:24px" class="rv">${btn(L('See all dates', 'Lihat semua tanggal'), pageUrl('important-dates'), 'btn--outline', 'calendar')}</div>
    </div>
  </section>
  <section class="section section--tight"><div class="wrap">${ctaBand(L('Ready to present?', 'Siap presentasi?'), L('Register on this website, then submit the same paper yourself to OJS B-ICON Proceeding for review.', 'Registrasi di situs ini, lalu submit sendiri naskah yang sama ke OJS B-ICON Proceeding untuk direview.'), btn(L('Register now', 'Daftar sekarang'), pageUrl('registration'), 'btn--primary btn--lg') + ojsBtn(L('Open OJS', 'Buka OJS'), 'btn--ghost btn--lg'))}</div></section>
  ${extraBlock()}`;
  return { title: L('Call for papers', 'Call for papers'), desc: L('Call for papers: One Health in Action. Ten tracks, oral and poster, publication up to SINTA 2.', 'Call for papers: One Health in Action. Sepuluh bidang, oral dan poster, publikasi hingga SINTA 2.'), main, init() { bindZoom(); } };
};
function bindZoom() {
  ROOT.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]'); if (!z) return;
    openModal('<div style="background:#0F0730;padding:18px;display:grid;place-items:center"><img src="' + esc(z.dataset.zoom) + '" alt="" style="max-height:calc(100vh - 80px);width:auto;border-radius:6px"></div>', { width: 'min(720px,100%)', label: 'Poster' });
  });
}

/* ==========================================================================
   AUTHOR GUIDELINES
   ========================================================================== */
PAGES['author-guidelines'] = function () {
  const steps = [
    [L('Register and submit', 'Registrasi dan kirim naskah'), L('Complete the registration form as a presenter and upload your full manuscript in the same form. You receive a registration ID by email.', 'Lengkapi formulir registrasi sebagai presenter dan unggah naskah lengkap Anda pada formulir yang sama. Anda menerima ID registrasi lewat email.')],
    [L('Submit your full paper', 'Kirim naskah lengkap'), L('Choose one publication option when you register, between 21 September and 10 October 2026, then submit the same paper yourself to OJS B-ICON Proceeding — that is where the committee\'s review takes place.', 'Pilih satu opsi publikasi saat Anda registrasi, antara 21 September dan 10 Oktober 2026, lalu submit sendiri naskah yang sama ke OJS B-ICON Proceeding — di sanalah review oleh panitia dilakukan.')],
    [L('Acceptance and payment', 'Penerimaan dan pembayaran'), L('The science committee reviews the paper and acceptance is announced on 17 October. Pay the registration fee by 19 October and upload the proof on My Registration.', 'Komite ilmiah mereview naskah dan penerimaan diumumkan 17 Oktober. Bayar biaya registrasi paling lambat 19 Oktober dan unggah bukti di Registrasi Saya.')],
    [L('Camera-ready materials', 'Materi final'), L('Send your final presentation slides or poster by 21 October 2026. Posters join the virtual exhibition.', 'Kirim slide presentasi atau poster final paling lambat 21 Oktober 2026. Poster masuk ke pameran virtual.')],
    [L('Present and publish', 'Presentasi dan publikasi'), L('Present online on 28 October. Submit the final full paper by 11 November; the B-ICON proceedings are published by 31 December 2026.', 'Presentasikan daring pada 28 Oktober. Kirim naskah lengkap final paling lambat 11 November; prosiding B-ICON terbit paling lambat 31 Desember 2026.')]
  ];
  const main = html`
  ${pageHero({ title: L('Author guidelines', 'Panduan penulis'), lead: L('From registration to publication in five steps.', 'Dari registrasi hingga publikasi dalam lima langkah.'), parent: [L('Call for Papers', 'Call for Papers'), pageUrl('call-for-papers')], actions: btn(L('Register as presenter', 'Daftar sebagai presenter'), pageUrl('registration'), 'btn--primary') + ojsBtn(L('Open OJS', 'Buka OJS'), 'btn--ghost') })}
  <section class="section">
    <div class="wrap">
      ${secHead(L('How to submit', 'Cara mengirim'), L('Five steps for presenters', 'Lima langkah untuk presenter'))}
      <div class="steps steps--5" style="margin-top:12px">${steps.map((s, i) => `<div class="step rv" data-d="${i % 3}"><h4>${esc(s[0])}</h4><p>${esc(s[1])}</p></div>`)}</div>
    </div>
  </section>
  <section class="section section--tint">
    <div class="wrap split" style="align-items:start">
      <div class="rv">
        <div class="eyebrow">${esc(L('Requirements', 'Ketentuan'))}</div>
        <h2 class="h2">${esc(L('Before you submit', 'Sebelum Anda mengirim'))}</h2>
        <ul class="check-list" style="margin-top:22px">
          <li>${icon('checkc')}<span>${esc(t(SITE.publicationNotes[0]))}</span></li>
          <li>${icon('checkc')}<span>${esc(L('Your manuscript must follow the scope, author guidelines and template of the publication option you select.', 'Naskah Anda harus mengikuti ruang lingkup, panduan penulis, dan templat dari opsi publikasi yang dipilih.'))}</span></li>
          <li>${icon('checkc')}<span>${esc(t(SITE.publicationNotes[1]))}</span></li>
          <li>${icon('checkc')}<span>${esc(t(SITE.fees.notes[0]))}</span></li>
          <li>${icon('checkc')}<span>${esc(t(SITE.fees.notes[1]))}</span></li>
          <li>${icon('checkc')}<span>${esc(t(SITE.publicationNotes[2]))}</span></li>
        </ul>
      </div>
      <div class="rv" data-d="2">
        <div class="card" style="padding:30px"><h3 class="h3" style="margin-bottom:12px">${esc(L('Publication options', 'Pilihan publikasi'))}</h3>
          <ul class="notes" style="margin-top:0">${SITE.publications.map((p) => `<li><span class="pub__n" style="background:${p.color};width:30px;height:30px;font-size:14px;flex:none;border-radius:50%;color:#fff;display:grid;place-items:center;font-weight:800">${p.n}</span><span><b>${esc(p.name)}</b> <span class="chip" style="margin-left:4px">${esc(p.index)}</span></span></li>`)}</ul>
        </div>
        <div class="card" style="margin-top:18px;padding:26px"><h4 style="font-size:19px;margin-bottom:8px">${esc(L('Submitting in OJS', 'Submit di OJS'))}</h4><p style="color:var(--ink2);font-size:15px">${esc(L('At the time of registration, every article — including those choosing a journal as their publication output — must be submitted to the same system: OJS B-ICON Proceeding. All initial review by the B-ICON committee takes place there. If this is your first time using OJS B-ICON Proceeding, start by creating an account. If you already have one, log in with it, or if you forgot your password, choose the forgot-password option and you will receive a link by email to reset it.', 'Pada saat registrasi, semua artikel, termasuk yang memilih publikasi ke jurnal, semuanya harus disubmit ke OJS yang sama yaitu OJS B-ICON Proceeding. Semua proses review awal oleh panitia B-ICON akan dilakukan di OJS B-ICON. Jika Anda baru pertama kali mengakses OJS B-ICON Proceeding, silakan mulai dengan membuat akun terlebih dahulu. Jika sudah pernah, silakan login dengan akun Anda, atau jika lupa password, pilih yang lupa password dan Anda akan mendapatkan tautan di email untuk mengubah password Anda.'))}</p><div style="display:flex;gap:10px;flex-wrap:wrap">${ojsBtn(L('Open OJS B-ICON Proceeding', 'Buka OJS B-ICON Proceeding'), 'btn--outline btn--sm')}</div></div>
      </div>
    </div>
  </section>
  <section class="section section--tight"><div class="wrap">${ctaBand(L('Questions about your manuscript?', 'Ada pertanyaan tentang naskah Anda?'), L('The secretariat replies on WhatsApp and email.', 'Sekretariat membalas melalui WhatsApp dan email.'), btn(L('WhatsApp the secretariat', 'WhatsApp sekretariat'), waLink(), 'btn--primary btn--lg', 'wa', true) + btn(L('FAQ', 'FAQ'), pageUrl('faq'), 'btn--ghost btn--lg', 'help'))}</div></section>
  ${extraBlock()}`;
  return { title: L('Author guidelines', 'Panduan penulis'), desc: L('How to submit your paper to B-ICON 2026 through the proceedings system.', 'Cara mengirim naskah ke B-ICON 2026 melalui sistem prosiding.'), main, init() {} };
};

/* ==========================================================================
   FAQ / CONTACT / GALLERY / NEWS / PRIVACY / 404 / POST
   ========================================================================== */
PAGES.faq = function () {
  const main = html`
  ${pageHero({ title: L('Frequently asked questions', 'Pertanyaan yang sering diajukan'), lead: L('Quick answers about dates, fees, submission and certificates.', 'Jawaban singkat tentang tanggal, biaya, pengiriman naskah, dan sertifikat.'), parent: [L('About', 'Tentang'), pageUrl('about')] })}
  <section class="section"><div class="wrap" style="max-width:900px">${accordion(SITE.faq)}
    <div class="callout rv" style="margin-top:32px"><p><b>${esc(L('Still have a question?', 'Masih ada pertanyaan?'))}</b> ${esc(L('Message the secretariat and we will reply as soon as we can.', 'Kirim pesan ke sekretariat dan kami akan membalas secepatnya.'))}</p></div>
    <div class="rv" style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">${btn(L('WhatsApp', 'WhatsApp'), waLink(), 'btn--primary', 'wa', true)}${btn(L('Contact form', 'Formulir kontak'), pageUrl('contact'), 'btn--outline', 'mail')}</div></div></section>${extraBlock()}`;
  return { title: 'FAQ', desc: L('Answers to common questions about B-ICON 2026.', 'Jawaban atas pertanyaan umum tentang B-ICON 2026.'), main, init() {} };
};

PAGES.contact = function () {
  const c = M.contact;
  const main = html`
  ${pageHero({ title: L('Contact us', 'Hubungi kami'), lead: L('The secretariat answers questions about registration, submission, payment and the programme.', 'Sekretariat menjawab pertanyaan tentang registrasi, pengiriman naskah, pembayaran, dan program.'), parent: [L('Contact', 'Kontak'), pageUrl('contact')] })}
  <section class="section">
    <div class="wrap split" style="align-items:start">
      <div>
        <div class="grid" style="gap:16px">
          <a class="card card--lift contact-card wa rv" href="${waLink()}" target="_blank" rel="noopener" style="text-decoration:none">${icon('wa')}<div><h4>WhatsApp</h4><p>${esc(c.whatsappLabel)}</p><p class="tl__n">${esc(L('WhatsApp messages only', 'Hanya pesan WhatsApp'))}</p></div></a>
          <a class="card card--lift contact-card rv" href="mailto:${esc(c.email)}" style="text-decoration:none">${icon('mail')}<div><h4>Email</h4><p>${esc(c.email)}</p></div></a>
          <div class="card contact-card rv">${icon('pin')}<div><h4>${esc(L('Address', 'Alamat'))}</h4><p>${esc(t(M.organizer))}<br>${esc(M.address)}</p></div></div>
          <div class="card contact-card rv">${icon('phone')}<div><h4>${esc(L('Seminar person in charge', 'PIC seminar'))}</h4><p>${esc(c.seminarPic.name)} · <a href="tel:${esc(c.seminarPic.phone)}">${esc(c.seminarPic.phoneLabel)}</a></p></div></div>
          <div class="card contact-card rv">${icon('globe')}<div><h4>${esc(L('Websites', 'Situs web'))}</h4><p><a href="${esc(M.website)}">${esc(M.website.replace('https://', ''))}</a><br><a href="${CFG.ojs.baseUrl}" target="_blank" rel="noopener">${esc(CFG.ojs.baseUrl.replace('https://', ''))}</a></p></div></div>
        </div>
      </div>
      <div class="form-card rv" data-d="2">
        <h3>${esc(L('Send a message', 'Kirim pesan'))}</h3>
        <p class="sub">${esc(L('We usually reply within two working days.', 'Kami biasanya membalas dalam dua hari kerja.'))}</p>
        <form id="contact-form" novalidate>
          <div class="fgrid">
            <div class="f"><label for="c-name">${esc(L('Full name', 'Nama lengkap'))} <em>*</em></label><input id="c-name" name="name" type="text" autocomplete="name" required maxlength="120"><span class="err"></span></div>
            <div class="f"><label for="c-email">Email <em>*</em></label><input id="c-email" name="email" type="email" autocomplete="email" required maxlength="160"><span class="err"></span></div>
            <div class="f f--full"><label for="c-subject">${esc(L('Subject', 'Subjek'))} <em>*</em></label><select id="c-subject" name="subject" required><option value="">${esc(L('Choose a topic', 'Pilih topik'))}</option>${['Registration', 'Paper submission', 'Payment', 'Programme and speakers', 'Poster exhibition', 'Other'].map((s, i) => `<option value="${s}">${esc([L('Registration', 'Registrasi'), L('Paper submission', 'Pengiriman naskah'), L('Payment', 'Pembayaran'), L('Programme and speakers', 'Program dan pembicara'), L('Poster exhibition', 'Pameran poster'), L('Other', 'Lainnya')][i])}</option>`)}</select><span class="err"></span></div>
            <div class="f f--full"><label for="c-msg">${esc(L('Message', 'Pesan'))} <em>*</em></label><textarea id="c-msg" name="message" required maxlength="2000"></textarea><span class="err"></span></div>
            <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
          </div>
          <div id="c-status" role="status" style="margin-top:18px"></div>
          <div style="margin-top:20px"><button class="btn btn--primary" type="submit">${esc(L('Send message', 'Kirim pesan'))} ${icon('send')}</button></div>
        </form>
      </div>
    </div>
  </section>
  <section class="section section--tint"><div class="wrap"><div class="map rv"><iframe title="${esc(L('Map', 'Peta'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(M.mapQuery)}&output=embed"></iframe></div></div></section>${extraBlock()}`;
  return { title: L('Contact', 'Kontak'), desc: L('Contact the B-ICON 2026 secretariat.', 'Hubungi sekretariat B-ICON 2026.'), main, init() { bindContactForm(); } };
};
function bindContactForm() {
  const form = $('#contact-form'); if (!form) return;
  const t0 = Date.now();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = $('#c-status');
    const v = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    const chk = (name, cond, msg) => { const f = form.elements[name].closest('.f'); f.classList.toggle('has-err', !cond); $('.err', f).textContent = cond ? '' : msg; if (!cond) ok = false; };
    chk('name', v.name.trim().length >= 2, L('Please enter your name.', 'Mohon isi nama Anda.'));
    chk('email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim()), L('Please enter a valid email.', 'Mohon isi email yang valid.'));
    chk('subject', !!v.subject, L('Please choose a topic.', 'Mohon pilih topik.'));
    chk('message', v.message.trim().length >= 10, L('Please write at least 10 characters.', 'Mohon tulis minimal 10 karakter.'));
    if (!ok) return;
    const b = $('button[type=submit]', form); b.classList.add('is-loading');
    try {
      await gasPost('contact', { name: v.name.trim(), email: v.email.trim(), subject: v.subject, message: v.message.trim(), website: v.website, elapsed: Date.now() - t0 });
      st.innerHTML = '<div class="alert alert--ok">' + icon('checkc') + '<span>' + esc(L('Thank you. Your message has been sent to the secretariat.', 'Terima kasih. Pesan Anda telah dikirim ke sekretariat.')) + '</span></div>';
      form.reset();
    } catch (err) {
      const fallback = err.code === 'no_backend' ? ' <a href="mailto:' + esc(M.contact.email) + '">' + esc(M.contact.email) + '</a>' : '';
      st.innerHTML = '<div class="alert alert--err">' + icon('alert') + '<span>' + esc(err.message) + fallback + '</span></div>';
    } finally { b.classList.remove('is-loading'); }
  });
}

PAGES.gallery = function () {
  const prev = SITE.previousEditions;
  const main = html`
  ${pageHero({ title: L('Gallery and past editions', 'Galeri dan edisi sebelumnya'), lead: L('The venue, the call for papers poster and where B-ICON has been before.', 'Lokasi, poster call for papers, dan jejak B-ICON dari tahun ke tahun.'), parent: [L('About', 'Tentang'), pageUrl('about')] })}
  <section class="section">
    <div class="wrap">
      <div class="grid grid--2" style="align-items:stretch">
        <figure class="card rv" style="padding:0;overflow:hidden;margin:0"><img src="${IMG('gedung-poltekkes.jpg')}" alt="${esc(L('Poltekkes Kemenkes Bengkulu building', 'Gedung Poltekkes Kemenkes Bengkulu'))}" style="width:100%;aspect-ratio:4/5;object-fit:cover"><figcaption style="padding:18px 22px"><b>${esc(L('Poltekkes Kemenkes Bengkulu', 'Poltekkes Kemenkes Bengkulu'))}</b><div class="tl__n">${esc(L('The host campus, with its carved orange facade inspired by local ornament.', 'Kampus penyelenggara dengan fasad oranye berukir bermotif lokal.'))}</div></figcaption></figure>
        <figure class="card rv" data-d="2" style="padding:0;overflow:hidden;margin:0"><button class="poster-shot" type="button" data-zoom="${IMG('poster-cfp.jpg')}" style="max-width:none;border-radius:0;border:0;box-shadow:none"><img src="${IMG('poster-cfp.jpg')}" alt="${esc(L('B-ICON 2026 call for papers poster', 'Poster call for papers B-ICON 2026'))}" loading="lazy"></button><figcaption style="padding:18px 22px"><b>${esc(L('Call for papers poster', 'Poster call for papers'))}</b><div class="tl__n">${esc(L('Select the poster to enlarge it.', 'Pilih poster untuk memperbesar.'))}</div></figcaption></figure>
      </div>
    </div>
  </section>
  <section class="section section--tint">
    <div class="wrap">
      ${secHead(L('Previous editions', 'Edisi sebelumnya'), L('B-ICON returns every year with a new theme', 'B-ICON hadir setiap tahun dengan tema baru'))}
      <div class="grid grid--2">${prev.map((p) => `<a class="card card--lift feat rv" href="${esc(p.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="feat__ico">${icon('book')}</div><div><h4>${esc(t(p.edition))}</h4><p>${esc(t(p.theme))}</p><span class="spk__go">${esc(L('Visit the site', 'Kunjungi situs'))} ${icon('ext')}</span></div></a>`)}
        <a class="card card--lift feat rv" href="${CFG.ojs.baseUrl}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="feat__ico" style="background:linear-gradient(135deg,var(--o500),var(--o600))">${icon('layers')}</div><div><h4>${esc(L('Proceedings archive', 'Arsip prosiding'))}</h4><p>${esc(L('Read papers from earlier editions in the B-ICON proceedings (OJS).', 'Baca makalah edisi sebelumnya di prosiding B-ICON (OJS).'))}</p><span class="spk__go">${esc(L('Open OJS', 'Buka OJS'))} ${icon('ext')}</span></div></a></div>
      <div class="callout rv" style="margin-top:26px"><p>${esc(L('Photos and videos from B-ICON 2026 will be added here after the conference.', 'Foto dan video B-ICON 2026 akan ditambahkan di sini setelah konferensi.'))}</p></div>
    </div>
  </section>${extraBlock()}`;
  return { title: L('Gallery and past editions', 'Galeri dan edisi sebelumnya'), desc: L('Venue, poster and past editions of B-ICON.', 'Lokasi, poster, dan edisi sebelumnya B-ICON.'), main, init() { bindZoom(); } };
};

PAGES.news = function () {
  const native = nativePosts();
  const isArchive = native.length > 0 && ROOT.dataset.pt !== 'static_page';
  const main = html`
  ${pageHero({ title: L('News and announcements', 'Berita dan pengumuman'), lead: L('Updates from the organizing committee.', 'Kabar terbaru dari panitia penyelenggara.') })}
  <section class="section"><div class="wrap"><div id="news-list">${isArchive ? '<div class="grid grid--3">' + native.map(newsCard).join('') + '</div>' : '<div class="empty">' + esc(L('Loading…', 'Memuat…')) + '</div>'}</div></div></section>`;
  return { title: L('News', 'Berita'), desc: L('News and announcements from B-ICON 2026.', 'Berita dan pengumuman B-ICON 2026.'), main, init() { if (!isArchive) fillNews('#news-list', 12); } };
};

PAGES.post = function () {
  const p = nativePosts()[0] || { title: '', html: '', date: '' };
  const main = html`
  ${pageHero({ title: p.title || L('News', 'Berita'), lead: p.date, parent: [L('News', 'Berita'), pageUrl('news')] })}
  <section class="section"><div class="wrap"><article class="article"><div class="article__body">${p.html}</div>
  <div style="margin-top:36px;padding-top:24px;border-top:1px solid var(--line);display:flex;gap:12px;flex-wrap:wrap">${btn(L('All news', 'Semua berita'), pageUrl('news'), 'btn--outline', 'news')}${btn(L('Register', 'Registrasi'), pageUrl('registration'), 'btn--primary')}</div></article></div></section>`;
  return { title: p.title, desc: (p.text || '').slice(0, 155), main, init() {} };
};

PAGES.privacy = function () {
  const sec = [
    [L('What we collect', 'Data yang kami kumpulkan'), L('Registration data (name, email, phone or WhatsApp number, affiliation, country, profession), paper details (title, track, abstract, co-authors, publication option), files you upload (manuscript, payment proof, poster) and messages you send through the contact form.', 'Data registrasi (nama, email, nomor telepon atau WhatsApp, afiliasi, negara, profesi), rincian naskah (judul, bidang, abstrak, penulis pendamping, opsi publikasi), berkas yang Anda unggah (naskah, bukti pembayaran, poster), dan pesan yang Anda kirim melalui formulir kontak.')],
    [L('Why we collect it', 'Tujuan pengumpulan'), L('To administer your registration and payment, review and schedule presentations, issue certificates, communicate with you about the conference, and publish accepted work in the proceedings or in the virtual poster exhibition.', 'Untuk mengelola registrasi dan pembayaran Anda, mereview dan menjadwalkan presentasi, menerbitkan sertifikat, berkomunikasi tentang konferensi, serta menerbitkan karya yang diterima di prosiding atau pameran poster virtual.')],
    [L('Where it is stored', 'Tempat penyimpanan'), L('Registration data and uploaded files are stored in Google Sheets and Google Drive that are accessible only to the organizing committee. Only the poster details you choose to publish (title, authors, affiliation, abstract, poster image and optional video link) are shown publicly, through the exhibition database.', 'Data registrasi dan berkas unggahan disimpan di Google Sheets dan Google Drive yang hanya dapat diakses panitia. Hanya rincian poster yang Anda pilih untuk dipublikasikan (judul, penulis, afiliasi, abstrak, gambar poster, dan tautan video opsional) yang ditampilkan publik melalui basis data pameran.')],
    [L('Who sees it', 'Siapa yang dapat melihat'), L('Committee members who need it to run the conference. We do not sell personal data. Proceedings and journals publish accepted papers under their own policies.', 'Anggota panitia yang membutuhkannya untuk menyelenggarakan konferensi. Kami tidak menjual data pribadi. Prosiding dan jurnal menerbitkan naskah yang diterima sesuai kebijakan masing-masing.')],
    [L('Your rights', 'Hak Anda'), L('You may ask to see, correct or delete your registration data by writing to the secretariat. Deleting data may affect your ability to receive a certificate.', 'Anda dapat meminta untuk melihat, memperbaiki, atau menghapus data registrasi Anda dengan menghubungi sekretariat. Penghapusan data dapat memengaruhi penerbitan sertifikat Anda.')],
    [L('Retention', 'Masa penyimpanan'), L('Data is kept for the administration of B-ICON 2026 and for the records of the organiser, then archived or deleted according to the organiser\'s policy.', 'Data disimpan untuk penyelenggaraan B-ICON 2026 dan arsip penyelenggara, kemudian diarsipkan atau dihapus sesuai kebijakan penyelenggara.')]
  ];
  const main = html`
  ${pageHero({ title: L('Privacy and data use', 'Privasi dan penggunaan data'), lead: L('How B-ICON 2026 handles the personal data you share with us.', 'Bagaimana B-ICON 2026 mengelola data pribadi yang Anda berikan.') })}
  <section class="section"><div class="wrap" style="max-width:860px">${sec.map((s, i) => `<div class="card rv" style="margin-bottom:16px"><h3 class="h3" style="font-size:21px;margin-bottom:8px">${i + 1}. ${esc(s[0])}</h3><p style="margin:0;color:var(--ink2)">${esc(s[1])}</p></div>`)}
  <p class="tl__n rv">${esc(L('Contact: ', 'Kontak: '))}<a href="mailto:${esc(M.contact.email)}">${esc(M.contact.email)}</a></p></div></section>${extraBlock()}`;
  return { title: L('Privacy', 'Privasi'), desc: L('Privacy and data use at B-ICON 2026.', 'Privasi dan penggunaan data di B-ICON 2026.'), main, init() {} };
};

PAGES.notfound = function () {
  const main = html`<section class="section" style="min-height:70vh;display:grid;place-items:center"><div class="wrap" style="text-align:center"><img src="${IMG('bicon-icon.png')}" alt="" style="width:120px;margin:0 auto 20px"><h1 class="h2">${esc(L('This page could not be found', 'Halaman tidak ditemukan'))}</h1><p class="lead" style="margin:14px auto 26px">${esc(L('The link may be outdated. Try the menu or go back to the home page.', 'Tautan mungkin sudah usang. Gunakan menu atau kembali ke beranda.'))}</p>${btn(L('Back to home', 'Kembali ke beranda'), homeUrl(), 'btn--primary btn--lg')}</div></section>`;
  return { title: '404', desc: '', main, init() {} };
};

/* ---------- calendar buttons ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ics]'); if (!b) return;
  if (b.dataset.ics === 'seminar') downloadFile('bicon-2026-plenary-seminar.ics', icsSeminar());
  else downloadFile('bicon-2026-key-dates.ics', icsDates());
});


/* ===== 40-registration.js ===== */
/* ==========================================================================
   40-registration.js — registration form (multi-step) and "My registration"
   Data goes to the Google Apps Script backend, which writes to Google Sheets.
   ========================================================================== */

const COUNTRY_CODES = 'ID SG MY TH PH VN BN KH LA MM TL JP KR CN TW HK MO IN PK BD LK NP BT MV AF IR IQ SA AE QA KW BH OM YE JO LB SY IL PS TR EG LY TN DZ MA SD SS ET KE UG TZ RW BI CD CG GA CM NG GH CI SN ML BF NE TD ZA ZW ZM MW MZ AO NA BW LS SZ MG MU SC KM DJ SO ER GM GN GW SL LR TG BJ MR CV ST GQ CF GB IE FR DE NL BE LU CH AT IT ES PT GR CY MT DK SE NO FI IS PL CZ SK HU RO BG RS HR SI BA ME MK AL XK UA BY MD RU EE LV LT GE AM AZ KZ UZ TM KG TJ MN US CA MX GT BZ HN SV NI CR PA CU JM HT DO TT BS BB CO VE GY SR EC PE BR BO PY UY AR CL AU NZ PG FJ SB VU WS TO'.split(' ');
function countryList() {
  let dn = null, dnEn = null;
  try { dn = new Intl.DisplayNames([LANG], { type: 'region' }); dnEn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* older browsers */ }
  const items = COUNTRY_CODES.map((c) => ({ code: c, name: dn ? dn.of(c) : c, en: dnEn ? dnEn.of(c) : c }));
  const idn = items.filter((x) => x.code === 'ID');
  const rest = items.filter((x) => x.code !== 'ID').sort((a, b) => a.name.localeCompare(b.name, LOC));
  return idn.concat(rest);
}
const PROFESSIONS = () => [
  ['lecturer', L('Lecturer / academic', 'Dosen / akademisi')], ['researcher', L('Researcher', 'Peneliti')], ['student', L('Student (master / doctoral)', 'Mahasiswa (magister / doktor)')],
  ['undergrad', L('Student (diploma / bachelor)', 'Mahasiswa (diploma / sarjana)')], ['nurse', L('Nurse', 'Perawat')], ['midwife', L('Midwife', 'Bidan')],
  ['nutrition', L('Nutritionist / dietitian', 'Ahli gizi / dietisien')], ['pharmacist', L('Pharmacist', 'Apoteker / tenaga farmasi')], ['sanitarian', L('Environmental health / sanitarian', 'Kesehatan lingkungan / sanitarian')],
  ['lab', L('Medical laboratory technologist', 'Tenaga laboratorium medis')], ['physician', L('Physician / medical doctor', 'Dokter')], ['publichealth', L('Public health professional', 'Praktisi kesehatan masyarakat')],
  ['policy', L('Policy maker / government', 'Pembuat kebijakan / pemerintah')], ['other', L('Other', 'Lainnya')]
];
const HONORIFICS = ['', 'Prof.', 'Dr.', 'Mr.', 'Ms.', 'Mrs.', 'Ns.', 'apt.'];


/* ---------- payment account card ---------- */
function bankHtml() {
  const b = SITE.fees.payment; if (!b) return '';
  return '<div class="bank"><div class="bank__ico">' + icon('wallet') + '</div><div class="bank__b"><div class="bank__l">' + esc(t(b.label)) + '</div><div class="bank__n"><b>' + esc(b.bank) + '</b><span>' + esc(b.account) + '</span><button type="button" class="bank__copy" data-copy="' + esc(b.account) + '">' + icon('copy') + ' ' + esc(L('Copy number', 'Salin nomor')) + '</button></div><div class="bank__h">' + esc(L('Account name', 'Nama rekening')) + ': ' + esc(b.holder) + '</div><div class="bank__r">' + esc(t(b.reference)) + '</div></div></div>';
}

const REG = { step: 0, data: {}, files: {}, started: Date.now(), done: null, busy: false };
const CAT_ALL = () => SITE.fees.presenters.concat(SITE.fees.participants);
const isPresenter = (c) => c === 'presenter-id' || c === 'presenter-intl';
const stepNames = () => (isPresenter(REG.data.category) ? ['category', 'personal', 'paper', 'review'] : ['category', 'personal', 'review']);
const stepLabel = (n) => ({ category: L('Category', 'Kategori'), personal: L('Your details', 'Data diri'), paper: L('Paper details', 'Data naskah'), review: L('Review and submit', 'Tinjau dan kirim') }[n]);
const wordCount = (s) => (String(s || '').trim().match(/\S+/g) || []).length;

function saveDraft() { store.set('regdraft', JSON.stringify({ d: REG.data, s: REG.step })); }
function loadDraft() { try { const j = JSON.parse(store.get('regdraft', 'null')); if (j && j.d) { REG.data = j.d; REG.step = Math.min(j.s || 0, 0); return true; } } catch (e) { /* ignore */ } return false; }

/* ---------- field builders ---------- */
function fld(o) {
  const id = 'f-' + o.name;
  const v = REG.data[o.name] != null ? REG.data[o.name] : (o.value || '');
  let ctl;
  if (o.type === 'select') {
    ctl = '<select id="' + id + '" name="' + o.name + '"' + (o.req ? ' required' : '') + '>' + o.options.map((op) => '<option value="' + esc(op[0]) + '"' + (String(v) === String(op[0]) ? ' selected' : '') + '>' + esc(op[1]) + '</option>').join('') + '</select>';
  } else if (o.type === 'textarea') {
    ctl = '<textarea id="' + id + '" name="' + o.name + '"' + (o.req ? ' required' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(v) + '</textarea>';
  } else {
    ctl = '<input id="' + id + '" name="' + o.name + '" type="' + (o.type || 'text') + '"' + (o.req ? ' required' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ac ? ' autocomplete="' + o.ac + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + ' value="' + esc(v) + '">';
  }
  return '<div class="f' + (o.full ? ' f--full' : '') + '" data-f="' + o.name + '"><label for="' + id + '">' + esc(o.label) + (o.req ? ' <em>*</em>' : '') + (o.small ? ' <small>' + esc(o.small) + '</small>' : '') + '</label>' + ctl + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + (o.counter ? '<span class="count" data-count-for="' + o.name + '"></span>' : '') + '<span class="err" id="e-' + o.name + '"></span></div>';
}
function dropzone(name, label, accept, maxMB, hint, req) {
  const f = REG.files[name];
  return '<div class="f f--full" data-f="' + name + '" data-dz="' + name + '" data-accept="' + esc(accept) + '" data-max="' + maxMB + '"><span class="lbl">' + esc(label) + (req ? ' <em>*</em>' : '') + '</span>' +
    '<label class="dropzone" tabindex="0">' + icon('upload') + '<b>' + esc(L('Drop a file here or browse', 'Tarik berkas ke sini atau telusuri')) + '</b><small>' + esc(hint) + '</small><input type="file" accept="' + esc(accept) + '"></label>' +
    '<div class="fileinfo"' + (f ? '' : ' hidden') + '>' + icon('file') + '<span class="fn">' + (f ? esc(f.name) + ' · ' + humanSize(f.size) : '') + '</span><button type="button" data-dz-clear>' + esc(L('Remove', 'Hapus')) + '</button></div><span class="err"></span></div>';
}

/* ---------- steps ---------- */
function stepCategory() {
  const cats = CAT_ALL();
  const group = (title, arr) => '<div class="lbl" style="margin:18px 0 10px;font-weight:800;color:var(--muted);font-size:12.5px;letter-spacing:.12em;text-transform:uppercase">' + esc(title) + '</div><div class="opts">' + arr.map((c) => '<label class="opt"><input type="radio" name="category" value="' + c.id + '"' + (REG.data.category === c.id ? ' checked' : '') + '><span class="mark"></span><span class="opt__b"><span class="opt__t">' + esc(t(c.title)) + '</span><span class="opt__s">' + esc(t(c.sub)) + '</span></span><span class="opt__p">' + esc(c.amount) + '</span></label>').join('') + '</div>';
  return '<h3>' + esc(L('How will you take part?', 'Bagaimana Anda akan berpartisipasi?')) + '</h3><p class="sub">' + esc(L('Choose the category that matches your role. The fee is shown for each option.', 'Pilih kategori yang sesuai dengan peran Anda. Biaya ditampilkan pada setiap pilihan.')) + '</p>' +
    '<div class="f" data-f="category">' + group(L('I want to present a paper', 'Saya ingin mempresentasikan makalah'), SITE.fees.presenters) + group(L('I want to attend', 'Saya ingin menghadiri'), SITE.fees.participants) + '<span class="err" id="e-category"></span></div>' +
    '<div class="callout callout--o" style="margin-top:22px">' + icon('gift', 'ico') + ' <b>' + esc(t(SITE.fees.special.title)) + '.</b> ' + esc(t(SITE.fees.special.text)) + '</div>';
}
function stepPersonal() {
  const pres = isPresenter(REG.data.category);
  const wni = (REG.data.country || 'ID') === 'ID';
  return '<h3>' + esc(L('Your details', 'Data diri Anda')) + '</h3><p class="sub">' + esc(L('We use these details for your certificate and to contact you.', 'Data ini kami gunakan untuk sertifikat dan untuk menghubungi Anda.')) + '</p>' +
    '<div class="fgrid">' +
    fld({ name: 'fullNamePlain', label: L('Presenter name (without title)', 'Nama presenter (tanpa gelar)'), req: true, ac: 'name', max: 140 }) +
    fld({ name: 'fullNameCert', label: L('Presenter name (full, with degrees, for the certificate)', 'Nama presenter (lengkap dengan gelar, untuk sertifikat)'), small: L('printed exactly as given on your certificate', 'dicetak persis seperti yang Anda isikan pada sertifikat'), req: true, ac: 'name', max: 160 }) +
    fld({ name: 'email', label: 'Email', type: 'email', req: true, ac: 'email', max: 160, hint: L('Use the email registered on the Kemenkes RI Pelataran Sehat platform. Confirmation and payment instructions are sent here.', 'Gunakan email yang terdaftar pada platform Pelataran Sehat Kemenkes RI. Konfirmasi dan instruksi pembayaran dikirim ke sini.') }) +
    fld({ name: 'phone', label: L('WhatsApp / phone', 'WhatsApp / telepon'), type: 'tel', req: true, ac: 'tel', inputmode: 'tel', ph: '+62 8xx xxxx xxxx', max: 24 }) +
    fld({ name: 'country', label: L('Country', 'Negara'), type: 'select', req: true, options: [['', L('Choose a country', 'Pilih negara')]].concat(countryList().map((c) => [c.code, c.name])) }) +
    fld({ name: 'govId', label: wni ? L('National ID number (NIK)', 'Nomor Induk Kependudukan (NIK)') : L('Passport number', 'Nomor paspor'), small: wni ? L('16 digits, for Indonesian citizens', '16 digit, untuk Warga Negara Indonesia') : L('for non-Indonesian citizens', 'untuk Warga Negara Asing'), req: true, inputmode: wni ? 'numeric' : 'text', max: 24 }) +
    fld({ name: 'affiliation', label: L('Institution / affiliation', 'Institusi / afiliasi'), req: true, full: true, max: 200, ac: 'organization' }) +
    (pres ? '<div class="f f--full"><label class="check"><input type="checkbox" name="pkbAffiliated"' + (REG.data.pkbAffiliated ? ' checked' : '') + '><span>' + esc(L('I am affiliated with Poltekkes Kemenkes Bengkulu', 'Saya berafiliasi dengan Poltekkes Kemenkes Bengkulu')) + ' <small style="color:var(--muted)">' + esc(L('(this limits the publication options in the next step)', '(ini membatasi pilihan publikasi pada langkah berikutnya)')) + '</small></span></label></div>' : '') +
    (REG.data.category === 'presenter-intl' ? '<div class="f f--full"><label class="check"><input type="checkbox" name="claimFree"' + (REG.data.claimFree ? ' checked' : '') + '><span>' + esc(L('I am claiming one of the first 10 free registration slots for international presenters', 'Saya mengklaim salah satu dari 10 slot registrasi gratis untuk presenter internasional')) + ' <small style="color:var(--muted)">' + esc(L('(subject to the committee confirming slot availability)', '(tergantung konfirmasi ketersediaan slot dari panitia)')) + '</small></span></label></div>' : '') +
    '<div class="f f--full" id="country-note"></div></div>';
}
function stepPaper() {
  const aff = !!REG.data.pkbAffiliated;
  const pubs = SITE.publications.map((p) => {
    const off = p.restricted && aff;
    const tpl = p.templateUrl ? '<a href="' + esc(p.templateUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + icon('download') + ' ' + esc(L('Download template', 'Unduh template')) + '</a>' : '<span class="opt__contact">' + esc(L('Contact the committee for the template', 'Hubungi panitia untuk templatenya')) + '</span>';
    return '<label class="opt opt--pub' + (off ? ' is-off' : '') + '"><input type="radio" name="publication" value="' + p.n + '"' + (String(REG.data.publication) === String(p.n) ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="mark"></span><span class="opt__b"><span class="opt__t">' + esc(p.name) + '</span><span class="opt__s">' + esc(p.index) + (off ? ' · ' + esc(L('not available for Poltekkes Kemenkes Bengkulu authors', 'tidak tersedia bagi penulis Poltekkes Kemenkes Bengkulu')) : '') + '</span>' + (off ? '' : '<span class="opt__tpl">' + tpl + '</span>') + '</span></label>';
  }).join('');
  const modes = [['oral', L('Oral presentation', 'Presentasi oral'), L('Presented online in a scheduled session', 'Dipresentasikan daring pada sesi terjadwal')], ['poster', L('Poster presentation', 'Presentasi poster'), L('Presented online in a scheduled session and shown in the virtual poster exhibition', 'Dipresentasikan daring pada sesi terjadwal dan ditampilkan di pameran poster virtual')]];
  return '<h3>' + esc(L('Paper details', 'Data naskah')) + '</h3><p class="sub">' + esc(L('Registration and article submission happen in this one form. Download the template for your chosen publication before you write your manuscript.', 'Registrasi dan pengiriman artikel dilakukan dalam satu formulir ini. Unduh template sesuai luaran publikasi yang Anda pilih sebelum menulis naskah.')) + '</p>' +
    '<div class="fgrid">' +
    fld({ name: 'paperTitle', label: L('Paper title', 'Judul naskah'), req: true, full: true, max: 250 }) +
    '<div class="f f--full" data-f="presentationMode"><span class="lbl">' + esc(L('Presentation mode', 'Bentuk presentasi')) + ' <em>*</em></span><div class="opts" style="grid-template-columns:repeat(2,1fr)">' + modes.map((m) => '<label class="opt"><input type="radio" name="presentationMode" value="' + m[0] + '"' + (REG.data.presentationMode === m[0] ? ' checked' : '') + '><span class="mark"></span><span class="opt__b"><span class="opt__t">' + esc(m[1]) + '</span><span class="opt__s">' + esc(m[2]) + '</span></span></label>').join('') + '</div><span class="err"></span></div>' +
    '<div class="f f--full" data-f="publication"><span class="lbl">' + esc(L('Preferred publication output', 'Luaran publikasi pilihan')) + ' <em>*</em></span><div class="opts opts--pub">' + pubs + '</div><span class="hint">' + esc(t(SITE.publicationNotes[2])) + '</span><span class="err"></span></div>' +
    dropzone('manuscript', L('Full paper', 'Naskah lengkap (Full Paper)'), '.pdf,.doc,.docx', CFG.limits.manuscriptMB, 'PDF, DOC, DOCX · max ' + CFG.limits.manuscriptMB + ' MB', true) +
    '</div><div class="alert alert--info" style="margin-top:20px">' + icon('info') + '<span>' + esc(L('After you submit this registration, also submit the same paper yourself to OJS B-ICON Proceeding — that is where the science committee does its review, whichever publication option you chose. Instructions and the OJS link are on the Author Guidelines page and on your My Registration page.', 'Setelah registrasi ini terkirim, unggah juga naskah yang sama ke OJS B-ICON Proceeding secara mandiri — di sanalah komite ilmiah melakukan reviewnya, apa pun pilihan publikasi Anda. Petunjuk dan tautan OJS ada di halaman Panduan Penulis dan di halaman Registrasi Saya Anda.')) + '</span></div>';
}
function reviewRows() {
  const d = REG.data, cat = CAT_ALL().find((c) => c.id === d.category);
  const ctry = (countryList().find((c) => c.code === d.country) || {}).name || d.country;
  const wni = (d.country || 'ID') === 'ID';
  const rows = [[L('Category', 'Kategori'), cat ? t(cat.title) + ' · ' + cat.amount : ''], [L('Name (without title)', 'Nama (tanpa gelar)'), d.fullNamePlain], [L('Name for certificate', 'Nama untuk sertifikat'), d.fullNameCert], ['Email', d.email], [L('WhatsApp / phone', 'WhatsApp / telepon'), d.phone], [L('Country', 'Negara'), ctry], [wni ? 'NIK' : L('Passport number', 'Nomor paspor'), d.govId], [L('Institution', 'Institusi'), d.affiliation]];
  if (d.category === 'presenter-intl' && d.claimFree) rows.push([L('Free slot', 'Slot gratis'), L('Claimed (subject to confirmation)', 'Diklaim (menunggu konfirmasi)')]);
  if (isPresenter(d.category)) {
    const pub = SITE.publications.find((p) => String(p.n) === String(d.publication));
    rows.push([L('Paper title', 'Judul naskah'), d.paperTitle], [L('Presentation', 'Presentasi'), d.presentationMode === 'oral' ? L('Oral', 'Oral') : L('Poster', 'Poster')], [L('Publication', 'Publikasi'), pub ? pub.name + ' (' + pub.index + ')' : '']);
    if (REG.files.manuscript) rows.push([L('Manuscript', 'Naskah'), REG.files.manuscript.name]);
  }
  return rows.filter((r) => r[1]);
}
function stepReview() {
  const d = REG.data, pres = isPresenter(d.category);
  return '<h3>' + esc(L('Review and submit', 'Tinjau dan kirim')) + '</h3><p class="sub">' + esc(L('Check your details, then confirm.', 'Periksa data Anda, lalu konfirmasi.')) + '</p>' +
    '<dl class="summary">' + reviewRows().map((r) => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>' +
    '<div style="display:grid;gap:14px;margin-top:24px">' +
    '<div class="f" data-f="c1"><label class="check"><input type="checkbox" name="c1"' + (d.c1 ? ' checked' : '') + '><span>' + esc(L('I confirm that the information above is accurate.', 'Saya menyatakan bahwa informasi di atas benar.')) + '</span></label><span class="err"></span></div>' +
    '<div class="f" data-f="c2"><label class="check"><input type="checkbox" name="c2"' + (d.c2 ? ' checked' : '') + '><span>' + L('I have read the <a href="' + pageUrl('privacy') + '" target="_blank" rel="noopener">privacy notice</a> and agree that the committee may contact me about B-ICON 2026.', 'Saya telah membaca <a href="' + pageUrl('privacy') + '" target="_blank" rel="noopener">pemberitahuan privasi</a> dan setuju panitia menghubungi saya terkait B-ICON 2026.') + '</span></label><span class="err"></span></div>' +
    (pres ? '<div class="f" data-f="c3"><label class="check"><input type="checkbox" name="c3"' + (d.c3 ? ' checked' : '') + '><span>' + esc(L('If my paper is accepted, the committee may publish its title, authors and abstract in the programme and the virtual poster exhibition.', 'Jika naskah saya diterima, panitia dapat mempublikasikan judul, penulis, dan abstrak di program dan pameran poster virtual.')) + '</span></label><span class="err"></span></div>' : '') +
    '</div><div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><div id="reg-alert" role="alert" style="margin-top:18px"></div>';
}

/* ---------- validation ---------- */
function setErr(name, msg) {
  const box = $('[data-f="' + name + '"]', ROOT); if (!box) return;
  box.classList.toggle('has-err', !!msg);
  const e = $('.err', box); if (e) e.textContent = msg || '';
}
function validateStep(name) {
  const d = REG.data; let first = null;
  const bad = (n, m) => { setErr(n, m); if (!first) first = n; };
  const ok = (n) => setErr(n, '');
  if (name === 'category') { d.category ? ok('category') : bad('category', L('Please choose a category.', 'Mohon pilih kategori.')); }
  if (name === 'personal') {
    (d.fullNamePlain || '').trim().length >= 3 ? ok('fullNamePlain') : bad('fullNamePlain', L('Please enter your name.', 'Mohon isi nama Anda.'));
    (d.fullNameCert || '').trim().length >= 3 ? ok('fullNameCert') : bad('fullNameCert', L('Please enter your name for the certificate.', 'Mohon isi nama untuk sertifikat.'));
    /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test((d.email || '').trim()) ? ok('email') : bad('email', L('Please enter a valid email address.', 'Mohon isi alamat email yang valid.'));
    (d.phone || '').replace(/\D/g, '').length >= 8 ? ok('phone') : bad('phone', L('Please enter a valid phone number.', 'Mohon isi nomor telepon yang valid.'));
    d.country ? ok('country') : bad('country', L('Please choose your country.', 'Mohon pilih negara.'));
    {
      const wni = (d.country || 'ID') === 'ID';
      const gid = (d.govId || '').trim().replace(/\s+/g, '');
      const gidOk = wni ? /^\d{16}$/.test(gid) : gid.length >= 5;
      gidOk ? ok('govId') : bad('govId', wni ? L('NIK must be 16 digits.', 'NIK harus 16 digit.') : L('Please enter your passport number.', 'Mohon isi nomor paspor Anda.'));
    }
    (d.affiliation || '').trim().length >= 2 ? ok('affiliation') : bad('affiliation', L('Please enter your institution.', 'Mohon isi institusi Anda.'));
  }
  if (name === 'paper') {
    (d.paperTitle || '').trim().length >= 8 ? ok('paperTitle') : bad('paperTitle', L('Please enter the paper title.', 'Mohon isi judul naskah.'));
    d.presentationMode ? ok('presentationMode') : bad('presentationMode', L('Please choose a presentation mode.', 'Mohon pilih bentuk presentasi.'));
    d.publication ? ok('publication') : bad('publication', L('Please choose a publication output.', 'Mohon pilih luaran publikasi.'));
    REG.files.manuscript ? ok('manuscript') : bad('manuscript', L('Please upload your manuscript.', 'Mohon unggah naskah Anda.'));
  }
  if (name === 'review') {
    d.c1 ? ok('c1') : bad('c1', L('Please confirm.', 'Mohon konfirmasi.'));
    d.c2 ? ok('c2') : bad('c2', L('Please agree to continue.', 'Mohon setujui untuk melanjutkan.'));
    if (isPresenter(d.category)) d.c3 ? ok('c3') : bad('c3', L('Please agree to continue.', 'Mohon setujui untuk melanjutkan.'));
  }
  if (first) { const el = $('[data-f="' + first + '"]', ROOT); el && el.scrollIntoView({ block: 'center', behavior: 'smooth' }); const inp = el && $('input:not([type=radio]):not([type=checkbox]), select, textarea', el); inp && inp.focus({ preventScroll: true }); }
  return !first;
}
function updateGovIdLabel() {
  const box = $('[data-f="govId"]'); if (!box) return;
  const wni = (REG.data.country || 'ID') === 'ID';
  const lab = $('label', box); if (lab) lab.innerHTML = esc(wni ? L('National ID number (NIK)', 'Nomor Induk Kependudukan (NIK)') : L('Passport number', 'Nomor paspor')) + ' <em>*</em> <small>' + esc(wni ? L('16 digits, for Indonesian citizens', '16 digit, untuk Warga Negara Indonesia') : L('for non-Indonesian citizens', 'untuk Warga Negara Asing')) + '</small>';
  const inp = $('#f-govId', box); if (inp) inp.setAttribute('inputmode', wni ? 'numeric' : 'text');
}
function countryNote() {
  const box = $('#country-note'); if (!box) return;
  const d = REG.data; let msg = '';
  if (d.category === 'presenter-id' && d.country && d.country !== 'ID') msg = L('The Indonesian presenter fee (IDR 350,000) is for presenters based in Indonesia. The committee will confirm the right category with you.', 'Biaya presenter Indonesia (IDR 350.000) untuk presenter yang berdomisili di Indonesia. Panitia akan mengonfirmasi kategori yang tepat kepada Anda.');
  if (d.category === 'presenter-intl' && d.country === 'ID') msg = L('The international presenter category (USD 50) is for non-Indonesian presenters. The committee will confirm the right category with you.', 'Kategori presenter internasional (USD 50) untuk presenter non-Indonesia. Panitia akan mengonfirmasi kategori yang tepat kepada Anda.');
  box.innerHTML = msg ? '<div class="alert alert--info" style="margin:0">' + icon('info') + '<span>' + esc(msg) + '</span></div>' : '';
}

/* ---------- render ---------- */
function renderStepper() {
  const names = stepNames();
  $('#reg-stepper').innerHTML = names.map((n, i) => '<li class="' + (i === REG.step ? 'is-on' : i < REG.step ? 'is-done' : '') + '" data-goto="' + i + '"><b>' + (i < REG.step ? icon('check') : i + 1) + '</b><span>' + esc(stepLabel(n)) + '</span></li>').join('');
}
function renderReg() {
  const names = stepNames(); if (REG.step >= names.length) REG.step = names.length - 1;
  const name = names[REG.step];
  const body = { category: stepCategory, personal: stepPersonal, paper: stepPaper, review: stepReview }[name]();
  const last = REG.step === names.length - 1;
  $('#reg-card').innerHTML = '<form id="reg-form" novalidate>' + body +
    '<div class="form-nav"><button type="button" class="btn btn--outline" data-back' + (REG.step === 0 ? ' style="visibility:hidden"' : '') + '>' + icon('arrow').replace('<svg ', '<svg style="transform:rotate(180deg)" ') + ' ' + esc(L('Back', 'Kembali')) + '</button>' +
    (last ? '<button type="submit" class="btn btn--primary btn--lg" data-submit>' + esc(L('Submit registration', 'Kirim registrasi')) + ' ' + icon('send') + '</button>' : '<button type="button" class="btn btn--primary" data-next>' + esc(L('Continue', 'Lanjut')) + ' ' + icon('arrow') + '</button>') + '</div></form>';
  renderStepper();
  countryNote(); updateCounters(); paintFileInfo();
  if (REG.step > 0 || REG.mounted) { const top = $('#register'); top && window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); }
  REG.mounted = true;
}
function updateCounters() {
  const c = $('[data-count-for="abstract"]'); if (!c) return;
  const w = wordCount(REG.data.abstract), max = CFG.limits.abstractWords;
  c.textContent = w + ' / ' + max + ' ' + L('words', 'kata'); c.classList.toggle('over', w > max);
}
function paintFileInfo() {
  $$('[data-dz]', ROOT).forEach((z) => {
    const f = REG.files[z.dataset.dz]; const info = $('.fileinfo', z);
    info.hidden = !f; $('.fn', info).textContent = f ? f.name + ' · ' + humanSize(f.size) : '';
  });
}
function goStep(n) { REG.step = n; saveDraft(); renderReg(); }

function bindRegistrationForm() {
  const host = $('#reg-shell'); if (!host) return;
  host.addEventListener('input', (e) => {
    const el = e.target; if (!el.name) return;
    if (el.type === 'checkbox') REG.data[el.name] = el.checked; else if (el.type !== 'radio') REG.data[el.name] = el.value;
    if (el.name === 'abstract') updateCounters();
    if (el.name === 'country') { countryNote(); updateGovIdLabel(); }
    saveDraft();
  });
  host.addEventListener('change', (e) => {
    const el = e.target; if (!el.name) return;
    if (el.type === 'radio') {
      REG.data[el.name] = el.value;
      if (el.name === 'category') { setErr('category', ''); renderStepper(); countryNote(); }
      setErr(el.name, '');
    }
    if (el.name === 'pkbAffiliated') { REG.data.pkbAffiliated = el.checked; if (el.checked && ['3', '4'].includes(String(REG.data.publication))) REG.data.publication = ''; }
    saveDraft();
  });
  host.addEventListener('click', (e) => {
    const nx = e.target.closest('[data-next]'), bk = e.target.closest('[data-back]'), gt = e.target.closest('[data-goto]');
    if (nx) { const name = stepNames()[REG.step]; if (validateStep(name)) goStep(REG.step + 1); }
    else if (bk) goStep(Math.max(0, REG.step - 1));
    else if (gt && gt.classList.contains('is-done')) goStep(Number(gt.dataset.goto));
    const cl = e.target.closest('[data-clear-draft]'); if (cl) { store.del('regdraft'); REG.data = {}; REG.files = {}; REG.step = 0; renderReg(); toast(L('Draft cleared', 'Draft dihapus')); }
  });
  bindDropzones(host, () => REG.files, () => paintFileInfo());
  host.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (REG.busy) return;
    const names = stepNames();
    if (names[REG.step] !== 'review') return;
    // re-validate every earlier step so nothing slips through a restored draft
    if (!validateStep('review')) return;
    for (const n of names.slice(0, -1)) {
      if (!validateStep(n)) { REG.step = names.indexOf(n); renderReg(); validateStep(n); return; }
    }
    await submitRegistration(new FormData($('#reg-form')).get('website') || '');
  });
}

async function submitRegistration(honey) {
  const d = REG.data, btn = $('[data-submit]'), al = $('#reg-alert');
  REG.busy = true; btn.classList.add('is-loading'); btn.innerHTML = '<span class="spin"></span> ' + esc(L('Submitting…', 'Mengirim…'));
  al.innerHTML = '';
  try {
    const payload = {
      category: d.category, fullNamePlain: d.fullNamePlain.trim(), fullNameCert: d.fullNameCert.trim(), email: d.email.trim().toLowerCase(), phone: d.phone.trim(),
      country: d.country, countryName: (countryList().find((c) => c.code === d.country) || {}).en || d.country, govId: (d.govId || '').trim(), affiliation: d.affiliation.trim(),
      pkbAffiliated: !!d.pkbAffiliated, claimFree: d.category === 'presenter-intl' && !!d.claimFree, consent: true, website: honey, elapsed: Date.now() - REG.started
    };
    if (isPresenter(d.category)) {
      Object.assign(payload, { paperTitle: d.paperTitle.trim(), presentationMode: d.presentationMode, publication: Number(d.publication) });
      const f = REG.files.manuscript;
      if (f) payload.file = { name: f.name, type: f.type || 'application/octet-stream', data: await fileToB64(f) };
    }
    const res = await gasPost('register', payload, { timeout: 120000 });
    REG.done = { id: res.id, email: payload.email, presenter: isPresenter(d.category), name: payload.fullNameCert, emailSent: res.emailSent !== false };
    store.del('regdraft'); store.set('lastreg', res.id);
    showSuccess();
  } catch (err) {
    let msg = err.message;
    if (err.code === 'no_backend') msg += ' ' + L('Please email the secretariat instead: ', 'Silakan kirim email ke sekretariat: ') + M.contact.email;
    al.innerHTML = '<div class="alert alert--err">' + icon('alert') + '<span>' + esc(msg) + '</span></div>';
    btn.classList.remove('is-loading'); btn.innerHTML = esc(L('Submit registration', 'Kirim registrasi')) + ' ' + icon('send');
    al.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } finally { REG.busy = false; }
}
function showSuccess() {
  const r = REG.done;
  $('#reg-stepper').innerHTML = '';
  $('.form-shell').style.gridTemplateColumns = '1fr';
  $('#reg-card').innerHTML = '<div class="success"><div class="success__ico">' + icon('check') + '</div><h3>' + esc(L('Registration received', 'Registrasi diterima')) + '</h3><p class="sub" style="margin-bottom:0">' + esc(L('Thank you, ', 'Terima kasih, ')) + esc(r.name) + '. ' + esc(L('Your registration ID is', 'ID registrasi Anda adalah')) + '</p>' +
    '<div class="regid"><span>' + esc(r.id) + '</span><button type="button" data-copy="' + esc(r.id) + '">' + esc(L('Copy', 'Salin')) + '</button></div>' +
    '<p style="color:var(--ink2);max-width:60ch;margin:8px auto 0">' + esc(r.emailSent ? L('A confirmation email is on its way to ', 'Email konfirmasi sedang dikirim ke ') : L('We could not send the confirmation email automatically. Please keep this ID and contact the secretariat. Address: ', 'Email konfirmasi tidak dapat dikirim otomatis. Simpan ID ini dan hubungi sekretariat. Alamat: ')) + '<b>' + esc(r.email) + '</b>. ' + esc(L('Keep your ID and email, you need both to check your status and upload documents.', 'Simpan ID dan email Anda, keduanya dibutuhkan untuk mengecek status dan mengunggah dokumen.')) + '</p>' +
    '<div class="next-grid">' +
    (r.presenter ? '<div class="card"><h4>' + esc(L('1. Submit in OJS', '1. Submit di OJS')) + '</h4><p>' + esc(L('Your registration is received. Now submit the same paper yourself to OJS B-ICON Proceeding, where the science committee does its review.', 'Registrasi Anda diterima. Sekarang submit sendiri naskah yang sama ke OJS B-ICON Proceeding, tempat komite ilmiah melakukan reviewnya.')) + '</p>' + ojsBtn(L('Open OJS', 'Buka OJS'), 'btn--outline btn--sm') + '</div>' : '<div class="card"><h4>' + esc(L('1. Check your email', '1. Periksa email Anda')) + '</h4><p>' + esc(L('Payment instructions are in the confirmation email.', 'Instruksi pembayaran ada di email konfirmasi.')) + '</p></div>') +
    '<div class="card"><h4>' + esc(r.presenter ? L('2. Wait for acceptance', '2. Tunggu pemberitahuan') : L('2. Pay the fee', '2. Bayar biaya')) + '</h4><p>' + esc(r.presenter ? L('Acceptance is announced on 17 October 2026. You then pay by 19 October.', 'Penerimaan diumumkan 17 Oktober 2026. Setelah itu bayar paling lambat 19 Oktober.') : L('Then upload your proof of payment on My Registration.', 'Lalu unggah bukti pembayaran di Registrasi Saya.')) + '</p></div>' +
    '<div class="card"><h4>' + esc(L('3. Track your registration', '3. Pantau registrasi Anda')) + '</h4><p>' + esc(L('Check status, upload payment proof and, for posters, your poster.', 'Cek status, unggah bukti bayar dan, untuk poster, unggah poster Anda.')) + '</p>' + btn(L('My registration', 'Registrasi saya'), pageUrl('my-registration') + '?id=' + encodeURIComponent(r.id), 'btn--violet btn--sm', 'arrow') + '</div></div></div>';
  window.scrollTo({ top: $('#register').getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
}

/* ---------- dropzone ---------- */
function bindDropzones(scope, getBucket, onChange) {
  const pick = (zone, file) => {
    const bucket = getBucket();
    const accept = zone.dataset.accept.split(',').map((x) => x.trim().toLowerCase()), max = Number(zone.dataset.max) * 1048576;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const err = $('.err', zone); const box = zone;
    let m = '';
    if (accept.length && !accept.includes(ext) && !accept.some((a) => a.includes('/') && file.type === a)) m = L('This file type is not accepted. Allowed: ', 'Jenis berkas tidak diterima. Diizinkan: ') + accept.join(', ');
    else if (file.size > max) m = L('The file is too large. Maximum size is ', 'Berkas terlalu besar. Ukuran maksimum ') + zone.dataset.max + ' MB.';
    box.classList.toggle('has-err', !!m); err.textContent = m;
    if (m) return;
    bucket[zone.dataset.dz] = file; onChange && onChange();
  };
  scope.addEventListener('change', (e) => { const z = e.target.closest('[data-dz]'); if (z && e.target.type === 'file' && e.target.files[0]) pick(z, e.target.files[0]); });
  scope.addEventListener('click', (e) => {
    const c = e.target.closest('[data-dz-clear]'); if (!c) return;
    const z = c.closest('[data-dz]'); delete getBucket()[z.dataset.dz]; $('input[type=file]', z).value = ''; onChange && onChange();
  });
  ['dragover', 'dragleave', 'drop'].forEach((ev) => scope.addEventListener(ev, (e) => {
    const dz = e.target.closest && e.target.closest('.dropzone'); if (!dz) return;
    e.preventDefault(); dz.classList.toggle('is-over', ev === 'dragover');
    if (ev === 'drop' && e.dataTransfer.files[0]) pick(dz.closest('[data-dz]'), e.dataTransfer.files[0]);
  }));
  scope.addEventListener('keydown', (e) => { const dz = e.target.closest && e.target.closest('.dropzone'); if (dz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('input[type=file]', dz).click(); } });
}

/* ==========================================================================
   REGISTRATION PAGE
   ========================================================================== */
PAGES.registration = function () {
  const fees = SITE.fees;
  const main = html`
  ${pageHero({ title: L('Register for B-ICON 2026', 'Registrasi B-ICON 2026'), lead: L('Present a paper or join as a participant. The whole process takes about five minutes.', 'Presentasikan makalah atau bergabung sebagai peserta. Prosesnya sekitar lima menit.'), parent: [L('Registration', 'Registrasi'), pageUrl('registration')], actions: `<a class="btn btn--primary" href="#register">${esc(L('Start registration', 'Mulai registrasi'))} ${icon('arrow')}</a>${btn(L('My registration', 'Registrasi saya'), pageUrl('my-registration'), 'btn--ghost', 'user')}` })}
  <section class="section section--tight">
    <div class="wrap">
      <div class="steps" style="margin-top:18px">
        <div class="step rv"><h4>${esc(L('Choose a category', 'Pilih kategori'))}</h4><p>${esc(L('Presenter (oral or poster) or participant (online or onsite).', 'Presenter (oral atau poster) atau peserta (daring atau luring).'))}</p></div>
        <div class="step rv" data-d="1"><h4>${esc(L('Fill in your details', 'Isi data Anda'))}</h4><p>${esc(L('Personal details and, for presenters, your paper information.', 'Data diri dan, untuk presenter, informasi naskah.'))}</p></div>
        <div class="step rv" data-d="2"><h4>${esc(L('Get your ID', 'Dapatkan ID'))}</h4><p>${esc(L('A registration ID arrives on screen and by email.', 'ID registrasi tampil di layar dan dikirim lewat email.'))}</p></div>
        <div class="step rv" data-d="3"><h4>${esc(L('Review, pay, present', 'Review, bayar, presentasi'))}</h4><p>${esc(L('Your manuscript is reviewed, pay after acceptance and join online.', 'Naskah Anda direview, bayar setelah diterima, dan bergabung secara daring.'))}</p></div>
      </div>
    </div>
  </section>
  <section class="section section--tint" id="fees">
    <div class="wrap">
      ${secHead(L('Fees', 'Biaya'), L('Registration fees by category', 'Biaya registrasi per kategori'))}
      <div class="grid grid--4">${fees.presenters.concat(fees.participants).map((f, i) => feeCard(f, i, { tag: i < 2 ? L('Presenter', 'Presenter') : L('Participant', 'Peserta') }))}</div>
      <div class="offer rv" style="margin-top:24px">${icon('gift')}<div><h4>${esc(t(fees.special.title))}</h4><p>${esc(t(fees.special.text))}</p></div></div>
      <div class="rv">${notesList(fees.notes)}</div>
      <div class="callout rv" style="margin-top:22px"><p><b>${esc(L('How to pay', 'Cara pembayaran'))}.</b> ${esc(L('Bank transfer to the account below. Payment details are also sent by email with your confirmation. Presenters pay after the acceptance notification and no later than 19 October 2026. Upload your proof of payment on the My Registration page.', 'Pembayaran melalui transfer bank ke rekening di bawah. Detailnya juga dikirim lewat email bersama konfirmasi. Presenter membayar setelah pemberitahuan penerimaan dan paling lambat 19 Oktober 2026. Unggah bukti pembayaran di halaman Registrasi Saya.'))}</p></div>
      <div class="rv" style="margin-top:16px">${bankHtml()}</div>
    </div>
  </section>
  <section class="section" id="register">
    <div class="wrap">
      ${secHead(L('Registration form', 'Formulir registrasi'), L('Register now', 'Daftar sekarang'))}
      <div id="reg-shell">
        <div class="form-shell">
          <ol class="stepper" id="reg-stepper" aria-label="${esc(L('Progress', 'Kemajuan'))}"></ol>
          <div class="form-card" id="reg-card"></div>
        </div>
        <p class="tl__n" style="margin-top:14px" id="draft-note"></p>
      </div>
      ${CFG.gasUrl ? '' : '<div class="alert alert--info" style="margin-top:20px">' + icon('info') + '<span>' + esc(L('Preview mode: the registration service is not connected yet, so submitting will show a notice instead of saving.', 'Mode pratinjau: layanan registrasi belum terhubung, sehingga pengiriman hanya menampilkan pemberitahuan.')) + '</span></div>'}
    </div>
  </section>${extraBlock()}`;
  return {
    title: L('Registration', 'Registrasi'), desc: L('Register as a presenter or participant for B-ICON 2026.', 'Daftar sebagai presenter atau peserta B-ICON 2026.'), main,
    init() {
      const restored = loadDraft();
      renderReg(); bindRegistrationForm(); REG.mounted = false;
      const n = $('#draft-note');
      if (restored && n) { n.innerHTML = esc(L('Your unfinished draft was restored. ', 'Draft Anda yang belum selesai telah dipulihkan. ')) + '<a href="#" data-clear-draft>' + esc(L('Clear draft', 'Hapus draft')) + '</a>'; }
      if (location.hash === '#register') setTimeout(() => $('#register').scrollIntoView(), 50);
    }
  };
};

/* ==========================================================================
   MY REGISTRATION (status, payment proof, poster upload)
   ========================================================================== */
const MY = { files: {}, rec: null, cred: null };
function pill(cls, text) { return '<span class="status-pill st-' + cls + '">' + esc(text) + '</span>'; }
const STATUS_LABEL = () => ({ received: L('Received', 'Diterima'), review: L('Under review', 'Sedang direview'), accepted: L('Accepted', 'Diterima (accepted)'), revision: L('Revision requested', 'Perlu revisi'), rejected: L('Not accepted', 'Tidak diterima'), pending: L('Pending', 'Menunggu'), verified: L('Verified', 'Terverifikasi'), unpaid: L('Unpaid', 'Belum dibayar'), waiting: L('Awaiting verification', 'Menunggu verifikasi'), paid: L('Paid', 'Lunas'), waived: L('Waived', 'Dibebaskan'), published: L('Published', 'Dipublikasikan'), none: L('Not uploaded', 'Belum diunggah') });
function statusKey(s) { return String(s || '').toLowerCase().replace(/[^a-z]+/g, ''); }

function myRegHtml(r) {
  const lab = STATUS_LABEL();
  const st = statusKey(r.status), ps = statusKey(r.paymentStatus);
  const pres = r.category === 'presenter-id' || r.category === 'presenter-intl';
  const canPay = (ps === 'unpaid' || ps === 'rejected') && (!pres || st === 'accepted');
  const canPoster = CFG.features.posterUpload && pres && st === 'accepted' && r.presentationMode === 'poster';
  const rows = [
    [L('Registration ID', 'ID registrasi'), r.id], [L('Name', 'Nama'), r.name], [L('Category', 'Kategori'), r.categoryLabel || r.category], [L('Fee', 'Biaya'), r.fee || ''],
    pres ? [L('Paper title', 'Judul naskah'), r.paperTitle] : null, pres ? [L('Presentation', 'Presentasi'), r.presentationMode === 'oral' ? L('Oral', 'Oral') : L('Poster', 'Poster')] : null,
    pres && r.publication ? [L('Publication', 'Publikasi'), r.publication] : null, r.notes ? [L('Note from committee', 'Catatan panitia'), r.notes] : null
  ].filter(Boolean);
  let revisionBox = '';
  if (pres && st === 'revision') {
    revisionBox = '<div class="card" style="margin-top:18px"><h4 style="font-size:19px;margin-bottom:6px">' + esc(L('Revised manuscript', 'Naskah revisi')) + '</h4>' +
      (r.revisionSubmitted ? '<p style="color:var(--ink2);margin:0">' + esc(L('We received your revised manuscript. The science committee is reviewing it again.', 'Naskah revisi Anda telah kami terima. Tim komite ilmiah sedang mereview kembali.')) + '</p>' :
        '<p style="color:var(--ink2)">' + esc(L('Upload your revised manuscript, following the committee’s notes above. If your fee is still unpaid, attach your proof of payment here too.', 'Unggah naskah revisi Anda sesuai catatan panitia di atas. Jika biaya Anda belum dibayar, sertakan juga bukti pembayaran di sini.')) + '</p>' + revisionFormHtml()) + '</div>';
  }
  let posterBox = '';
  if (pres && r.presentationMode === 'poster') {
    const ps2 = statusKey(r.posterStatus || 'none');
    posterBox = '<div class="card" style="margin-top:18px"><h4 style="font-size:19px;margin-bottom:6px">' + esc(L('Poster', 'Poster')) + ' ' + pill(ps2 === 'published' ? 'paid' : ps2 === 'pending' ? 'review' : 'pending', lab[ps2] || r.posterStatus || lab.none) + '</h4>' +
      (canPoster ? '<p style="color:var(--ink2)">' + esc(L('Upload your camera-ready poster (JPG, PNG or PDF). After the committee approves it, it appears in the virtual poster exhibition.', 'Unggah poster final Anda (JPG, PNG, atau PDF). Setelah disetujui panitia, poster tampil di pameran poster virtual.')) + '</p>' + posterFormHtml(r) : '<p style="color:var(--ink2);margin:0">' + esc(st === 'accepted' ? L('Poster upload is available for accepted poster presenters.', 'Unggah poster tersedia bagi presenter poster yang diterima.') : L('Poster upload opens after your paper is accepted (17 October 2026).', 'Unggah poster dibuka setelah naskah Anda diterima (17 Oktober 2026).')) + '</p>') + '</div>';
  }
  const STATUS_EXPLAIN = { received: L('Received means the committee has received your article and it is waiting to be reviewed.', 'Diterima berarti artikel Anda telah diterima panitia dan menunggu untuk direview.'), review: L('Under review means the science committee and its reviewers are currently assessing your article.', 'Sedang direview berarti komite ilmiah dan reviewer sedang menilai artikel Anda.'), accepted: L('Accepted means your article has been approved for presentation at the conference.', 'Diterima (accepted) berarti artikel Anda disetujui untuk dipresentasikan di konferensi.'), revision: L('Revision requested means the committee needs changes to your article before it can be accepted.', 'Perlu revisi berarti panitia meminta perbaikan pada artikel Anda sebelum dapat diterima.'), rejected: L('Not accepted means your article was not approved to be presented as a paper at this conference.', 'Tidak diterima berarti artikel Anda tidak disetujui untuk dipresentasikan sebagai naskah di konferensi ini.') }[st];
  return '<div class="form-card"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><h3 style="margin:0;margin-right:auto">' + esc(L('Your registration', 'Registrasi Anda')) + '</h3>' +
    (pres ? '<span>' + esc(L('Paper', 'Naskah')) + ' ' + pill(st, lab[st] || r.status) + '</span>' : '') + '<span>' + esc(L('Payment', 'Pembayaran')) + ' ' + pill(ps, lab[ps] || r.paymentStatus) + '</span></div>' +
    (pres && STATUS_EXPLAIN ? '<p class="tl__n" style="margin:0 0 18px">' + esc(STATUS_EXPLAIN) + '</p>' : '<div style="margin-bottom:18px"></div>') +
    '<dl class="summary">' + rows.map((x) => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl>' +
    '<div class="regcard" style="margin-top:22px"><div class="card"><h4 style="font-size:19px;margin-bottom:6px">' + esc(L('Payment proof', 'Bukti pembayaran')) + '</h4>' +
    (canPay ? '<p style="color:var(--ink2)">' + esc(L('Upload a screenshot or PDF of your transfer receipt.', 'Unggah tangkapan layar atau PDF bukti transfer Anda.')) + '</p>' + bankHtml() + payFormHtml() : '<p style="color:var(--ink2);margin:0">' + esc(ps === 'waiting' ? L('We received your proof and will verify it soon.', 'Bukti Anda telah kami terima dan akan segera diverifikasi.') : ps === 'paid' || ps === 'verified' ? L('Payment confirmed. Thank you.', 'Pembayaran terkonfirmasi. Terima kasih.') : ps === 'waived' ? L('No payment is needed for your registration.', 'Registrasi Anda tidak memerlukan pembayaran.') : pres ? L('Payment opens after your paper is accepted.', 'Pembayaran dibuka setelah naskah Anda diterima.') : L('Payment status will update here.', 'Status pembayaran akan diperbarui di sini.')) + '</p>') + '</div>' +
    '<div class="card"><h4 style="font-size:19px;margin-bottom:6px">' + esc(L('Next steps', 'Langkah berikutnya')) + '</h4><div style="display:grid;gap:10px">' + (pres ? ojsBtn(L('Submit / manage your paper in OJS', 'Submit / kelola naskah di OJS'), 'btn--violet btn--sm') : '') + btn(L('Programme', 'Program'), pageUrl('programme'), 'btn--outline btn--sm', 'clock') + btn(L('Contact secretariat', 'Hubungi sekretariat'), waLink('Registration ' + r.id + ': '), 'btn--outline btn--sm', 'wa', true) + '</div></div></div>' + revisionBox + posterBox + '</div>';
}
function revisionFormHtml() {
  return '<form id="revision-form" novalidate><div class="fgrid" style="grid-template-columns:1fr">' +
    dropzone('revisionManuscript', L('Revised manuscript', 'Naskah revisi'), '.pdf,.doc,.docx', CFG.limits.manuscriptMB, 'PDF, DOC, DOCX · max ' + CFG.limits.manuscriptMB + ' MB', true) +
    dropzone('revisionProof', L('Proof of payment', 'Bukti pembayaran'), '.jpg,.jpeg,.png,.pdf', CFG.limits.proofMB, L('optional if already paid', 'opsional jika sudah dibayar') + ' · JPG, PNG, PDF · max ' + CFG.limits.proofMB + ' MB', false) +
    '</div><div id="revision-alert" style="margin-top:12px"></div><button class="btn btn--primary btn--sm" type="submit" style="margin-top:14px">' + esc(L('Submit revision', 'Kirim revisi')) + ' ' + icon('upload') + '</button></form>';
}
function payFormHtml() {
  return '<form id="pay-form" novalidate><div class="fgrid" style="grid-template-columns:1fr">' + dropzone('proof', L('Proof of payment', 'Bukti pembayaran'), '.jpg,.jpeg,.png,.pdf', CFG.limits.proofMB, 'JPG, PNG, PDF · max ' + CFG.limits.proofMB + ' MB', true) +
    '<div class="f"><label for="pay-note">' + esc(L('Note', 'Catatan')) + ' <small>' + esc(L('optional', 'opsional')) + '</small></label><input id="pay-note" type="text" maxlength="200" name="note" placeholder="' + esc(L('Sender name, date of transfer', 'Nama pengirim, tanggal transfer')) + '"></div></div><div id="pay-alert" style="margin-top:12px"></div><button class="btn btn--primary btn--sm" type="submit" style="margin-top:14px">' + esc(L('Upload proof', 'Unggah bukti')) + ' ' + icon('upload') + '</button></form>';
}
function posterFormHtml(r) {
  return '<form id="poster-form" novalidate><div class="fgrid">' +
    '<div class="f f--full"><label for="pf-title">' + esc(L('Poster title', 'Judul poster')) + ' <em>*</em></label><input id="pf-title" name="title" type="text" maxlength="250" value="' + esc(r.paperTitle || '') + '"><span class="err"></span></div>' +
    '<div class="f f--full"><label for="pf-authors">' + esc(L('Authors', 'Penulis')) + ' <em>*</em></label><input id="pf-authors" name="authors" type="text" maxlength="400" value="' + esc(r.name || '') + '" placeholder="' + esc(L('Separate authors with semicolons', 'Pisahkan penulis dengan titik koma')) + '"><span class="err"></span></div>' +
    '<div class="f"><label for="pf-aff">' + esc(L('Affiliation', 'Afiliasi')) + ' <em>*</em></label><input id="pf-aff" name="affiliation" type="text" maxlength="250" value="' + esc(r.affiliation || '') + '"><span class="err"></span></div>' +
    '<div class="f f--full"><label for="pf-track">' + esc(L('Scientific track', 'Bidang ilmiah')) + ' <em>*</em></label><select id="pf-track" name="track"><option value="">' + esc(L('Choose a track', 'Pilih bidang')) + '</option>' + SITE.tracks.map((x) => '<option value="' + x.n + '">' + esc(String(x.n).padStart(2, '0') + '. ' + (x[LANG] || x.en)) + '</option>').join('') + '</select><span class="err"></span></div>' +
    '<div class="f"><label for="pf-video">' + esc(L('Video link', 'Tautan video')) + ' <small>' + esc(L('optional, YouTube', 'opsional, YouTube')) + '</small></label><input id="pf-video" name="videoUrl" type="url" maxlength="300" placeholder="https://youtu.be/…"><span class="err"></span></div>' +
    '<div class="f f--full"><label for="pf-abs">' + esc(L('Short abstract', 'Abstrak singkat')) + ' <em>*</em> <small>' + esc(L('up to 300 words', 'maksimal 300 kata')) + '</small></label><textarea id="pf-abs" name="abstract" maxlength="3000">' + esc(r.abstract || '') + '</textarea><span class="err"></span></div>' +
    dropzone('poster', L('Poster file', 'Berkas poster'), '.jpg,.jpeg,.png,.pdf', CFG.limits.posterMB, 'JPG, PNG, PDF · max ' + CFG.limits.posterMB + ' MB', true) +
    '<div class="f f--full"><label class="check"><input type="checkbox" name="consent"><span>' + esc(L('I agree that this poster, title, authors, affiliation and abstract may be shown publicly in the B-ICON 2026 virtual poster exhibition.', 'Saya setuju poster, judul, penulis, afiliasi, dan abstrak ini ditampilkan publik di pameran poster virtual B-ICON 2026.')) + '</span></label><span class="err"></span></div>' +
    '<div class="f f--full"><label class="check"><input type="checkbox" name="allowDownload"><span>' + esc(L('Visitors may download my poster file.', 'Pengunjung boleh mengunduh berkas poster saya.')) + '</span></label></div></div>' +
    '<div id="poster-alert" style="margin-top:12px"></div><button class="btn btn--primary" type="submit" style="margin-top:14px">' + esc(L('Upload poster', 'Unggah poster')) + ' ' + icon('upload') + '</button></form>';
}

/* downscale big poster images in the browser before upload */
async function shrinkImage(file, maxSide, quality) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, maxSide / Math.max(img.width, img.height));
    if (s === 1 && file.size < 3 * 1048576) return file;
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch (e) { return file; } finally { URL.revokeObjectURL(url); }
}

PAGES['my-registration'] = function () {
  const q = new URLSearchParams(location.search);
  const preId = q.get('id') || store.get('lastreg', '');
  const main = html`
  ${pageHero({ title: L('My registration', 'Registrasi saya'), lead: L('Check your status, upload proof of payment and, for accepted poster presenters, upload your poster.', 'Cek status, unggah bukti pembayaran, dan untuk presenter poster yang diterima, unggah poster Anda.'), parent: [L('Registration', 'Registrasi'), pageUrl('registration')] })}
  <section class="section">
    <div class="wrap" style="max-width:940px">
      <div class="form-card">
        <h3>${esc(L('Find your registration', 'Temukan registrasi Anda'))}</h3><p class="sub">${esc(L('Enter the ID from your confirmation email and the email address you registered with.', 'Masukkan ID dari email konfirmasi dan alamat email yang Anda gunakan saat mendaftar.'))}</p>
        <form id="lookup-form" class="lookup" novalidate>
          <div class="f"><label for="lk-id">${esc(L('Registration ID', 'ID registrasi'))}</label><input id="lk-id" type="text" name="id" placeholder="BICON26-0001" value="${esc(preId)}" autocomplete="off" style="text-transform:uppercase" required></div>
          <div class="f"><label for="lk-email">Email</label><input id="lk-email" type="email" name="email" autocomplete="email" required></div>
          <button class="btn btn--primary" type="submit" style="height:50px">${esc(L('Check status', 'Cek status'))} ${icon('search')}</button>
        </form>
        <div id="lookup-alert" style="margin-top:16px"></div>
      </div>
      <div id="my-result" style="margin-top:26px"></div>
    </div>
  </section>${extraBlock()}`;
  return {
    title: L('My registration', 'Registrasi saya'), desc: L('Check your B-ICON 2026 registration status.', 'Cek status registrasi B-ICON 2026 Anda.'), main,
    init() {
      const form = $('#lookup-form'), al = $('#lookup-alert');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.id.value.trim().toUpperCase(), email = form.email.value.trim().toLowerCase();
        if (!id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { al.innerHTML = '<div class="alert alert--err">' + icon('alert') + '<span>' + esc(L('Enter your registration ID and a valid email.', 'Masukkan ID registrasi dan email yang valid.')) + '</span></div>'; return; }
        const b = $('button', form); b.classList.add('is-loading'); al.innerHTML = '';
        try {
          const res = await gasPost('status', { id, email });
          MY.rec = res.record; MY.cred = { id, email }; MY.files = {};
          $('#my-result').innerHTML = myRegHtml(res.record);
          bindMyActions();
          $('#my-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          $('#my-result').innerHTML = '';
          al.innerHTML = '<div class="alert alert--err">' + icon('alert') + '<span>' + esc(err.code === 'not_found' ? L('We could not find a registration with that ID and email. Check both and try again.', 'Registrasi dengan ID dan email tersebut tidak ditemukan. Periksa keduanya lalu coba lagi.') : err.message) + '</span></div>';
        } finally { b.classList.remove('is-loading'); }
      });
    }
  };
};
function bindMyActions() {
  const host = $('#my-result');
  if (!host.dataset.bound) { host.dataset.bound = '1'; bindDropzones(host, () => MY.files, () => { $$('[data-dz]', host).forEach((z) => { const f = MY.files[z.dataset.dz]; const info = $('.fileinfo', z); info.hidden = !f; $('.fn', info).textContent = f ? f.name + ' · ' + humanSize(f.size) : ''; }); }); }
  const pay = $('#pay-form', host), post = $('#poster-form', host), rev = $('#revision-form', host);
  const report = (el, cls, msg) => { el.innerHTML = '<div class="alert alert--' + cls + '">' + icon(cls === 'ok' ? 'checkc' : 'alert') + '<span>' + esc(msg) + '</span></div>'; };
  if (pay) pay.addEventListener('submit', async (e) => {
    e.preventDefault(); const al = $('#pay-alert'), b = $('button[type=submit]', pay);
    if (!MY.files.proof) { report(al, 'err', L('Please choose your proof of payment.', 'Mohon pilih bukti pembayaran Anda.')); return; }
    b.classList.add('is-loading');
    try {
      const f = await shrinkImage(MY.files.proof, 2000, 0.85);
      await gasPost('uploadPayment', { id: MY.cred.id, email: MY.cred.email, note: pay.note.value, file: { name: f.name, type: f.type || 'application/octet-stream', data: await fileToB64(f) } }, { timeout: 120000 });
      report(al, 'ok', L('Proof received. The committee will verify it and update your status.', 'Bukti diterima. Panitia akan memverifikasi dan memperbarui status Anda.'));
      MY.files = {}; toast(L('Payment proof uploaded', 'Bukti pembayaran terunggah'));
    } catch (err) { report(al, 'err', err.message); } finally { b.classList.remove('is-loading'); }
  });
  if (post) post.addEventListener('submit', async (e) => {
    e.preventDefault(); const al = $('#poster-alert'), b = $('button[type=submit]', post);
    let bad = false; const need = (name, cond, msg) => { const f = post.elements[name].closest('.f'); f.classList.toggle('has-err', !cond); $('.err', f).textContent = cond ? '' : msg; if (!cond) bad = true; };
    need('title', post.title.value.trim().length >= 5, L('Enter the poster title.', 'Isi judul poster.'));
    need('authors', post.authors.value.trim().length >= 2, L('Enter the authors.', 'Isi nama penulis.'));
    need('affiliation', post.affiliation.value.trim().length >= 2, L('Enter the affiliation.', 'Isi afiliasi.'));
    need('track', !!post.track.value, L('Please choose a track.', 'Mohon pilih bidang.'));
    need('abstract', wordCount(post.abstract.value) >= 30 && wordCount(post.abstract.value) <= 320, L('The abstract should be 30 to 300 words.', 'Abstrak sebaiknya 30 sampai 300 kata.'));
    need('consent', post.consent.checked, L('Consent is required to display the poster.', 'Persetujuan diperlukan untuk menampilkan poster.'));
    const vu = post.videoUrl.value.trim(); need('videoUrl', !vu || !!youtubeEmbed(vu), L('Use a YouTube link, or leave this empty.', 'Gunakan tautan YouTube, atau kosongkan.'));
    if (!MY.files.poster) { const z = $('[data-dz="poster"]', post); z.classList.add('has-err'); $('.err', z).textContent = L('Please choose your poster file.', 'Mohon pilih berkas poster Anda.'); bad = true; }
    if (bad) return;
    b.classList.add('is-loading'); al.innerHTML = '';
    try {
      const f = await shrinkImage(MY.files.poster, 2600, 0.86);
      await gasPost('uploadPoster', { id: MY.cred.id, email: MY.cred.email, title: post.title.value.trim(), authors: post.authors.value.trim(), affiliation: post.affiliation.value.trim(), track: Number(post.track.value), abstract: post.abstract.value.trim(), videoUrl: vu, allowDownload: post.allowDownload.checked, consent: true, file: { name: f.name, type: f.type || 'application/octet-stream', data: await fileToB64(f) } }, { timeout: 180000 });
      report(al, 'ok', L('Poster received. It will appear in the exhibition once the committee approves it.', 'Poster diterima. Poster akan tampil di pameran setelah disetujui panitia.'));
      toast(L('Poster uploaded', 'Poster terunggah'));
    } catch (err) { report(al, 'err', err.message); } finally { b.classList.remove('is-loading'); }
  });
  if (rev) rev.addEventListener('submit', async (e) => {
    e.preventDefault(); const al = $('#revision-alert'), b = $('button[type=submit]', rev);
    if (!MY.files.revisionManuscript) { report(al, 'err', L('Please attach your revised manuscript.', 'Mohon lampirkan naskah revisi Anda.')); return; }
    b.classList.add('is-loading');
    try {
      const payload = { id: MY.cred.id, email: MY.cred.email, file: { name: MY.files.revisionManuscript.name, type: MY.files.revisionManuscript.type || 'application/octet-stream', data: await fileToB64(MY.files.revisionManuscript) } };
      if (MY.files.revisionProof) { const f = await shrinkImage(MY.files.revisionProof, 2000, 0.85); payload.proofFile = { name: f.name, type: f.type || 'application/octet-stream', data: await fileToB64(f) }; }
      await gasPost('uploadRevision', payload, { timeout: 120000 });
      report(al, 'ok', L('Revision received. The science committee will review it again.', 'Revisi diterima. Tim komite ilmiah akan mereview kembali.'));
      MY.files = {}; toast(L('Revision submitted', 'Revisi terkirim'));
    } catch (err) { report(al, 'err', err.message); } finally { b.classList.remove('is-loading'); }
  });
}


/* ===== 50-posters.js ===== */
/* ==========================================================================
   50-posters.js — virtual poster exhibition
   Data sources (first available wins): demo (preview only) -> Firestore -> Google Apps Script.
   Public visitors only ever read published posters. Personal data is never shown.
   ========================================================================== */

const FB_VER = '10.12.5';
const FB = { ready: null, db: null, auth: null, m: null };

async function fbInit() {
  if (FB.ready) return FB.ready;
  FB.ready = (async () => {
    const c = CFG.firebase;
    if (!c || !c.projectId || !c.apiKey) throw new Error('no_firebase');
    const base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    const [app, fs, au] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')]);
    const a = app.initializeApp(c);
    FB.db = fs.getFirestore(a); FB.auth = au.getAuth(a); FB.m = { fs, au };
    return FB;
  })();
  FB.ready.catch(() => { FB.ready = null; });
  return FB.ready;
}
async function fbUid() {
  await fbInit();
  if (FB.auth.currentUser) return FB.auth.currentUser.uid;
  const cred = await FB.m.au.signInAnonymously(FB.auth);
  return cred.user.uid;
}

/* ---------- demo data (only when CFG.features.demo is true) ---------- */
function demoPosters() {
  const titles = [
    ['Rapid antigen testing for dengue in primary care settings', 'A. Rahman; S. Putri', 'Poltekkes Kemenkes Bengkulu', 2],
    ['One Health surveillance of avian influenza in smallholder farms', 'L. Tan; K. Wijaya', 'Universitas Bengkulu', 1],
    ['Community-based tuberculosis case finding in coastal villages', 'M. Sari; D. Hakim', 'Dinas Kesehatan Kota Bengkulu', 3],
    ['Antimicrobial resistance patterns in urban wastewater', 'R. Lim; T. Nugroho', 'National University Hospital', 5],
    ['Nutrition status and infection risk among under-five children', 'N. Amelia; F. Yusuf', 'Poltekkes Kemenkes Bengkulu', 6],
    ['Digital health tools for zoonotic outbreak reporting', 'P. Chaiwat; J. Suwan', 'Chulalongkorn University', 9],
    ['Climate variability and malaria incidence in Sumatra', 'E. Kusuma; H. Prasetyo', 'Universitas Sriwijaya', 8],
    ['Hand hygiene compliance in maternal wards', 'I. Fitriani; B. Setiawan', 'RSUD Dr. M. Yunus', 4],
    ['Health literacy interventions during emerging disease alerts', 'C. Ong; V. Lestari', 'Universiti Malaya', 10],
    ['Vaccination coverage recovery after the pandemic period', 'Y. Marlina; A. Gunawan', 'Poltekkes Kemenkes Jakarta', 7],
    ['Herbal antimicrobial screening from local plants', 'D. Anggraini; O. Pratama', 'Poltekkes Kemenkes Bengkulu', 2],
    ['Water sanitation and diarrhoeal disease clusters', 'S. Mahendra; Z. Rahayu', 'Universitas Andalas', 1]
  ];
  const cols = ['#4E27BF', '#E8630A', '#0E8A5F', '#C2185B', '#1565C0', '#B45309'];
  return titles.map((r, i) => {
    const c = cols[i % cols.length];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><rect width="900" height="1200" fill="#fff"/><rect width="900" height="200" fill="' + c + '"/><text x="50" y="90" font-family="Arial" font-weight="700" font-size="44" fill="#fff">SAMPLE POSTER ' + (i + 1) + '</text><text x="50" y="145" font-family="Arial" font-size="26" fill="#fff" opacity=".85">B-ICON 2026 preview</text>' +
      [0, 1, 2].map((k) => '<rect x="50" y="' + (260 + k * 300) + '" width="800" height="24" rx="6" fill="' + c + '" opacity=".25"/><rect x="50" y="' + (310 + k * 300) + '" width="700" height="14" rx="6" fill="#ccc"/><rect x="50" y="' + (340 + k * 300) + '" width="760" height="14" rx="6" fill="#ddd"/><rect x="50" y="' + (370 + k * 300) + '" width="620" height="14" rx="6" fill="#ddd"/><rect x="50" y="' + (410 + k * 300) + '" width="360" height="110" rx="10" fill="' + c + '" opacity=".14"/><rect x="440" y="' + (410 + k * 300) + '" width="410" height="110" rx="10" fill="#eee"/>').join('') + '</svg>';
    return {
      id: 'DEMO-' + String(i + 1).padStart(3, '0'), title: r[0], authors: r[1], affiliation: r[2], track: r[3],
      abstract: 'This is sample text used only in the design preview. It shows how an abstract appears next to the poster, with a few lines describing the background, method, findings and conclusion of the study. Real content appears only after the committee approves a poster.',
      imageUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), pdfUrl: '', videoUrl: '', allowDownload: false, likes: (i * 7) % 23, createdAt: 1790000000000 + i * 86400000
    };
  });
}

/* ---------- adapters ---------- */
const PosterStore = {
  mode: '',
  async list() {
    if (CFG.features.demo) { this.mode = 'demo'; return demoPosters(); }
    if (CFG.firebase && CFG.firebase.projectId) {
      try {
        await fbInit();
        const { fs } = FB.m;
        const snap = await fs.getDocs(fs.query(fs.collection(FB.db, 'posters'), fs.where('published', '==', true)));
        this.mode = 'firestore';
        return snap.docs.map((d) => normalizePoster(Object.assign({ id: d.id }, d.data())));
      } catch (e) { if (!CFG.gasUrl) throw e; }
    }
    if (CFG.gasUrl) {
      const r = await gasGet('posters');
      this.mode = 'gas';
      return (r.posters || []).map(normalizePoster);
    }
    this.mode = 'none';
    return [];
  },
  async counts(list, onEach) {
    if (this.mode !== 'firestore') return;
    const { fs } = FB.m;
    const queue = list.slice(0, 120);
    const worker = async () => {
      while (queue.length) {
        const p = queue.shift();
        try { const c = await fs.getCountFromServer(fs.collection(FB.db, 'posters', p.id, 'votes')); p.likes = c.data().count; onEach(p); } catch (e) { /* ignore */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  },
  async toggleLike(p, want) {
    if (this.mode === 'demo') { p.likes = Math.max(0, (p.likes || 0) + (want ? 1 : -1)); return p.likes; }
    if (this.mode === 'firestore') {
      const uid = await fbUid(); const { fs } = FB.m;
      const ref = fs.doc(FB.db, 'posters', p.id, 'votes', uid);
      const exists = (await fs.getDoc(ref)).exists();
      if (want && !exists) await fs.setDoc(ref, { createdAt: fs.serverTimestamp() });
      if (!want && exists) await fs.deleteDoc(ref);
      const c = await fs.getCountFromServer(fs.collection(FB.db, 'posters', p.id, 'votes'));
      p.likes = c.data().count; return p.likes;
    }
    if (this.mode === 'gas') {
      let tok = store.get('vtoken', ''); if (!tok) { tok = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); store.set('vtoken', tok); }
      const r = await gasPost('appreciate', { id: p.id, token: tok, on: !!want });
      p.likes = r.likes; return p.likes;
    }
    throw new Error('no_backend');
  }
};
function normalizePoster(o) {
  const ts = o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : (Number(o.createdAt) || Date.parse(o.createdAt) || 0);
  return { id: String(o.id), title: o.title || '', authors: o.authors || '', affiliation: o.affiliation || '', track: Number(o.track) || 0, abstract: o.abstract || '', imageUrl: safeUrl(o.imageUrl || ''), pdfUrl: safeUrl(o.pdfUrl || ''), videoUrl: o.videoUrl || '', allowDownload: !!o.allowDownload, likes: Number(o.likes) || 0, createdAt: ts };
}

/* ---------- state ---------- */
const EX = { all: [], q: '', track: 0, sort: 'new', liked: {} };
try { EX.liked = JSON.parse(store.get('liked', '{}')) || {}; } catch (e) { EX.liked = {}; }
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function filtered() {
  const q = norm(EX.q).trim();
  let a = EX.all.filter((p) => (!EX.track || p.track === EX.track) && (!q || norm(p.title + ' ' + p.authors + ' ' + p.affiliation + ' ' + p.abstract).includes(q)));
  if (EX.sort === 'likes') a = a.slice().sort((x, y) => y.likes - x.likes || y.createdAt - x.createdAt);
  else if (EX.sort === 'az') a = a.slice().sort((x, y) => x.title.localeCompare(y.title, LOC));
  else a = a.slice().sort((x, y) => y.createdAt - x.createdAt);
  return a;
}
function frameHtml(p, i) {
  const tr = trackById(p.track);
  return '<button type="button" class="frame rv" data-d="' + (i % 4) + '" data-poster="' + esc(p.id) + '" aria-label="' + esc(p.title) + '" style="--tc:' + (tr ? tr.color : 'var(--v500)') + '">' +
    '<span class="frame__id">#' + esc(String(p.id).replace(/^\D*0*/, '') || p.id) + '</span><div class="frame__mat"><span class="frame__trk"></span>' +
    (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="" loading="lazy" decoding="async">' : '<div class="frame__ph">' + icon('board') + '</div>') + '</div>' +
    '<div class="frame__cap"><b>' + esc(p.title) + '</b><span>' + esc(p.authors) + (p.affiliation ? ' · ' + esc(p.affiliation) : '') + '</span><span class="likes" data-likes-of="' + esc(p.id) + '">' + icon('heart') + ' ' + p.likes + '</span></div></button>';
}
function paintWall() {
  const wall = $('#wall'); if (!wall) return;
  const a = filtered();
  $('#expo-count').textContent = a.length + ' / ' + EX.all.length + ' ' + L('posters', 'poster');
  if (!EX.all.length) return;
  wall.innerHTML = a.length ? a.map(frameHtml).join('') : '<div class="expo__empty" style="grid-column:1/-1"><img src="' + IMG('bicon-icon.png') + '" alt=""><h3>' + esc(L('No posters match your search', 'Tidak ada poster yang cocok')) + '</h3><p>' + esc(L('Try another keyword or choose a different track.', 'Coba kata kunci lain atau pilih bidang yang berbeda.')) + '</p></div>';
  $$('.rv', wall).forEach((x) => x.classList.add('is-in'));
  $$('.tchip', ROOT).forEach((c) => {
    const id = Number(c.dataset.track); const n = id ? EX.all.filter((p) => p.track === id).length : EX.all.length;
    c.setAttribute('aria-pressed', String(EX.track === id)); const b = $('b', c); if (b) b.textContent = n;
  });
}

/* ---------- viewer ---------- */
function drivePreview(url) { const m = /\/d\/([\w-]+)/.exec(url) || /[?&]id=([\w-]+)/.exec(url); return m ? 'https://drive.google.com/file/d/' + m[1] + '/preview' : url; }
function openPoster(id, push) {
  const p = EX.all.find((x) => x.id === id); if (!p) return;
  const tr = trackById(p.track), liked = !!EX.liked[p.id], emb = youtubeEmbed(p.videoUrl);
  const stage = p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="' + esc(p.title) + '" data-viewer-zoom>' : p.pdfUrl ? '<iframe src="' + esc(drivePreview(p.pdfUrl)) + '" title="' + esc(p.title) + '" loading="lazy"></iframe>' : '<div class="frame__ph" style="width:100%;min-height:300px">' + icon('board') + '</div>';
  const info = '<div class="viewer__info"><span class="chip chip--o">' + esc(tr ? String(tr.n).padStart(2, '0') + ' · ' + (tr[LANG] || tr.en) : L('Poster', 'Poster')) + '</span><h3 style="margin-top:12px">' + esc(p.title) + '</h3>' +
    '<p style="margin:10px 0 0;color:var(--ink2)"><b>' + esc(p.authors) + '</b>' + (p.affiliation ? '<br>' + esc(p.affiliation) : '') + '</p>' +
    (p.abstract ? '<h4>' + esc(L('Abstract', 'Abstrak')) + '</h4><p style="margin:0;color:var(--ink2);white-space:pre-line">' + esc(p.abstract) + '</p>' : '') +
    (emb ? '<h4>' + esc(L('Video', 'Video')) + '</h4><div class="video"><iframe src="' + esc(emb) + '" title="Video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' : '') +
    '<div class="viewer__actions">' + (CFG.features.appreciate ? '<button type="button" class="appr" data-appr="' + esc(p.id) + '" aria-pressed="' + liked + '">' + icon('heart') + ' <span>' + esc(L('Appreciate', 'Apresiasi')) + '</span> · <b data-appr-n>' + p.likes + '</b></button>' : '') +
    '<button type="button" class="btn btn--outline btn--sm" data-share="' + esc(p.id) + '">' + icon('share') + ' ' + esc(L('Copy link', 'Salin tautan')) + '</button>' +
    (p.allowDownload && (p.pdfUrl || p.imageUrl) ? '<a class="btn btn--outline btn--sm" href="' + esc(p.pdfUrl || p.imageUrl) + '" target="_blank" rel="noopener" download>' + icon('download') + ' ' + esc(L('Download', 'Unduh')) + '</a>' : '') + '</div></div>';
  const m = openModal('<div class="viewer"><div class="viewer__stage">' + stage + '</div>' + info + '</div>', { width: 'min(1180px, 96vw)', label: p.title });
  if (push !== false) { try { history.replaceState(null, '', '#poster=' + encodeURIComponent(p.id)); } catch (e) { /* ignore */ } }
  m.addEventListener('click', async (e) => {
    const z = e.target.closest('[data-viewer-zoom]'); if (z) { z.parentElement.classList.toggle('is-zoom'); return; }
    const s = e.target.closest('[data-share]'); if (s) { copyText(location.href.split('#')[0] + '#poster=' + encodeURIComponent(p.id)); return; }
    const a = e.target.closest('[data-appr]'); if (!a || a.disabled) return;
    const want = a.getAttribute('aria-pressed') !== 'true'; a.disabled = true;
    try {
      const n = await PosterStore.toggleLike(p, want);
      EX.liked[p.id] = want; if (!want) delete EX.liked[p.id]; store.set('liked', JSON.stringify(EX.liked));
      a.setAttribute('aria-pressed', String(want)); $('[data-appr-n]', a).textContent = n;
      const lk = $('[data-likes-of="' + p.id + '"]'); if (lk) lk.innerHTML = icon('heart') + ' ' + n;
    } catch (err) { toast(L('Could not save your appreciation right now.', 'Apresiasi belum dapat disimpan saat ini.')); } finally { a.disabled = false; }
  });
}
onModalClosed = function () { if (location.hash.indexOf('#poster=') === 0) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } } };

/* ---------- page ---------- */
PAGES['poster-exhibition'] = function () {
  const main = html`
  ${CFG.features.demo ? '<div class="demo-flag">' + esc(L('Design preview: the posters below are samples', 'Pratinjau desain: poster di bawah ini hanyalah contoh')) + '</div>' : ''}
  ${pageHero({ title: L('Virtual poster exhibition', 'Pameran poster virtual'), lead: L('Browse accepted scientific posters from B-ICON 2026. Search by keyword, filter by track, read the abstract and show your appreciation to the authors.', 'Jelajahi poster ilmiah B-ICON 2026 yang diterima. Cari dengan kata kunci, saring per bidang, baca abstrak, dan berikan apresiasi kepada penulis.'), parent: [L('Poster exhibition', 'Pameran poster'), pageUrl('poster-exhibition')], actions: btn(L('Present a poster', 'Presentasikan poster'), pageUrl('registration'), 'btn--primary') + btn(L('Upload my poster', 'Unggah poster saya'), pageUrl('my-registration'), 'btn--ghost', 'upload') })}
  <section class="expo">
    <div class="expo__bar">
      <div class="wrap">
        <label class="search">${icon('search')}<input id="expo-q" type="search" placeholder="${esc(L('Search title, author, keyword…', 'Cari judul, penulis, kata kunci…'))}" aria-label="${esc(L('Search posters', 'Cari poster'))}" autocomplete="off"></label>
        <select id="expo-sort" aria-label="${esc(L('Sort', 'Urutkan'))}"><option value="new">${esc(L('Newest first', 'Terbaru'))}</option><option value="likes">${esc(L('Most appreciated', 'Paling diapresiasi'))}</option><option value="az">${esc(L('Title A to Z', 'Judul A ke Z'))}</option></select>
        <span id="expo-count" class="chip chip--dark" aria-live="polite"></span>
      </div>
      <div class="trackbar" id="trackbar" role="group" aria-label="${esc(L('Filter by track', 'Saring per bidang'))}">
        <button type="button" class="tchip" data-track="0" aria-pressed="true">${esc(L('All tracks', 'Semua bidang'))} <b>0</b></button>
        ${SITE.tracks.map((tr) => '<button type="button" class="tchip" data-track="' + tr.n + '" aria-pressed="false" style="--tc:' + tr.color + '"><i></i>' + esc(String(tr.n).padStart(2, '0') + ' ' + (tr[LANG] || tr.en)) + ' <b>0</b></button>').join('')}
      </div>
    </div>
    <div class="wrap"><div id="wall" class="wall" aria-live="polite"><div class="expo__empty" style="grid-column:1/-1"><div class="spin" style="margin:0 auto;border-color:rgba(255,255,255,.3);border-top-color:#fff"></div></div></div></div>
  </section>
  <section class="section section--tight"><div class="wrap">
    ${secHead(L('For presenters', 'Untuk presenter'), L('How your poster gets here', 'Bagaimana poster Anda tampil di sini'))}
    <div class="steps">
      <div class="step rv"><h4>${esc(L('Get accepted', 'Diterima'))}</h4><p>${esc(L('Register as a poster presenter and submit your paper. Acceptance is announced on 17 October 2026.', 'Daftar sebagai presenter poster dan kirim naskah. Penerimaan diumumkan 17 Oktober 2026.'))}</p></div>
      <div class="step rv" data-d="1"><h4>${esc(L('Upload your poster', 'Unggah poster'))}</h4><p>${esc(L('Use My Registration to upload a JPG, PNG or PDF, plus an optional video link.', 'Gunakan Registrasi Saya untuk mengunggah JPG, PNG, atau PDF, serta tautan video opsional.'))}</p></div>
      <div class="step rv" data-d="2"><h4>${esc(L('Committee review', 'Ditinjau panitia'))}</h4><p>${esc(L('The committee checks the file and publishes it. You get an email when it is live.', 'Panitia memeriksa berkas lalu menerbitkannya. Anda mendapat email saat poster tayang.'))}</p></div>
      <div class="step rv" data-d="3"><h4>${esc(L('Share it', 'Bagikan'))}</h4><p>${esc(L('Every poster has its own link you can send to colleagues and reviewers.', 'Setiap poster memiliki tautan sendiri yang bisa Anda kirim ke kolega dan reviewer.'))}</p></div>
    </div>
  </div></section>${extraBlock()}`;
  return {
    title: L('Poster exhibition', 'Pameran poster'), desc: L('Virtual scientific poster exhibition of B-ICON 2026.', 'Pameran poster ilmiah virtual B-ICON 2026.'), main,
    async init() {
      const wall = $('#wall');
      const empty = (title, text) => { wall.innerHTML = '<div class="expo__empty" style="grid-column:1/-1"><img src="' + IMG('bicon-icon.png') + '" alt=""><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>'; $('#expo-count').textContent = '0'; };
      $('#expo-q').addEventListener('input', debounce((e) => { EX.q = e.target.value; paintWall(); }, 160));
      $('#expo-sort').addEventListener('change', (e) => { EX.sort = e.target.value; paintWall(); });
      $('#trackbar').addEventListener('click', (e) => { const b = e.target.closest('.tchip'); if (!b) return; EX.track = Number(b.dataset.track); paintWall(); });
      wall.addEventListener('click', (e) => { const f = e.target.closest('[data-poster]'); if (f) openPoster(f.dataset.poster); });
      try {
        EX.all = await PosterStore.list();
      } catch (err) { empty(L('The exhibition could not be loaded', 'Pameran tidak dapat dimuat'), L('Please refresh the page in a moment.', 'Silakan muat ulang halaman beberapa saat lagi.')); return; }
      if (!EX.all.length) {
        empty(L('The exhibition opens soon', 'Pameran segera dibuka'), L('Posters appear here after acceptance notifications on 17 October 2026 and committee review. Presenters can upload their poster from My Registration.', 'Poster tampil di sini setelah pemberitahuan penerimaan 17 Oktober 2026 dan peninjauan panitia. Presenter dapat mengunggah poster dari Registrasi Saya.'));
        $$('.tchip b', ROOT).forEach((b) => { b.textContent = '0'; });
        return;
      }
      paintWall();
      PosterStore.counts(EX.all, (p) => { const el = $('[data-likes-of="' + p.id + '"]'); if (el) el.innerHTML = icon('heart') + ' ' + p.likes; });
      const m = /^#poster=(.+)$/.exec(location.hash); if (m) openPoster(decodeURIComponent(m[1]), false);
    }
  };
};


/* ===== 90-main.js ===== */
/* ==========================================================================
   90-main.js — boot: choose the page, load committee-editable overrides, render.
   The host page (Blogger theme or a static stub) provides
   <div id="bicon-root" data-pt="index|static_page|item|error_page|archive" data-slug="registration">
   and, optionally, a hidden <div id="bicon-native"> with the Blogger content of that page/post.
   ========================================================================== */

function detectSlug() {
  const d = ROOT.dataset || {};
  if (d.slug && PAGES[d.slug]) return d.slug;
  const pt = d.pt || '';
  if (pt === 'index' || pt === '') {
    const m = location.pathname.match(/\/p\/([^/]+)\.html$/);
    if (m && PAGES[m[1]]) return m[1];
    if (m) return 'notfound';
    if (/^\/search(\/|$)/.test(location.pathname.replace(BASE, ''))) return 'news';
    return 'home';
  }
  if (pt === 'item') return 'post';
  if (pt === 'archive') return 'news';
  if (pt === 'error_page') return 'notfound';
  if (pt === 'static_page') {
    const m = location.pathname.match(/\/p\/([^/]+)\.html$/);
    if (m && PAGES[m[1]]) return m[1];
    return 'notfound';
  }
  return 'home';
}

/* Overrides (dates, announcements) come from the Sheet through GAS. Cached briefly so pages open instantly. */
async function loadOverrides() {
  if (!CFG.gasUrl || CFG.features.demo) return;
  const KEY = 'bicon26:ov';
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.t < 5 * 60 * 1000) { window.__BICON_OVERRIDES = c.v; return; }
  } catch (e) { /* ignore */ }
  try {
    const r = await Promise.race([gasGet('content', null, { timeout: 4000 }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 1800))]);
    const v = { dates: r.dates || {}, announcements: r.announcements || [] };
    window.__BICON_OVERRIDES = v;
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v })); } catch (e) { /* ignore */ }
  } catch (e) { /* the built-in defaults are always good enough */ }
}

function setMeta(title, desc) {
  const base = SITE.meta.short;
  document.title = title && title !== base ? title + ' | ' + base : base + ' | ' + SITE.meta.theme[LANG === 'id' ? 'id' : 'en'];
  if (desc) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = desc;
  }
}

function showFatal(err) {
  try { console.error('[B-ICON]', err); } catch (e) { /* ignore */ }
  if (!ROOT) return;
  ROOT.innerHTML = '<div style="min-height:70vh;display:grid;place-items:center;padding:32px;text-align:center;font-family:system-ui,sans-serif;color:#1B0B4D"><div style="max-width:520px"><h1 style="font-size:26px;margin:0 0 10px">B-ICON 2026</h1><p style="color:#555;line-height:1.6;margin:0 0 20px">' + esc(L('This page could not be displayed. Please reload it. If the problem continues, write to ', 'Halaman ini tidak dapat ditampilkan. Silakan muat ulang. Jika masalah berlanjut, hubungi ')) + '<a href="mailto:' + esc((SITE.meta.contact || {}).email || '') + '">' + esc((SITE.meta.contact || {}).email || '') + '</a>.</p><button type="button" onclick="location.reload()" style="background:#FF7A1A;color:#fff;border:0;border-radius:999px;padding:12px 26px;font-weight:700;font-size:15px;cursor:pointer">' + esc(L('Reload', 'Muat ulang')) + '</button></div></div>';
}

(async function boot() {
  if (!ROOT || !SITE) { if (ROOT) showFatal(new Error('site data missing')); return; }
  try {
    await loadOverrides();
    const slug = detectSlug();
    const page = PAGES[slug]();
    setMeta(page.title, page.desc);
    mountShell(slug, page.main);
    document.documentElement.classList.add('bicon-ready');
    ROOT.addEventListener('click', (e) => { const c = e.target.closest('[data-copy]'); if (c) copyText(c.dataset.copy); });
    if (page.init) await page.init();
    if (location.hash && location.hash.length > 1 && !/^#poster=/.test(location.hash)) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(() => el.scrollIntoView(), 60);
    }
  } catch (err) { showFatal(err); }
})();

})();
