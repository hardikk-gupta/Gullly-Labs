// Gully Labs shop — boot, page chrome, client-side routing with view transitions, search.
// Pages are real URLs (index.html, shop.html, product.html) that all load this app, so links work with or without JS routing.

import { $, $$, esc, money, ICON, loadCatalog, catalog, localUrl, linkAttrs, shopUrl, productUrl, picture, saved, reducedMotion, product, genderLabel } from './lib.js';
import { initReveal, initSplit, initRails, initPointerFx, initRipple, watchImages, initSegments } from './motion.js';
import { initCards, initLayers, openLayer, closeLayer, layerOpen } from './components.js';
import { initBag } from './cart.js';
import { homeView } from './home.js';
import { plpView, searchProducts } from './plp.js';
import { pdpView } from './pdp.js';

const NAV = [
  { label: 'New', c: 'new-drops' },
  { label: 'Men', c: 'men' },
  { label: 'Women', c: 'women' },
  { label: 'Sneakers', c: 'all-shoe' },
  { label: 'Slides', c: 'slides' },
  { label: 'Apparel', c: 'apparel' },
  { label: 'Bestsellers', c: 'best-sellers' },
];
const SOCIAL = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
};
const socialKey = (label) => (/twitter|^x/i.test(label) ? 'x' : label.toLowerCase().split(' ')[0]);

let home;
let view = null;
const main = $('[data-main]');

/* ---------- chrome ---------- */

function renderChrome() {
  const ann = [...home.announcements, ...home.announcements, ...home.announcements];
  const items = ann.map((a) => `<a ${linkAttrs(localUrl(a.url))}>${esc(a.text.replace(/^✨\s*/, ''))}</a><i aria-hidden="true">✦</i>`).join('');
  $('[data-announcements]').innerHTML = `<div class="announcement__group">${items}</div><div class="announcement__group" aria-hidden="true">${items}</div>`;

  $$('[data-logo]').forEach((img) => (img.src = home.brand.logo));
  $$('[data-logo-light]').forEach((img) => (img.src = home.brand.logoFooter));
  $('[data-tagline]').textContent = home.brand.tagline;
  $('[data-year]').textContent = new Date().getFullYear();

  const story = home.nav.filter((n) => /story|store/i.test(n.label));
  $('[data-nav]').innerHTML = NAV.map((n) => `<li><a href="${shopUrl(n.c)}" data-nav-c="${n.c}"><span data-text="${esc(n.label)}">${esc(n.label)}</span></a></li>`).join('');
  $('[data-menu-nav]').innerHTML = NAV.map((n, i) => `<li style="--i:${i}"><a href="${shopUrl(n.c)}"><span>${esc(n.label)}</span><sup>${catalog.byCollection.get(n.c)?.p.length || ''}</sup></a></li>`).join('');
  $('[data-menu-more]').innerHTML =
    `<li><a href="${shopUrl('saved')}">Saved items</a></li>` +
    story.map((n) => `<li><a ${linkAttrs(n.url)}>${esc(n.label)}</a></li>`).join('');

  const social = home.social.map((s) => `<li><a href="${esc(s.url)}" aria-label="${esc(s.label)}" target="_blank" rel="noopener">${SOCIAL[socialKey(s.label)] || esc(s.label)}</a></li>`).join('');
  $$('[data-social]').forEach((el) => (el.innerHTML = social));

  $('[data-footer-cols]').innerHTML = home.footer.columns
    .map((c) => `<div><p class="footer__heading">${esc(c.title)}</p><ul>${c.links.map((l) => `<li><a ${linkAttrs(localUrl(l.url))}>${esc(l.label)}</a></li>`).join('')}</ul></div>`)
    .join('');

  const syncSaved = () => $('[data-saved-btn]').classList.toggle('has-items', saved.get().length > 0);
  saved.subscribe(syncSaved);
  syncSaved();
}

function initHeader() {
  const header = $('[data-header]');
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const hide = y > 400 && y > lastY + 4 && !layerOpen();
    if (hide) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y <= 400) header.classList.remove('is-hidden');
    document.documentElement.classList.toggle('header-hidden', header.classList.contains('is-hidden'));
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
}

/* ---------- search ---------- */

const POPULAR = [['New drops', 'new-drops'], ['Bestsellers', 'best-sellers'], ['Baaz', 'baaz-y2k'], ['Kara', 'kara'], ['Slides', 'slides'], ['Under ₹5,000', 'shoe-under-5000']];

function initSearch() {
  const layer = $('[data-layer="search"]');
  const input = $('[data-search-input]', layer);
  const out = $('[data-search-results]', layer);
  const form = $('[data-search-form]', layer);

  const idle = () => `
    <p class="search__label">Popular</p>
    <div class="search__chips">${POPULAR.filter(([, c]) => catalog.byCollection.has(c)).map(([l, c], i) => `<a class="chip" style="--i:${i}" href="${shopUrl(c)}">${esc(l)}</a>`).join('')}</div>`;

  const render = () => {
    const q = input.value.trim();
    if (q.length < 2) { out.innerHTML = idle(); return; }
    const hits = searchProducts(q);
    const cols = catalog.collections.filter((c) => c.t.toLowerCase().includes(q.toLowerCase())).slice(0, 4);
    if (!hits.length && !cols.length) {
      out.innerHTML = `<p class="search__none">Nothing for “${esc(q)}”. Try “Baaz”, “shacket” or “slides”.</p>${idle()}`;
      return;
    }
    out.innerHTML = `
      ${cols.length ? `<p class="search__label">Collections</p><div class="search__chips">${cols.map((c, i) => `<a class="chip" style="--i:${i}" href="${shopUrl(c.h)}">${esc(c.t)}</a>`).join('')}</div>` : ''}
      ${hits.length ? `
      <p class="search__label">Products <span>${hits.length}</span></p>
      <div class="search__grid">
        ${hits.slice(0, 8).map((p, i) => `
          <a class="hit" style="--i:${i}" href="${productUrl(p.h)}">
            <span class="hit__media media">${picture(p.imgs[0], { sizes: '(max-width: 767px) 30vw, 160px' })}</span>
            <span class="hit__copy"><span class="hit__sub">${esc([p.line, genderLabel(p.g)].filter(Boolean).join(' · '))}</span><span class="hit__name">${esc(p.name)}</span><span class="hit__price">${money(p.price)}</span></span>
          </a>`).join('')}
      </div>
      ${hits.length > 8 ? `<a class="link-arrow search__all" href="${shopUrl('', { q })}"><span>See all ${hits.length} results</span>${ICON.arrow}</a>` : ''}` : ''}`;
    watchImages(out);
  };

  input.addEventListener('input', render);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) navigate(new URL(shopUrl('', { q }), location.href));
  });
  layer.addEventListener('layer:open', () => { render(); input.select(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !layerOpen()) { e.preventDefault(); openLayer('search'); }
  });
}

/* ---------- router ---------- */

const routeOf = (url) => {
  const name = url.pathname.split('/').pop().replace(/\.html$/, '');
  if (name === 'shop') return 'plp';
  if (name === 'product') return 'pdp';
  if (name === '' || name === 'index') return 'home';
  return null;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const memory = (() => { try { return JSON.parse(sessionStorage.getItem('gl.scroll')) || {}; } catch { return {}; } })();
let currentKey = null; // the history entry the visible page belongs to (history.state has already moved on by popstate time)
const remember = () => {
  if (!currentKey) return;
  memory[currentKey] = { y: window.scrollY, ...(view?.snapshot?.() || {}) };
  try { sessionStorage.setItem('gl.scroll', JSON.stringify(memory)); } catch { /* ignore */ }
};

function build(url, restore) {
  const route = routeOf(url);
  if (route === 'plp') return plpView(url.searchParams, restore);
  if (route === 'pdp') return pdpView(url.searchParams, home);
  return homeView(home);
}

function show(url, restore) {
  view?.destroy?.();
  const next = build(url, restore);
  document.title = next.title;
  main.innerHTML = next.html;
  main.dataset.route = routeOf(url);
  const mounted = next.mount(main, restore);
  view = typeof mounted === 'function' ? { destroy: mounted } : mounted || {};
  initSplit(main);
  initRails(main);
  initSegments(main);
  initReveal(main);
  watchImages(main);

  const c = routeOf(url) === 'plp' ? url.searchParams.get('c') : '';
  $$('[data-nav-c]').forEach((a) => a.classList.toggle('is-current', a.dataset.navC === c));
}

let navToken = 0;
async function navigate(url, { mode = 'push', source = null } = {}) {
  const token = ++navToken;
  const fromRoute = main.dataset.route;
  const toRoute = routeOf(url);
  const fromHandle = fromRoute === 'pdp' ? new URLSearchParams(location.search).get('h') : null;

  remember();
  closeLayer(true);
  if (mode === 'push') history.pushState({ k: uid() }, '', url);
  else if (mode === 'replace') history.replaceState(history.state, '', url);
  currentKey = history.state?.k || currentKey;
  const restore = mode === 'pop' ? memory[currentKey] : null;

  // Shared element: the tapped card's image grows into the product hero (and shrinks back on return).
  const card = source?.closest?.('[data-card]');
  let named = null;
  if (toRoute === 'pdp' && card && fromRoute !== 'pdp') {
    named = $('.card__img.is-on', card) || $('.card__img', card);
    if (named) named.style.viewTransitionName = 'product-hero';
  }

  const swap = () => {
    show(url, restore);
    if (mode === 'replace') return;
    window.scrollTo(0, restore?.y || 0);
    if (mode === 'pop' && fromHandle && toRoute !== 'pdp') {
      const back = $$(`[data-card][data-h="${CSS.escape(fromHandle)}"] .card__img`, main).find((img) => { const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
      if (back) { back.style.viewTransitionName = 'product-hero'; named = back; }
    }
  };

  const bar = $('[data-progress]');
  bar.classList.remove('is-on'); void bar.offsetWidth; bar.classList.add('is-on');

  if (document.startViewTransition && !reducedMotion && mode !== 'replace') {
    document.documentElement.dataset.nav = mode === 'pop' ? 'back' : 'forward';
    const t = document.startViewTransition(swap);
    try { await t.finished; } catch { /* skipped */ }
    if (named) named.style.viewTransitionName = '';
    if (token === navToken) delete document.documentElement.dataset.nav;
  } else {
    if (named) named.style.viewTransitionName = '';
    swap();
  }
  if (mode !== 'replace') main.focus({ preventScroll: true });
}

function initRouter() {
  history.scrollRestoration = 'manual';
  if (!history.state?.k) history.replaceState({ k: uid() }, '', location.href);
  currentKey = history.state.k;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || routeOf(url) === null) return;
    e.preventDefault();
    if (url.href === location.href) { closeLayer(); window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); return; }
    navigate(url, { mode: a.hasAttribute('data-replace') ? 'replace' : 'push', source: a });
  });

  window.addEventListener('popstate', () => navigate(new URL(location.href), { mode: 'pop' }));
  window.addEventListener('pagehide', remember);
}

/* ---------- boot ---------- */

async function boot() {
  const started = performance.now();
  home = await loadCatalog();
  renderChrome();
  initLayers();
  initCards();
  initBag();
  initHeader();
  initSearch();
  initRouter();
  initPointerFx();
  initRipple();

  const restore = memory[history.state?.k];
  show(new URL(location.href), restore);
  if (restore?.y) window.scrollTo(0, restore.y);

  // Let the intro read for a beat on the first visit of a session, then lift the curtain.
  const root = document.documentElement;
  const hasIntro = !root.classList.contains('no-intro');
  const wait = hasIntro ? Math.max(0, 900 - (performance.now() - started)) : 0;
  setTimeout(() => {
    root.classList.add('is-ready');
    try { sessionStorage.setItem('gl.intro', '1'); } catch { /* ignore */ }
    setTimeout(() => $('.intro')?.remove(), 1200);
  }, wait);
}

boot().catch((err) => {
  console.error(err);
  document.documentElement.classList.add('is-ready', 'no-intro');
  main.innerHTML = '<div class="container empty empty--page"><p class="empty__title">Something went wrong loading the shop</p><p class="empty__text">Please refresh, or visit <a href="https://gullylabs.com">gullylabs.com</a>.</p></div>';
});
