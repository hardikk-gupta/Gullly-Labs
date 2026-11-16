// Listing page: collection header, sticky toolbar, filter drawer, animated grid, incremental loading.

import { $, $$, esc, ICON, catalog, collection, collectionProducts, product, saved, shopUrl, sizeLabel, catLabel } from './lib.js';
import { productCard } from './components.js';
import { initReveal, watchImages, initSegments, moveIndicator, shuffle, rollNumber } from './motion.js';
import { closeLayer } from './components.js';

const PAGE = 24;
const PRICES = [
  ['u3', 'Under ₹3,000', 0, 2999],
  ['3-5', '₹3,000 – ₹5,000', 3000, 5000],
  ['5-8', '₹5,000 – ₹8,000', 5001, 8000],
  ['8+', 'Over ₹8,000', 8001, Infinity],
];
const SORTS = [['featured', 'Featured'], ['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low']];
const APPAREL_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const CATS = ['footwear', 'slides', 'apparel', 'accessories'];

export function searchProducts(q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return catalog.products
    .filter((p) => {
      const hay = `${p.title} ${catLabel(p.cat)} ${p.cat} ${p.g}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    })
    .sort((a, b) => b.inStock - a.inStock);
}

const sizeRank = (s) => {
  const uk = s.match(/^UK (\d+(?:\.\d+)?)/);
  if (uk) return Number(uk[1]);
  const i = APPAREL_ORDER.indexOf(s);
  return i >= 0 ? 100 + i : 999;
};

function readState(params) {
  return {
    c: params.get('c') || '',
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    g: params.get('g') || '',
    size: (params.get('size') || '').split(',').filter(Boolean),
    price: params.get('price') || '',
    stock: params.get('stock') === '1',
    sort: params.get('sort') || 'featured',
  };
}

function baseSet(s) {
  if (s.q) return { title: `“${s.q}”`, eyebrow: 'Search results', desc: '', items: searchProducts(s.q) };
  if (s.c === 'saved') return { title: 'Saved', eyebrow: 'Your list', desc: '', items: saved.get().map(product).filter(Boolean) };
  const c = collection(s.c) || collection('all-collections');
  return { title: c.t, eyebrow: 'Collection', desc: c.d, items: collectionProducts(c.h) };
}

export function plpView(params, restore) {
  const state = readState(params);
  const base = baseSet(state);
  const all = base.items;

  const cats = CATS.filter((c) => all.some((p) => p.cat === c));
  const hasGender = ['men', 'women'].every((g) => all.some((p) => p.g === g));
  const sizes = [...new Set(all.flatMap((p) => p.v.map((v) => sizeLabel(v.t))))].filter((s) => s !== 'One size').sort((a, b) => sizeRank(a) - sizeRank(b));
  const prices = PRICES.filter(([, , lo, hi]) => all.some((p) => p.price >= lo && p.price <= hi));
  if (!cats.includes(state.cat)) state.cat = '';
  if (!hasGender) state.g = '';

  const matches = (p, s = state, skip = '') =>
    (skip === 'cat' || !s.cat || p.cat === s.cat) &&
    (!s.g || p.g === s.g || p.g === 'unisex') &&
    (!s.size.length || p.v.some((v) => v.ok && s.size.includes(sizeLabel(v.t)))) &&
    (!s.price || (() => { const b = PRICES.find((x) => x[0] === s.price); return b && p.price >= b[2] && p.price <= b[3]; })()) &&
    (!s.stock || p.inStock);

  function results() {
    const list = all.filter((p) => matches(p));
    const by = {
      featured: (a, b) => b.inStock - a.inStock,
      new: (a, b) => b.date.localeCompare(a.date),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
    }[state.sort] || (() => 0);
    return [...list].sort(by);
  }

  const density = (() => { try { return localStorage.getItem('gl.density') || 'compact'; } catch { return 'compact'; } })();

  const html = `
  <div class="plp">
    <header class="plp__head container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a><span>/</span><a href="${shopUrl('all-collections')}">Shop</a><span>/</span><span aria-current="page">${esc(base.title)}</span></nav>
      <p class="eyebrow">${esc(base.eyebrow)}</p>
      <h1 class="plp__title"><span data-split>${esc(base.title)}</span><sup data-total>${all.length}</sup></h1>
      ${base.desc ? `<p class="plp__desc">${esc(base.desc)}</p>` : ''}
      ${cats.length > 1 ? `
      <div class="plp__cats"><div class="seg seg--lg" data-seg data-cats role="tablist" aria-label="Category">
        <button type="button" class="seg__item" data-cat="" role="tab">All<sup>${all.length}</sup></button>
        ${cats.map((c) => `<button type="button" class="seg__item" data-cat="${c}" role="tab">${catLabel(c)}<sup>${all.filter((p) => p.cat === c).length}</sup></button>`).join('')}
      </div></div>` : ''}
    </header>

    <div class="toolbar" data-toolbar>
      <div class="container toolbar__inner">
        <button type="button" class="chip chip--btn" data-open="filters">${ICON.filter}<span>Filters</span><b data-filter-n hidden></b></button>
        ${hasGender ? `
        <div class="seg seg--sm hide-mobile" data-seg data-gender aria-label="Gender">
          <button type="button" class="seg__item" data-g="">All</button>
          <button type="button" class="seg__item" data-g="men">Men</button>
          <button type="button" class="seg__item" data-g="women">Women</button>
        </div>` : ''}
        <div class="toolbar__active hide-mobile" data-active></div>
        <span class="toolbar__count"><span data-result-n></span> <span data-result-label>products</span></span>
        <label class="sort">
          <span class="sr-only">Sort by</span>
          <select data-sort>${SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          ${ICON.chevron}
        </label>
        <div class="density" role="group" aria-label="Grid density">
          <button type="button" data-density="comfy" aria-label="Larger tiles"><i></i><i></i></button>
          <button type="button" data-density="compact" aria-label="Smaller tiles"><i></i><i></i><i></i><i></i></button>
        </div>
      </div>
    </div>

    <div class="container plp__body">
      <div class="grid" data-grid data-density="${density}"></div>
      <div class="grid-more" data-more hidden><span class="spinner"></span></div>
      <div class="empty" data-empty hidden>
        <div class="empty__art">${ICON.shoe}</div>
        <p class="empty__title" data-empty-title></p>
        <p class="empty__text" data-empty-text></p>
        <div class="empty__actions">
          <button type="button" class="btn btn--primary" data-clear><span class="btn__label">Clear filters</span></button>
          <a class="btn btn--outline" href="${shopUrl('all-collections')}"><span class="btn__label">Shop everything</span></a>
        </div>
      </div>
    </div>
  </div>`;

  return {
    title: `${base.title.replace(/[“”]/g, '')} — Gully Labs`,
    html,
    mount(root) {
      const grid = $('[data-grid]', root);
      const more = $('[data-more]', root);
      const panel = $('[data-filters-body]');
      let list = [];
      let shown = 0;

      const activeCount = () => state.size.length + (state.price ? 1 : 0) + (state.stock ? 1 : 0) + (state.g ? 1 : 0);

      function syncUrl() {
        const q = new URLSearchParams();
        if (state.q) q.set('q', state.q); else if (state.c) q.set('c', state.c);
        if (state.cat) q.set('cat', state.cat);
        if (state.g) q.set('g', state.g);
        if (state.size.length) q.set('size', state.size.join(','));
        if (state.price) q.set('price', state.price);
        if (state.stock) q.set('stock', '1');
        if (state.sort !== 'featured') q.set('sort', state.sort);
        history.replaceState(history.state, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
      }

      function renderPanel() {
        const group = (title, body) => `<fieldset class="fgroup"><legend>${title}</legend><div class="fgroup__body">${body}</div></fieldset>`;
        const chip = (attr, value, label, on, n) => `<button type="button" class="chip ${on ? 'is-on' : ''}" ${attr}="${esc(value)}" aria-pressed="${on}" ${n === 0 && !on ? 'disabled' : ''}>${esc(label)}</button>`;
        const countIf = (patch) => all.filter((p) => matches(p, { ...state, ...patch })).length;
        panel.innerHTML = [
          hasGender ? group('Gender', [['', 'All'], ['men', 'Men'], ['women', 'Women']].map(([v, l]) => chip('data-f-g', v, l, state.g === v, 1)).join('')) : '',
          sizes.length ? group('Size', `<div class="fsizes">${sizes.map((s) => chip('data-f-size', s, s.replace('UK ', ''), state.size.includes(s), countIf({ size: [s] }))).join('')}</div><p class="fgroup__hint">${sizes.some((s) => s.startsWith('UK')) ? 'Shoe sizes are UK. Only sizes in stock are matched.' : 'Only sizes in stock are matched.'}</p>`) : '',
          prices.length > 1 ? group('Price', prices.map(([k, l]) => chip('data-f-price', k, l, state.price === k, countIf({ price: k }))).join('')) : '',
          group('Availability', `<label class="switch"><input type="checkbox" data-f-stock ${state.stock ? 'checked' : ''}><span class="switch__track"><i></i></span><span>In stock only</span></label>`),
        ].join('');
        const n = list.length;
        $('[data-filters-apply]').querySelector('.btn__label').textContent = n ? `Show ${n} product${n === 1 ? '' : 's'}` : 'No matches';
        $('[data-filters-clear]').disabled = !activeCount();
      }

      function renderChrome() {
        rollNumber($('[data-result-n]', root), list.length);
        $('[data-result-label]', root).textContent = list.length === 1 ? 'product' : 'products';
        const n = activeCount();
        const badge = $('[data-filter-n]', root);
        badge.hidden = !n; badge.textContent = n;
        $('[data-sort]', root).value = state.sort;

        $$('[data-cat]', root).forEach((b) => { const on = b.dataset.cat === state.cat; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
        $$('[data-g]', root).forEach((b) => b.classList.toggle('is-active', b.dataset.g === state.g));
        $$('[data-seg]', root).forEach(moveIndicator);

        const chips = [
          ...state.size.map((s) => [`size:${s}`, s]),
          ...(state.price ? [[`price`, PRICES.find((p) => p[0] === state.price)?.[1]]] : []),
          ...(state.stock ? [['stock', 'In stock']] : []),
        ];
        $('[data-active]', root).innerHTML =
          chips.map(([k, l]) => `<button type="button" class="chip chip--x" data-drop="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)}${ICON.close}</button>`).join('') +
          (chips.length > 1 ? '<button type="button" class="link-btn" data-clear>Clear all</button>' : '');
        renderPanel();
      }

      function fill(count) {
        const next = list.slice(shown, shown + count);
        grid.insertAdjacentHTML('beforeend', next.map((p, i) => productCard(p, { eager: shown === 0 && i < 4 })).join(''));
        shown += next.length;
        more.hidden = shown >= list.length;
        initReveal(grid);
        watchImages(grid);
      }

      function renderGrid(initial = PAGE) {
        grid.innerHTML = '';
        shown = 0;
        const empty = $('[data-empty]', root);
        empty.hidden = list.length > 0;
        if (!list.length) {
          more.hidden = true;
          const filtered = activeCount() || state.cat;
          $('[data-empty-title]', root).textContent = state.c === 'saved' && !filtered ? 'Nothing saved yet' : state.q && !filtered ? `No results for “${state.q}”` : 'No products match those filters';
          $('[data-empty-text]', root).textContent = state.c === 'saved' && !filtered ? 'Tap the heart on anything you like and it will wait for you here.' : filtered ? 'Try removing a filter or two.' : 'Check the spelling, or try a broader term like “Baaz” or “shirt”.';
          $('[data-clear]', empty).hidden = !filtered;
          return;
        }
        fill(Math.max(PAGE, initial));
      }

      function apply({ animate = true } = {}) {
        list = results();
        renderChrome();
        syncUrl();
        if (animate) shuffle(grid, () => renderGrid()); else renderGrid(restore?.shown);
      }

      const clear = () => { Object.assign(state, { size: [], price: '', stock: false, g: '', cat: '' }); apply(); };

      // page-level controls
      const onClick = (e) => {
        const cat = e.target.closest('[data-cat]');
        if (cat) { state.cat = cat.dataset.cat; return apply(); }
        const g = e.target.closest('[data-g]');
        if (g) { state.g = g.dataset.g; return apply(); }
        const drop = e.target.closest('[data-drop]');
        if (drop) {
          const [k, v] = drop.dataset.drop.split(':');
          if (k === 'size') state.size = state.size.filter((s) => s !== v);
          if (k === 'price') state.price = '';
          if (k === 'stock') state.stock = false;
          return apply();
        }
        if (e.target.closest('[data-clear]')) return clear();
        const d = e.target.closest('[data-density]');
        if (d && grid.dataset.density !== d.dataset.density) {
          try { localStorage.setItem('gl.density', d.dataset.density); } catch { /* ignore */ }
          shuffle(grid, () => { grid.dataset.density = d.dataset.density; setDensity(); });
        }
      };
      const setDensity = () => $$('[data-density]', $('.density', root)).forEach((b) => b.classList.toggle('is-active', b.dataset.density === grid.dataset.density));
      root.addEventListener('click', onClick);
      $('[data-sort]', root).addEventListener('change', (e) => { state.sort = e.target.value; apply(); });

      // filter drawer (lives in the page shell)
      const onPanelClick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.fG !== undefined) state.g = b.dataset.fG;
        else if (b.dataset.fSize) state.size = state.size.includes(b.dataset.fSize) ? state.size.filter((s) => s !== b.dataset.fSize) : [...state.size, b.dataset.fSize];
        else if (b.dataset.fPrice) state.price = state.price === b.dataset.fPrice ? '' : b.dataset.fPrice;
        else return;
        apply();
      };
      const onPanelChange = (e) => { if (e.target.matches('[data-f-stock]')) { state.stock = e.target.checked; apply(); } };
      const onApply = () => closeLayer();
      panel.addEventListener('click', onPanelClick);
      panel.addEventListener('change', onPanelChange);
      $('[data-filters-clear]').addEventListener('click', clear);
      $('[data-filters-apply]').addEventListener('click', onApply);

      // load more as the end of the grid approaches
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && shown < list.length) fill(PAGE); }, { rootMargin: '600px 0px' });
      io.observe(more);

      // toolbar shadow once it sticks
      const toolbar = $('[data-toolbar]', root);
      const stick = new IntersectionObserver(([e]) => toolbar.classList.toggle('is-stuck', e.intersectionRatio < 1), { threshold: 1, rootMargin: '-1px 0px 0px 0px' });
      stick.observe(toolbar);

      apply({ animate: false });
      setDensity();
      initSegments(root);

      return {
        snapshot: () => ({ shown }),
        destroy() {
          io.disconnect(); stick.disconnect();
          panel.removeEventListener('click', onPanelClick);
          panel.removeEventListener('change', onPanelChange);
          $('[data-filters-clear]').removeEventListener('click', clear);
          $('[data-filters-apply]').removeEventListener('click', onApply);
          panel.innerHTML = '';
        },
      };
    },
  };
}
