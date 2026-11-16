// Shared helpers: DOM, formatting, catalogue access, URLs, small persistent stores.

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export const ICON = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0l1.9 5.8H16l-4.9 3.6 1.9 5.8L8 11.6l-4.9 3.6 1.9-5.8L0 5.8h6.1z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h13l-4-4M17 17H4l4 4"/></svg>',
  cash: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  // side-on sneaker, used by the add-to-bag button and empty states
  shoe: '<svg class="shoe" viewBox="0 0 52 24" aria-hidden="true"><path d="M3 19.5V11c0-1.6.6-3.2 1.6-4.4L6 5l3.4 2.2c1.6 1 3.7.8 5-.5L17 4l2.6.4c1.5 3.4 5.6 6.3 10.7 7.6l11 2.7c4.2 1 6.7 2.7 6.7 4.8H3Z" fill="currentColor" stroke="none"/><path d="M3 21.5h45" /><path d="M20.5 8.2l-2.3 2M23.6 10.4l-2.3 2M27 12.2l-2.2 2" stroke="var(--shoe-lace, #fff)" stroke-width="1.4"/></svg>',
};

/* ---------- catalogue ---------- */

export const catalog = { products: [], collections: [], byHandle: new Map(), byCollection: new Map(), cdn: '', store: '' };

export async function loadCatalog() {
  const [cat, home] = await Promise.all([
    fetch('data/catalog.json').then((r) => r.json()),
    fetch('data/home.json').then((r) => r.json()),
  ]);
  Object.assign(catalog, cat);
  cat.products.forEach((p, i) => {
    p.i = i;
    p.inStock = p.v.some((v) => v.ok);
    p.title = p.line ? `${p.line} ${p.name}` : p.name;
    catalog.byHandle.set(p.h, p);
  });
  cat.collections.forEach((c) => catalog.byCollection.set(c.h, c));
  const flag = (handle, key) => (catalog.byCollection.get(handle)?.p || []).forEach((i) => (cat.products[i][key] = true));
  flag('new-drops', 'isNew');
  flag('best-sellers', 'isBest');
  return home;
}

export const product = (h) => catalog.byHandle.get(h);
export const collection = (h) => catalog.byCollection.get(h);
export const collectionProducts = (h) => (collection(h)?.p || []).map((i) => catalog.products[i]);

export const sizeLabel = (t) => t.replace(/^(Men|Women)\s*\/\s*/i, '').replace(/\s*\(.*\)$/, '');
export const genderLabel = (g) => ({ men: 'Men', women: 'Women', unisex: 'Unisex' }[g] || '');
export const catLabel = (c) => ({ footwear: 'Sneakers', slides: 'Slides', apparel: 'Apparel', accessories: 'Accessories' }[c] || c);
export const discount = (p) => (p.was ? Math.round((1 - p.price / p.was) * 100) : 0);

/* ---------- images ---------- */

const WIDTHS = [240, 360, 540, 720, 1080, 1600];
export const imgUrl = (file, w) => (/^(assets|https?:)/.test(file) ? file : `${catalog.cdn}${file}${file.includes('?') ? '&' : '?'}width=${w}`);
export const srcset = (file) => (/^(assets|https?:)/.test(file) ? '' : WIDTHS.map((w) => `${imgUrl(file, w)} ${w}w`).join(', '));
export function picture(file, { sizes = '100vw', alt = '', cls = '', eager = false, attrs = '' } = {}) {
  const set = srcset(file);
  return `<img class="${cls}" src="${esc(imgUrl(file, 720))}" ${set ? `srcset="${esc(set)}" sizes="${sizes}"` : ''} alt="${esc(alt)}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" ${attrs}>`;
}

/* ---------- URLs ---------- */

export const shopUrl = (c, extra = {}) => {
  const q = new URLSearchParams({ ...(c ? { c } : {}), ...extra });
  return `shop.html${q.size ? `?${q}` : ''}`;
};
export const productUrl = (h) => `product.html?h=${encodeURIComponent(h)}`;

const PAGE_ALIASES = { '/pages/analog-blue': 'baaz-analog-blue' };
/** Turn a live-store URL into its page on this site when one exists; otherwise leave it pointing at the store. */
export function localUrl(url = '') {
  let u;
  try { u = new URL(url, catalog.store || location.href); } catch { return url; }
  if (!/gullylabs\.com$/.test(u.hostname)) return url;
  const path = u.pathname.replace(/\/$/, '');
  if (PAGE_ALIASES[path]) return shopUrl(PAGE_ALIASES[path]);
  let m = path.match(/\/products\/([^/]+)$/);
  if (m && product(m[1])) return productUrl(m[1]);
  m = path.match(/^\/collections\/([^/]+)$/);
  if (m && collection(m[1])) return shopUrl(m[1]);
  if (path === '' || path === '/') return './';
  return url;
}
export const isExternal = (url) => /^https?:/.test(url);
export const linkAttrs = (url) => (isExternal(url) ? `href="${esc(url)}" target="_blank" rel="noopener"` : `href="${esc(url)}"`);

/* ---------- tiny persistent stores ---------- */

function persisted(key, fallback) {
  let value = fallback;
  try { value = JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { /* private mode: stay in memory */ }
  const subs = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
      subs.forEach((fn) => fn(value));
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export const saved = persisted('gl.saved', []);
export const recent = persisted('gl.recent', []);
export const cartStore = persisted('gl.cart', []);

export const isSaved = (h) => saved.get().includes(h);
export function toggleSaved(h) {
  const list = saved.get();
  saved.set(list.includes(h) ? list.filter((x) => x !== h) : [h, ...list]);
  return isSaved(h);
}
export function pushRecent(h) {
  recent.set([h, ...recent.get().filter((x) => x !== h)].slice(0, 12));
}
