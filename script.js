/* ══════════════════════════════════════════════
   Samar Raj — MMA Prep Plan · script.js
   Production-ready · No external dependencies
════════════════════════════════════════════════ */

'use strict';

/* ── TAB / DAY SWITCHER ── */
function showDay(index, element) {
  document.querySelectorAll('.day-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('dp-' + index);
  if (panel) panel.classList.add('active');
  if (element) element.classList.add('active');

  // Persist last opened day
  try { localStorage.setItem('samar_last_day', index); } catch (_) {}
}

/* ── EXERCISE EXPAND / COLLAPSE ── */
function toggle(element) {
  element.classList.toggle('open');
}

/* ── RESTORE LAST OPENED DAY ON LOAD ── */
function restoreLastDay() {
  try {
    const saved = localStorage.getItem('samar_last_day');
    if (saved !== null) {
      const index = parseInt(saved, 10);
      const tab = document.querySelectorAll('.tab')[index];
      if (tab) showDay(index, tab);
    }
  } catch (_) {}
}

/* ── WEEK TRACKER ── */
function buildTracker() {
  const wrap = document.getElementById('tracker');
  if (!wrap) return;

  const labels = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'R'];
  const colors = [
    'var(--red)', 'var(--blue)', 'var(--green)',
    'var(--orange)', 'var(--teal)', 'var(--purple)', 'var(--muted)'
  ];

  let saved;
  try { saved = JSON.parse(localStorage.getItem('samar_week') || '[]'); }
  catch (_) { saved = []; }

  labels.forEach((label, i) => {
    const el = document.createElement('div');
    const isDone = saved.includes(i);
    el.className = 'tday' + (isDone ? ' done' : '');
    el.setAttribute('role', 'checkbox');
    el.setAttribute('aria-checked', isDone ? 'true' : 'false');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', i < 6 ? 'Day ' + (i + 1) : 'Rest day');

    el.innerHTML =
      '<span class="tday-n" style="color:' + (isDone ? 'var(--green)' : colors[i]) + '">' + label + '</span>' +
      '<span class="tday-l">' + (i < 6 ? 'Day ' + (i + 1) : 'Rest') + '</span>';

    const handleToggle = () => {
      el.classList.toggle('done');
      const done = el.classList.contains('done');
      el.setAttribute('aria-checked', done ? 'true' : 'false');
      el.querySelector('.tday-n').style.color = done ? 'var(--green)' : colors[i];

      try {
        let s = JSON.parse(localStorage.getItem('samar_week') || '[]');
        if (done) {
          if (!s.includes(i)) s.push(i);
        } else {
          s = s.filter(v => v !== i);
        }
        localStorage.setItem('samar_week', JSON.stringify(s));
      } catch (_) {}
    };

    el.addEventListener('click', handleToggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); }
    });

    wrap.appendChild(el);
  });
}

/* ── PWA: SERVICE WORKER REGISTRATION ── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('[SW] Registered, scope:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    });
  }
}

/* ── PWA: INSTALL PROMPT ── */
let deferredPrompt = null;

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPrompt = null;
    console.log('[PWA] App installed');
  });
}

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('role', 'status');
  banner.innerHTML =
    '<span>📲 Add to Home Screen for offline access</span>' +
    '<button id="pwa-install-btn" aria-label="Install app">Install</button>' +
    '<button id="pwa-dismiss-btn" aria-label="Dismiss install banner">✕</button>';

  document.body.appendChild(banner);

  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredPrompt = null;
    hideInstallBanner();
  });

  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    hideInstallBanner();
    try { sessionStorage.setItem('samar_pwa_dismissed', '1'); } catch (_) {}
  });
}

function hideInstallBanner() {
  const b = document.getElementById('pwa-install-banner');
  if (b) b.remove();
}

/* ── SCROLL ACTIVE TAB INTO VIEW ── */
function scrollActiveTabIntoView() {
  const active = document.querySelector('.tab.active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  restoreLastDay();
  buildTracker();
  setupInstallPrompt();
  registerSW();

  // Scroll active tab into view after small delay (layout settle)
  setTimeout(scrollActiveTabIntoView, 100);
});
