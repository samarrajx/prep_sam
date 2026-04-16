/* ══════════════════════════════════════════════
   Samar Raj — MMA Prep Plan · script.js
   Production-ready · No external dependencies
════════════════════════════════════════════════ */

'use strict';

/* ── SCROLL MEMORY ── */
const scrollMap = new Map();

/* ── HAPTICS ── */
function vibrateTap() {
  if (navigator.vibrate) try { navigator.vibrate(10); } catch (_) {}
}

/* ── SPA OVERVIEW ── */
function showOverview() {
  vibrateTap();
  document.querySelectorAll('.day-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  
  const panel = document.getElementById('overview-panel');
  if (panel) {
    panel.classList.add('active');
    // For PWA polish: ensure we start at the very top of the overview
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  exitFocusMode();
}

/* ── INTERACTIVE FOCUS MODE ── */
function enterFocusMode() {
  document.body.classList.add('focus-mode');
  vibrateTap();
}
function exitFocusMode() {
  document.body.classList.remove('focus-mode');
  vibrateTap();
}

/* ── TAB / DAY SWITCHER ── */
function showDay(index, element, source) {
  vibrateTap();
  exitFocusMode();

  // Save scroll position for currently active day before switching
  const currentTab = document.querySelector('.tab.active');
  if (currentTab) {
    const currentIndex = Array.from(document.querySelectorAll('.tab')).indexOf(currentTab);
    scrollMap.set(currentIndex, window.scrollY);
  }

  document.querySelectorAll('.day-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('dp-' + index);
  if (panel) panel.classList.add('active');
  
  // Sync Top Tabs
  const topTabs = document.querySelectorAll('.tab');
  if (topTabs[index]) topTabs[index].classList.add('active');

  // Sync Bottom Nav
  const bnavs = document.querySelectorAll('.bnav-item');
  if (bnavs[index]) bnavs[index].classList.add('active');

  // Persist last opened day
  try { localStorage.setItem('samar_last_day', index); } catch (_) {}

  // Restore scroll or go top
  if (scrollMap.has(index)) {
    window.scrollTo({ top: scrollMap.get(index), behavior: 'auto' });
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/* ── EXERCISE EXPAND / COLLAPSE ── */
function toggle(element) {
  vibrateTap();
  element.classList.toggle('open');
  if (element.classList.contains('open')) {
    enterFocusMode();
  }
}

/* ── AUTO-SELECT CURRENT DAY OR RESTORE ── */
function restoreLastDay() {
  try {
    const saved = localStorage.getItem('samar_last_day');
    if (saved !== null) {
      const index = parseInt(saved, 10);
      const tab = document.querySelectorAll('.tab')[index];
      if (tab) {
        showDay(index, tab);
        return;
      }
    }
    
    // Fallback: Pick today's day of the week
    const now = new Date();
    // getDay() is 0 (Sun) to 6 (Sat)
    // App index 0 is Mon, so we shift: (day + 6) % 7
    const todayIndex = (now.getDay() + 6) % 7;
    const todayTab = document.querySelectorAll('.tab')[todayIndex];
    if (todayTab) {
      // Don't vibrate on initial auto-select to avoid startle
      showDay(todayIndex, todayTab);
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
        .then(reg => {
          console.log('[SW] Registered, scope:', reg.scope);
          
          // Force update check on every load
          reg.update();

          // If a new worker is installed and waiting, notify or force reload
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[SW] New version activated. Reloading...');
                window.location.reload();
              }
            });
          });
        })
        .catch(err => console.warn('[SW] Registration failed:', err));

      // Listen for a message from the SW that it has claimed clients, just in case
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
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

/* ── COLLAPSIBLE SECTIONS ── */
function initCollapsibleSections() {

  // Helper — wire up a title → content collapse toggle
  function makeToggle(titleEl, contentEl, defaultCollapsed = true) {
    if (!titleEl || !contentEl) return;

    // Inject collapse arrow
    const arrow = document.createElement('span');
    arrow.className = 'collapse-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    titleEl.insertBefore(arrow, titleEl.firstChild);
    titleEl.style.cursor = 'pointer';
    titleEl.style.userSelect = 'none';

    contentEl.classList.add('collapsible-body');

    // Restore persisted state or use default
    const key = 'samar_collapse_' + titleEl.textContent.trim().substring(0, 30);
    let shouldCollapse = defaultCollapsed;
    try {
      const saved = localStorage.getItem(key);
      if (saved === '1') shouldCollapse = true;
      if (saved === '0') shouldCollapse = false;
    } catch (_) {}

    if (shouldCollapse) {
      contentEl.classList.add('is-collapsed');
      titleEl.classList.add('is-collapsed');
    }

    titleEl.addEventListener('click', () => {
      const collapsed = contentEl.classList.toggle('is-collapsed');
      titleEl.classList.toggle('is-collapsed', collapsed);
      try { localStorage.setItem(key, collapsed ? '1' : '0'); } catch (_) {}
    });
  }

  // 1. Major section titles → next sibling or wrapped content
  document.querySelectorAll('.section-title').forEach(title => {
    const parent = title.parentElement;
    let contentEl = null;

    if (parent.classList.contains('nutrition-section')) {
      // ONLY wrap nutri-note into collapsible div to keep macros visible!
      const wrapper = document.createElement('div');
      wrapper.className = 'section-body-wrap';
      const n = parent.querySelector('.nutri-note');
      if (n) wrapper.appendChild(n);
      parent.appendChild(wrapper);
      contentEl = wrapper;
    } else if (parent.classList.contains('tracker-wrap')) {
      contentEl = parent.querySelector('.tracker-grid');
    } else {
      contentEl = title.nextElementSibling;
    }

    makeToggle(title, contentEl, true); // DEFAULT CLOSED
  });

  // 2. Exercise group labels → collapse their exercises
  document.querySelectorAll('.group-label').forEach(label => {
    const group = label.parentElement;
    const exercises = Array.from(group.querySelectorAll(':scope > .ex'));
    if (!exercises.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'group-body-wrap';
    exercises.forEach(ex => wrapper.appendChild(ex));
    group.appendChild(wrapper);

    makeToggle(label, wrapper, false); // DEFAULT OPEN (To show exercises initially)
  });

  // 3. Cardio block titles → collapse the week breakdown
  document.querySelectorAll('.cardio-block').forEach(block => {
    const title = block.querySelector('.cardio-title');
    const weeks = block.querySelector('.cardio-weeks');
    makeToggle(title, weeks, true); // DEFAULT CLOSED
  });
}

/* ── THEME TOGGLE ── */
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem('samar_theme');
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('samar_theme', isLight ? 'light' : 'dark');
  });
}

/* ── SIDEBAR LOGIC ── */
function openSidebar() {
  vibrateTap();
  document.getElementById('app-sidebar').classList.add('active');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('app-sidebar').classList.remove('active');
  document.getElementById('sidebar-overlay').classList.remove('active');
  document.body.style.overflow = '';
}
function initSidebar() {
  const menuBtn = document.getElementById('menu-btn');
  const overlay = document.getElementById('sidebar-overlay');
  const closeBtn = document.getElementById('sidebar-close');

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  // Edge Swipe Right to Open Sidebar
  let sbStart = 0;
  document.addEventListener('touchstart', e => {
    if (e.changedTouches[0].clientX < 30) sbStart = e.changedTouches[0].screenX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (sbStart > 0 && e.changedTouches[0].screenX - sbStart > 50) openSidebar();
    sbStart = 0;
  }, { passive: true });
}

/* ── FOCUS MODE ── */
function initFocusMode() {
  // Focus mode is now triggered interactively via exercise tap.
}

/* ── PULL TO REFRESH ── */
function initPullToRefresh() {
  let touchStartPtr = 0;
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) touchStartPtr = e.touches[0].screenY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (window.scrollY === 0 && touchStartPtr > 0) {
      const touchEndPtr = e.changedTouches[0].screenY;
      if (touchEndPtr - touchStartPtr > 150) {
        vibrateTap();
        location.reload();
      }
    }
    touchStartPtr = 0;
  }, { passive: true });
}

/* ── SWIPE NAVIGATION ── */
function initSwipeNavigation() {
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 50;

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    // Only proceed if swipe is greater than threshold
    if (Math.abs(touchEndX - touchStartX) < swipeThreshold) return;

    // Don't swipe if trying to scroll horizontally inside an element like a table (if any existed)
    // Or if inside the tracker row
    
    // Find currently active day index
    const tabs = document.querySelectorAll('.tab');
    let currentIndex = -1;
    tabs.forEach((t, i) => { if (t.classList.contains('active')) currentIndex = i; });
    if (currentIndex === -1) return;

    if (touchEndX < touchStartX) {
      // Swiped Left — Go to Next Day
      if (currentIndex < tabs.length - 1) {
        showDay(currentIndex + 1, tabs[currentIndex + 1]);
        setTimeout(scrollActiveTabIntoView, 50);
      }
    }
    if (touchEndX > touchStartX) {
      // Swiped Right — Go to Previous Day
      if (currentIndex > 0) {
        showDay(currentIndex - 1, tabs[currentIndex - 1]);
        setTimeout(scrollActiveTabIntoView, 50);
      }
    }
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initFocusMode();
  initPullToRefresh();
  restoreLastDay();
  buildTracker();
  initCollapsibleSections();
  initSwipeNavigation();
  setupInstallPrompt();
  registerSW();

  // Scroll active tab into view after small delay (layout settle)
  setTimeout(scrollActiveTabIntoView, 100);
});
