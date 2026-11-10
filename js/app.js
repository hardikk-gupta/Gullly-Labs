// Gully Labs homepage — renders every section from data/home.json.
// Edit content in the JSON; edit look & motion in css/styles.css and below.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const price = (p) => (p || '').replace(/\.00$/, '');

const ICONS = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0l1.9 5.8H16l-4.9 3.6 1.9 5.8L8 11.6l-4.9 3.6 1.9-5.8L0 5.8h6.1z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h13l-4-4M17 17H4l4 4"/></svg>',
  cash: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
};
const SOCIAL_ICONS = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
};
const socialKey = (label) => (/twitter|^x/i.test(label) ? 'x' : label.toLowerCase().split(' ')[0]);

/* ---------- section renderers ---------- */

function banner(s) {
  return `
  <section class="banner ${s.hero ? 'banner--hero' : ''}" data-reveal>
    <a class="banner__link" href="${esc(s.url)}" aria-label="${esc(s.alt || 'Shop the collection')}">
      <picture>
        <source media="(max-width: 767px)" srcset="${esc(s.mobile)}">
        <img src="${esc(s.desktop)}" alt="${esc(s.alt)}" ${s.hero ? 'fetchpriority="high"' : 'loading="lazy"'} data-parallax>
      </picture>
    </a>
  </section>`;
}

function productCard(p) {
  const [img1, img2] = p.images;
  const badges = p.badges.map((b) => `<span class="badge ${/new/i.test(b) ? 'badge--new' : ''}">${esc(b)}</span>`).join('');
  const sale = p.compareAt ? `<s class="card__compare">${esc(price(p.compareAt))}</s>` : '';
  const rating = p.rating
    ? `<span class="card__rating" title="${p.rating.count} reviews">${ICONS.star}${p.rating.score.toFixed(1)}<span class="hide-mobile"> · ${p.rating.count}</span></span>`
    : '';
  const sizes = p.sizes.length
    ? `<div class="card__sizes">${p.sizes.map((s) => `<a href="${esc(p.url)}">${esc(s.replace('UK ', ''))}</a>`).join('')}</div>`
    : '';
  return `
  <article class="card" data-reveal>
    <div class="card__media">
      <a href="${esc(p.url)}" tabindex="-1" aria-hidden="true">
        <img class="card__img" src="${esc(img1)}" alt="" loading="lazy">
        ${img2 ? `<img class="card__img card__img--alt" src="${esc(img2)}" alt="" loading="lazy">` : ''}
      </a>
      <div class="card__badges">${badges}</div>
      ${rating}
      ${sizes}
    </div>
    <div class="card__info">
      <a class="card__title" href="${esc(p.url)}">${esc(p.title)}</a>
      <span class="card__price">${sale}<span class="${p.compareAt ? 'is-sale' : ''}">${esc(price(p.price))}</span></span>
    </div>
  </article>`;
}

function railControls() {
  return `<div class="rail-controls">
      <button class="round-btn" data-rail-prev aria-label="Previous">${ICONS.prev}</button>
      <button class="round-btn" data-rail-next aria-label="Next">${ICONS.next}</button>
    </div>`;
}

function products(s) {
  const tabs = s.tabs
    ? `<div class="tabs" role="tablist">${s.tabs
        .map((t, i) =>
          i === 0
            ? `<span class="tab is-active" role="tab" aria-selected="true">${esc(t)}</span>`
            : `<a class="tab" href="https://gullylabs.com/collections/${t.toLowerCase() === 'apparel' ? 'apparel' : t.toLowerCase() === 'slides' ? 'slides' : 'all-accessories'}">${esc(t)}</a>`
        )
        .join('')}</div>`
    : '';
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <div><h2 class="section__title" data-split>${esc(s.title)}</h2>${tabs}</div>
      ${railControls()}
    </div>
    <div class="rail" data-rail>${s.products.map(productCard).join('')}</div>
    ${s.viewAll ? `<div class="container section__foot"><a class="btn btn--outline" href="${esc(s.viewAll)}">View all ${ICONS.arrow}</a></div>` : ''}
  </section>`;
}

function collections(s) {
  const grid = s.items.length <= 4;
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <h2 class="section__title section__title--caps" data-split>${esc(s.title)}</h2>
      ${grid ? '' : railControls()}
    </div>
    <div class="${grid ? 'container coll-grid' : 'rail rail--wide'}" ${grid ? '' : 'data-rail'}>
      ${s.items
        .map(
          (c) => `
        <a class="coll" href="${esc(c.url)}" data-reveal>
          <img src="${esc(c.image)}" alt="" loading="lazy">
          <span class="coll__shade"></span>
          <span class="coll__text">
            <span class="coll__title">${esc(c.title)}${c.count ? `<sup>${c.count}</sup>` : ''}</span>
            ${c.subtitle ? `<span class="coll__sub">${esc(c.subtitle)}</span>` : ''}
          </span>
          <span class="coll__arrow">${ICONS.arrow}</span>
        </a>`
        )
        .join('')}
    </div>
  </section>`;
}

function lookbook(s) {
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <h2 class="section__title" data-split>${esc(s.title)}</h2>
      ${railControls()}
    </div>
    <div class="rail rail--looks" data-rail>
      ${s.looks
        .map(
          (l) => `
        <figure class="look" data-reveal>
          <img class="look__img" src="${esc(l.image)}" alt="" loading="lazy">
          <figcaption class="look__products">
            ${l.products
              .map(
                (p) => `
              <a class="look__item" href="${esc(p.url)}">
                <img src="${esc(p.image)}" alt="" loading="lazy">
                <span><span class="look__name">${esc(p.title)}</span>${p.price ? `<span class="look__price">${esc(price(p.price))}</span>` : ''}</span>
              </a>`
              )
              .join('')}
          </figcaption>
        </figure>`
        )
        .join('')}
    </div>
  </section>`;
}

function testimonials(s) {
  return `
  <section class="section testimonials" data-testimonials>
    <div class="container">
      <div class="testimonials__stage" aria-live="polite">
        ${s.items
          .map(
            (t, i) => `
          <blockquote class="quote ${i === 0 ? 'is-active' : ''}">
            <p>“${esc(t.quote)}”</p>
            <cite>— ${esc(t.author)}</cite>
          </blockquote>`
          )
          .join('')}
      </div>
      <div class="dots" role="tablist">
        ${s.items.map((_, i) => `<button class="dot ${i === 0 ? 'is-active' : ''}" aria-label="Review ${i + 1}" data-dot="${i}"></button>`).join('')}
      </div>
    </div>
  </section>`;
}

function features(s) {
  const icons = [ICONS.globe, ICONS.bolt, ICONS.swap, ICONS.cash];
  return `
  <section class="features">
    <div class="container features__grid">
      ${s.items
        .map(
          (f, i) => `
        <div class="feature" data-reveal>
          <span class="feature__icon">${icons[i % icons.length]}</span>
          <div><p class="feature__title">${esc(f.title)}</p><p class="feature__text">${esc(f.text)}</p></div>
        </div>`
        )
        .join('')}
    </div>
  </section>`;
}

const RENDERERS = { banner, products, collections, lookbook, testimonials, features };

/* ---------- chrome ---------- */

function renderChrome(d) {
  const ann = [...d.announcements, ...d.announcements];
  const items = ann.map((a) => `<a href="${esc(a.url)}">${esc(a.text)}</a><span aria-hidden="true">●</span>`).join('');
  $('[data-announcements]').innerHTML = `<div class="announcement__group">${items}</div><div class="announcement__group" aria-hidden="true">${items}</div>`;

  $('[data-logo]').src = d.brand.logo;
  $('[data-logo-footer]').src = d.brand.logoFooter;
  $('[data-tagline]').textContent = d.brand.tagline;
  $('[data-year]').textContent = new Date().getFullYear();

  const navHtml = d.nav.map((n) => `<li><a href="${esc(n.url)}">${esc(n.label)}</a></li>`).join('');
  $('[data-nav]').innerHTML = navHtml;
  $('[data-drawer-nav]').innerHTML = navHtml;

  const social = d.social
    .map((s) => `<li><a href="${esc(s.url)}" aria-label="${esc(s.label)}" target="_blank" rel="noopener">${SOCIAL_ICONS[socialKey(s.label)] || esc(s.label)}</a></li>`)
    .join('');
  $('[data-social]').innerHTML = social;
  $('[data-drawer-social]').innerHTML = social;

  $('[data-footer-cols]').innerHTML = d.footer.columns
    .map(
      (c) => `<div><p class="footer__heading">${esc(c.title)}</p><ul>${c.links
        .map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`)
        .join('')}</ul></div>`
    )
    .join('');
}

/* ---------- behaviour ---------- */

function initHeader() {
  const header = $('[data-header]');
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 10);
      header.classList.toggle('is-hidden', y > 300 && y > lastY && !document.body.classList.contains('menu-open'));
      lastY = y;
    },
    { passive: true }
  );

  const drawer = $('[data-drawer]');
  const openBtn = $('[data-menu-open]');
  const setOpen = (open) => {
    drawer.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) $('.drawer__close', drawer).focus();
    else openBtn.focus();
  };
  openBtn.addEventListener('click', () => setOpen(true));
  $$('[data-menu-close]', drawer).forEach((el) => el.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !drawer.hidden && setOpen(false));
}

function initRails() {
  $$('[data-rail-root]').forEach((root) => {
    const rail = $('[data-rail]', root);
    if (!rail) return;
    const prev = $('[data-rail-prev]', root);
    const next = $('[data-rail-next]', root);
    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) * 2;
    const update = () => {
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // drag to scroll with a mouse
    let down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => { down = false; rail.classList.remove('is-dragging'); });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('dragstart', (e) => e.preventDefault());
  });
}

function initTestimonials() {
  const root = $('[data-testimonials]');
  if (!root) return;
  const quotes = $$('.quote', root);
  const dots = $$('.dot', root);
  let i = 0, timer;
  const show = (n) => {
    i = (n + quotes.length) % quotes.length;
    quotes.forEach((q, k) => q.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.setAttribute('aria-selected', String(k === i)); });
  };
  const play = () => { if (!reducedMotion) timer = setInterval(() => show(i + 1), 5000); };
  dots.forEach((d) => d.addEventListener('click', () => { clearInterval(timer); show(+d.dataset.dot); play(); }));
  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', play);
  play();
}

function initReveal() {
  const els = $$('[data-reveal]');
  if (!document.documentElement.classList.contains('js-reveal')) return;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      }),
    { rootMargin: '0px 0px -8% 0px' }
  );
  // stagger siblings inside the same rail/grid
  els.forEach((el) => {
    const idx = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--d', `${Math.min(idx, 6) * 70}ms`);
    io.observe(el);
  });
}

function initSplitTitles() {
  if (reducedMotion) return;
  $$('[data-split]').forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words
      .map((w, i) => `<span class="split" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`)
      .join(' ');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { h.classList.add('is-in'); io.disconnect(); } });
    io.observe(h);
  });
}

function initParallax() {
  if (reducedMotion) return;
  const imgs = $$('[data-parallax]');
  let ticking = false;
  const tick = () => {
    const vh = window.innerHeight;
    imgs.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      // banners have copy baked into the artwork, so keep the zoom subtle enough not to crop it
      img.style.transform = `translate3d(0, ${(p * -1.6).toFixed(2)}%, 0) scale(1.04)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  tick();
}

/* ---------- boot ---------- */

async function boot() {
  const res = await fetch('data/home.json');
  const data = await res.json();
  renderChrome(data);
  if (!reducedMotion && 'IntersectionObserver' in window) document.documentElement.classList.add('js-reveal');
  $('[data-sections]').innerHTML = data.sections.map((s) => (RENDERERS[s.type] ? RENDERERS[s.type](s) : '')).join('');
  initHeader();
  initRails();
  initTestimonials();
  initSplitTitles();
  initReveal();
  initParallax();
}

boot().catch((err) => {
  console.error(err);
  $('[data-sections]').innerHTML = '<p class="container" style="padding:4rem 0">Could not load content.</p>';
});
