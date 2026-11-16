// Home: campaign hero, live product rails, editorial banners, shop-the-look, collections, reviews.

import { $, $$, esc, money, ICON, localUrl, linkAttrs, collectionProducts, collection, shopUrl, productUrl, imgUrl, genderLabel, reducedMotion } from './lib.js';
import { can3d, heroLiquid, sneakerToken, productRing } from './three-fx.js';
import { productCard, productRail, railControls } from './components.js';
import { initSegments, moveIndicator, initReveal, watchImages, initParallax } from './motion.js';

const handleFromUrl = (url = '') => url.match(/\/collections\/([^/?#]+)/)?.[1] || '';

function hero(s) {
  const url = localUrl(s.url);
  return `
  <section class="hero">
    <a class="hero__link" ${linkAttrs(url)} aria-label="${esc(s.alt || 'Shop Baaz Analog Blue')}" data-cursor="Shop">
      <picture>
        <source media="(max-width: 767px)" srcset="${esc(s.mobile)}">
        <img src="${esc(s.desktop)}" alt="" fetchpriority="high" data-parallax>
      </picture>
    </a>
  </section>`;
}

function ticker(words) {
  const group = words.map((w) => `<span>${esc(w)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker__track"><div>${group}</div><div>${group}</div></div></div>`;
}

function banner(s) {
  const url = localUrl(s.url);
  return `
  <section class="banner" data-reveal>
    <a class="banner__link" ${linkAttrs(url)} aria-label="${esc(s.alt || 'Shop the collection')}" data-cursor="Shop">
      <picture>
        <source media="(max-width: 767px)" srcset="${esc(s.mobile)}">
        <img src="${esc(s.desktop)}" alt="" loading="lazy" data-parallax>
      </picture>
    </a>
  </section>`;
}

const TAB_COLLECTIONS = { sneakers: 'bestsellers-sneakers', slides: 'bestseller-slides', apparel: 'bestseller-apparel-accessories', accessories: 'all-accessories' };

function products(s) {
  const handle = handleFromUrl(s.viewAll);
  if (!s.tabs) return productRail(s.title, collectionProducts(handle).filter((p) => p.inStock).slice(0, 10), { viewAll: collection(handle) ? shopUrl(handle) : '' });
  const tabs = s.tabs.map((t) => ({ label: t, handle: TAB_COLLECTIONS[t.toLowerCase()] })).filter((t) => collection(t.handle));
  return `
  <section class="section" data-rail-root data-tabs>
    <div class="container section__head">
      <div>
        <h2 class="section__title" data-split>${esc(s.title)}</h2>
        <div class="seg" data-seg role="tablist" aria-label="${esc(s.title)}">
          ${tabs.map((t, i) => `<button type="button" role="tab" class="seg__item ${i === 0 ? 'is-active' : ''}" aria-selected="${i === 0}" data-tab="${esc(t.handle)}">${esc(t.label)}</button>`).join('')}
        </div>
      </div>
      <div class="section__tools">
        <a class="link-arrow hide-mobile" href="${shopUrl(tabs[0].handle)}" data-tab-link><span>View all</span>${ICON.arrow}</a>
        ${railControls()}
      </div>
    </div>
    <div class="rail" data-rail data-cursor="Drag">${tabRail(tabs[0].handle)}</div>
    <div class="container"><div class="rail-bar" data-rail-bar><i></i></div></div>
  </section>`;
}

const tabRail = (handle) =>
  collectionProducts(handle).filter((p) => p.inStock).slice(0, 10)
    .map((p) => productCard(p, { sizes: '(max-width: 767px) 62vw, (max-width: 1199px) 36vw, 23vw' })).join('');

function collections(s) {
  const grid = s.items.length <= 4;
  const tile = (c) => {
    const url = localUrl(c.url);
    const live = collection(handleFromUrl(c.url));
    const n = live ? live.p.length : c.count;
    return `
    <a class="tile" ${linkAttrs(url)} data-reveal>
      <span class="tile__media media"><img src="${esc(c.image)}" alt="" loading="lazy"></span>
      <span class="tile__shade"></span>
      <span class="tile__text">
        <span class="tile__title">${esc(c.title)}${n ? `<sup>${n}</sup>` : ''}</span>
        ${c.subtitle ? `<span class="tile__sub">${esc(c.subtitle)}</span>` : ''}
      </span>
      <span class="tile__arrow">${ICON.arrow}</span>
    </a>`;
  };
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <h2 class="section__title" data-split>${esc(s.title.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()))}</h2>
      ${grid ? '' : `<div class="section__tools">${railControls()}</div>`}
    </div>
    <div class="${grid ? 'container tile-grid' : 'rail rail--wide'}" ${grid ? '' : 'data-rail data-cursor="Drag"'}>${s.items.map(tile).join('')}</div>
    ${grid ? '' : '<div class="container"><div class="rail-bar" data-rail-bar><i></i></div></div>'}
  </section>`;
}

function lookbook(s) {
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <h2 class="section__title" data-split>${esc(s.title)}</h2>
      <div class="section__tools">${railControls()}</div>
    </div>
    <div class="rail rail--looks" data-rail data-cursor="Drag">
      ${s.looks.map((l) => `
        <figure class="look" data-reveal>
          <div class="look__media media"><img src="${esc(l.image)}" alt="" loading="lazy"></div>
          <figcaption class="look__products">
            ${l.products.map((p) => `
              <a class="look__item" ${linkAttrs(localUrl(p.url))}>
                <span class="look__thumb media"><img src="${esc(p.image)}" alt="" loading="lazy"></span>
                <span class="look__copy"><span class="look__name">${esc(p.title)}</span>${p.price ? `<span class="look__price">${esc(p.price.replace(/\.00$/, ''))}</span>` : ''}</span>
                <span class="look__go">${ICON.arrow}</span>
              </a>`).join('')}
          </figcaption>
        </figure>`).join('')}
    </div>
    <div class="container"><div class="rail-bar" data-rail-bar><i></i></div></div>
  </section>`;
}

function testimonials(s) {
  return `
  <section class="section reviews" data-reviews>
    <div class="container reviews__inner">
      <p class="eyebrow" data-reveal>From the community</p>
      <div class="reviews__stage" aria-live="polite">
        ${s.items.map((t, i) => `
          <blockquote class="quote ${i === 0 ? 'is-active' : ''}">
            <p>“${esc(t.quote)}”</p>
            <cite>${esc(t.author)}</cite>
          </blockquote>`).join('')}
      </div>
      <div class="reviews__nav">
        <button type="button" class="round-btn round-btn--light" data-review-prev aria-label="Previous review">${ICON.prev}</button>
        <span class="reviews__count"><span data-review-n>1</span> / ${s.items.length}</span>
        <button type="button" class="round-btn round-btn--light" data-review-next aria-label="Next review">${ICON.next}</button>
      </div>
    </div>
  </section>`;
}

function features(s) {
  const icons = [ICON.globe, ICON.bolt, ICON.swap, ICON.cash];
  return `
  <section class="features">
    <div class="container features__grid">
      ${s.items.map((f, i) => `
        <div class="feature" data-reveal>
          <span class="feature__icon">${icons[i % icons.length]}</span>
          <div><p class="feature__title">${esc(f.title)}</p><p class="feature__text">${esc(f.text)}</p></div>
        </div>`).join('')}
    </div>
  </section>`;
}

function band3d() {
  return `
  <section class="band3d ${can3d ? 'has-3d' : ''}">
    <div class="container"><div class="band3d__panel">
      <div class="band3d__copy">
        <p class="eyebrow" data-reveal>Sneakers made in India</p>
        <h2 class="band3d__title" data-split>Inspired by the streets</h2>
        <p class="band3d__text" data-reveal>Handcrafted sneakers, slides and apparel, built with the community.</p>
        <a class="btn btn--primary" href="${shopUrl('all-shoe')}" data-reveal data-magnetic><span class="btn__label">Shop sneakers</span>${ICON.arrow}</a>
      </div>
      ${can3d ? '<canvas class="band3d__canvas" data-token aria-hidden="true"></canvas><p class="band3d__hint" aria-hidden="true">Drag to spin</p>' : ''}
    </div></div>
  </section>`;
}

const ringItems = () => collectionProducts('bestsellers-sneakers').filter((p) => p.inStock).slice(0, 10);

function ring() {
  const items = ringItems();
  if (!can3d || items.length < 6) return '';
  return `
  <section class="section ring" data-ring>
    <div class="container section__head">
      <div>
        <p class="eyebrow" data-reveal>Bestselling sneakers, in the round</p>
        <h2 class="section__title" data-split>Spin the line-up</h2>
      </div>
      <div class="section__tools"><div class="rail-controls rail-controls--always">
        <button type="button" class="round-btn" data-ring-prev aria-label="Previous sneaker">${ICON.prev}</button>
        <button type="button" class="round-btn" data-ring-next aria-label="Next sneaker">${ICON.next}</button>
      </div></div>
    </div>
    <div class="ring__stage"><canvas class="ring__canvas" data-ring-canvas data-cursor="Drag" aria-hidden="true"></canvas></div>
    <div class="container ring__caption" aria-live="polite">
      <p class="ring__sub" data-ring-sub></p>
      <a class="ring__name" data-ring-link href="#"><span data-ring-name></span></a>
      <p class="ring__price" data-ring-price></p>
      <a class="btn btn--outline" data-ring-cta href="#"><span class="btn__label">View product</span>${ICON.arrow}</a>
    </div>
  </section>`;
}

const RENDER = { products, collections, lookbook, testimonials, features };

export function homeView(home) {
  let first = true;
  let rails = 0;
  const html = home.sections.map((s) => {
    if (s.type === 'banner') {
      if (first) { first = false; return hero(s) + ticker(['Sneakers made in India', 'Handcrafted', 'Inspired by the streets', 'Built with the community']); }
      return banner(s);
    }
    const out = RENDER[s.type]?.(s) || '';
    if (s.type !== 'products') return out;
    rails += 1;
    return out + (rails === 1 ? band3d() : rails === 2 ? ring() : '');
  }).join('');

  return {
    title: 'Gully Labs — Sneakers Made in India',
    html: `<div class="home">${html}</div>`,
    mount(root) {
      const stopParallax = initParallax(root);

      // bestseller tabs
      $$('[data-tabs]', root).forEach((wrap) => {
        const rail = $('[data-rail]', wrap);
        wrap.addEventListener('click', (e) => {
          const tab = e.target.closest('[data-tab]');
          if (!tab || tab.classList.contains('is-active')) return;
          $$('[data-tab]', wrap).forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', t === tab); });
          moveIndicator($('[data-seg]', wrap));
          $('[data-tab-link]', wrap).href = shopUrl(tab.dataset.tab);
          const swap = () => {
            rail.innerHTML = tabRail(tab.dataset.tab);
            rail.scrollLeft = 0;
            rail.classList.remove('is-swapping');
            initReveal(rail);
            watchImages(rail);
            rail.dispatchEvent(new Event('scroll'));
          };
          if (reducedMotion) return swap();
          rail.classList.add('is-swapping');
          setTimeout(swap, 220);
        });
      });

      // reviews
      const rev = $('[data-reviews]', root);
      let timer;
      if (rev) {
        const quotes = $$('.quote', rev);
        let i = 0;
        const show = (n) => {
          i = (n + quotes.length) % quotes.length;
          quotes.forEach((q, k) => q.classList.toggle('is-active', k === i));
          $('[data-review-n]', rev).textContent = i + 1;
        };
        const play = () => { clearInterval(timer); if (!reducedMotion) timer = setInterval(() => show(i + 1), 6000); };
        $('[data-review-prev]', rev).addEventListener('click', () => { show(i - 1); play(); });
        $('[data-review-next]', rev).addEventListener('click', () => { show(i + 1); play(); });
        rev.addEventListener('mouseenter', () => clearInterval(timer));
        rev.addEventListener('mouseleave', play);
        play();
      }

      initSegments(root);

      // 3D: each piece loads Three.js on demand and reports back a disposer
      const disposers = [];
      let alive = true;
      const keep = (promise) => promise.then((d) => { const fn = typeof d === 'function' ? d : d?.dispose; if (alive) disposers.push(fn); else fn?.(); return d; }).catch((err) => console.warn('3D skipped:', err));
      if (can3d) {
        const heroLink = $('.hero__link', root);
        if (heroLink) keep(heroLiquid(heroLink, $('img', heroLink)));
        const token = $('[data-token]', root);
        if (token) keep(sneakerToken(token));
        const ringEl = $('[data-ring]', root);
        if (ringEl) {
          const items = ringItems().map((p) => ({ p, image: imgUrl(p.imgs[0], 540) }));
          const link = $('[data-ring-link]', ringEl);
          keep(productRing($('[data-ring-canvas]', ringEl), items, {
            onFront: ({ p }) => {
              $('[data-ring-sub]', ringEl).textContent = [p.line, genderLabel(p.g)].filter(Boolean).join(' · ');
              $('[data-ring-name]', ringEl).textContent = p.name;
              $('[data-ring-price]', ringEl).textContent = '₹' + p.price.toLocaleString('en-IN');
              link.href = $('[data-ring-cta]', ringEl).href = productUrl(p.h);
              const cap = $('.ring__caption', ringEl);
              cap.classList.remove('is-swap'); void cap.offsetWidth; cap.classList.add('is-swap');
            },
            onOpen: () => link.click(),
          })).then((api) => {
            if (!api?.next) return;
            $('[data-ring-prev]', ringEl).addEventListener('click', api.prev);
            $('[data-ring-next]', ringEl).addEventListener('click', api.next);
          });
        }
      }
      return () => { alive = false; disposers.forEach((d) => d?.()); stopParallax(); clearInterval(timer); };
    },
  };
}
