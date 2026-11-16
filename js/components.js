// Reusable pieces: product card (hover scrub, quick add, save), rails, overlay layers, the buy button.

import {
  $, $$, esc, money, ICON, picture, imgUrl, srcset, productUrl, product, sizeLabel, genderLabel, discount,
  isSaved, toggleSaved, reducedMotion, finePointer,
} from './lib.js';
import { flyToBag, toast, trapFocus } from './motion.js';
import { addToBag, openBag } from './cart.js';

/* ---------- product card ---------- */

export function badges(p) {
  const out = [];
  if (!p.inStock) out.push('<span class="badge badge--mute">Sold out</span>');
  else {
    if (p.was) out.push(`<span class="badge badge--sale">−${discount(p)}%</span>`);
    if (p.isNew) out.push('<span class="badge badge--new">New</span>');
    else if (p.isBest) out.push('<span class="badge">Bestseller</span>');
  }
  return out.join('');
}

export function priceHtml(p) {
  return p.was
    ? `<span class="price is-sale">${money(p.price)}</span><s class="price__was">${money(p.was)}</s>`
    : `<span class="price">${money(p.price)}</span>`;
}

export function productCard(p, { sizes = '(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw', eager = false } = {}) {
  const n = Math.min(p.imgs.length, 4);
  const sub = [p.line, genderLabel(p.g)].filter(Boolean).join(' · ');
  const oneSize = p.v.length === 1;
  const tray = oneSize
    ? ''
    : `<div class="card__tray" inert>
        <p class="card__tray-title">Quick add — pick a size</p>
        <div class="card__sizes">${p.v
          .map((v) => `<button type="button" class="size size--sm" data-quick="${v.id}" ${v.ok ? '' : 'disabled'} aria-label="${esc(sizeLabel(v.t))}${v.ok ? '' : ', sold out'}">${esc(sizeLabel(v.t).replace('UK ', ''))}</button>`)
          .join('')}</div>
      </div>`;
  return `
  <article class="card" data-card data-h="${esc(p.h)}" data-i="${p.i}" data-reveal>
    <div class="card__media media" ${n > 1 ? `data-scrub="${n}"` : ''}>
      <a class="card__link" href="${productUrl(p.h)}" aria-label="${esc(p.title)}" draggable="false">
        ${picture(p.imgs[0], { sizes, cls: 'card__img is-on', eager })}
      </a>
      <div class="card__badges">${badges(p)}</div>
      <button type="button" class="card__save ${isSaved(p.h) ? 'is-on' : ''}" data-save="${esc(p.h)}" aria-pressed="${isSaved(p.h)}" aria-label="Save ${esc(p.title)}">${ICON.heart}</button>
      ${n > 1 ? `<div class="card__dots" aria-hidden="true">${'<i></i>'.repeat(n)}</div>` : ''}
      ${p.inStock ? `<button type="button" class="card__add" ${oneSize ? `data-quick="${p.v[0].id}"` : 'data-tray'} aria-label="Quick add ${esc(p.title)}"><span class="card__add-icon">${ICON.plus}</span><span class="card__add-label">Quick add</span></button>` : ''}
      ${p.inStock ? tray : ''}
    </div>
    <a class="card__info" href="${productUrl(p.h)}" tabindex="-1" draggable="false">
      <span class="card__sub">${esc(sub)}</span>
      <span class="card__name">${esc(p.name)}</span>
      <span class="card__price">${priceHtml(p)}</span>
    </a>
  </article>`;
}

export function railControls() {
  return `<div class="rail-controls">
    <button type="button" class="round-btn" data-rail-prev aria-label="Previous">${ICON.prev}</button>
    <button type="button" class="round-btn" data-rail-next aria-label="Next">${ICON.next}</button>
  </div>`;
}

export function productRail(title, items, { viewAll = '', eyebrow = '' } = {}) {
  if (!items.length) return '';
  return `
  <section class="section" data-rail-root>
    <div class="container section__head">
      <div>
        ${eyebrow ? `<p class="eyebrow" data-reveal>${esc(eyebrow)}</p>` : ''}
        <h2 class="section__title" data-split>${esc(title)}</h2>
      </div>
      <div class="section__tools">
        ${viewAll ? `<a class="link-arrow hide-mobile" href="${esc(viewAll)}"><span>View all</span>${ICON.arrow}</a>` : ''}
        ${railControls()}
      </div>
    </div>
    <div class="rail" data-rail data-cursor="Drag">${items.map((p) => productCard(p, { sizes: '(max-width: 767px) 62vw, (max-width: 1199px) 36vw, 23vw' })).join('')}</div>
    <div class="container"><div class="rail-bar" data-rail-bar><i></i></div></div>
    ${viewAll ? `<div class="container section__foot show-mobile"><a class="btn btn--outline" href="${esc(viewAll)}"><span class="btn__label">View all</span>${ICON.arrow}</a></div>` : ''}
  </section>`;
}

/* ---------- global card behaviour (delegated, so freshly rendered cards just work) ---------- */

function closeTrays(except) {
  $$('.card.is-tray').forEach((c) => {
    if (c === except) return;
    c.classList.remove('is-tray');
    $('.card__tray', c)?.setAttribute('inert', '');
  });
}

function scrubTo(media, index) {
  if (media.dataset.at === String(index)) return;
  media.dataset.at = index;
  $$('.card__img', media).forEach((img, i) => img.classList.toggle('is-on', i === index));
  $$('.card__dots i', media).forEach((dot, i) => dot.classList.toggle('is-on', i === index));
}

function ensureScrubImages(media) {
  if (media.dataset.ready) return;
  media.dataset.ready = '1';
  const p = product(media.closest('[data-card]').dataset.h);
  const link = $('.card__link', media);
  const sizes = $('.card__img', media).getAttribute('sizes') || '25vw';
  p.imgs.slice(1, +media.dataset.scrub).forEach((file) => {
    const img = new Image();
    img.className = 'card__img';
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.sizes = sizes;
    img.srcset = srcset(file);
    img.src = imgUrl(file, 720);
    link.append(img);
  });
}

export function initCards() {
  if (finePointer) {
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const media = e.target.closest?.('[data-scrub]');
      if (!media || media.closest('.is-dragging') || e.target.closest('.card__tray')) return;
      ensureScrubImages(media);
      const r = media.getBoundingClientRect();
      const n = +media.dataset.scrub;
      scrubTo(media, Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n))));
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const media = e.target.closest?.('[data-scrub]');
      if (media && !media.contains(e.relatedTarget)) scrubTo(media, 0);
      const card = e.target.closest?.('.card.is-tray');
      if (card && !card.contains(e.relatedTarget)) closeTrays();
    });
  }

  document.addEventListener('click', (e) => {
    const save = e.target.closest('[data-save]');
    if (save) {
      e.preventDefault();
      const on = toggleSaved(save.dataset.save);
      $$(`[data-save="${CSS.escape(save.dataset.save)}"]`).forEach((b) => { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      if (on) { save.classList.remove('is-pop'); void save.offsetWidth; save.classList.add('is-pop'); }
      toast(on ? 'Saved for later' : 'Removed from saved');
      return;
    }

    const trayBtn = e.target.closest('[data-tray]');
    if (trayBtn) {
      const card = trayBtn.closest('.card');
      const open = !card.classList.contains('is-tray');
      closeTrays(card);
      card.classList.toggle('is-tray', open);
      $('.card__tray', card)?.toggleAttribute('inert', !open);
      if (open) $('.card__tray button:not(:disabled)', card)?.focus({ preventScroll: true });
      return;
    }

    const quick = e.target.closest('[data-quick]');
    if (quick && !quick.disabled) {
      const card = quick.closest('[data-card]');
      const p = product(card.dataset.h);
      const v = p.v.find((x) => String(x.id) === quick.dataset.quick);
      addToBag(v.id, p.h);
      quick.classList.add('is-picked');
      const addBtn = $('.card__add', card);
      addBtn?.classList.add('is-done');
      setTimeout(() => { closeTrays(); quick.classList.remove('is-picked'); }, 420);
      setTimeout(() => addBtn?.classList.remove('is-done'), 1800);
      flyToBag($('.card__img.is-on', card) || $('.card__img', card));
      toast(`${p.name}${p.v.length > 1 ? ` · ${sizeLabel(v.t)}` : ''} added`, { label: 'View bag', run: openBag });
      return;
    }

    if (!e.target.closest('.card.is-tray')) closeTrays();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTrays(); });
}

/* ---------- overlay layers (menu, bag, filters, search, lightbox) ---------- */

let current = null;
let releaseTrap = null;
let lastFocus = null;

export function openLayer(name) {
  const el = $(`[data-layer="${name}"]`);
  if (!el || current === el) return el;
  if (current) closeLayer(true);
  lastFocus = document.activeElement;
  current = el;
  el.hidden = false;
  document.documentElement.classList.add('is-locked');
  void el.offsetWidth;
  el.classList.add('is-open');
  const panel = $('[data-layer-panel]', el) || el;
  releaseTrap = trapFocus(panel);
  const focusEl = $('[data-autofocus]', el) || $('button, a[href], input', panel);
  setTimeout(() => focusEl?.focus({ preventScroll: true }), 60);
  el.dispatchEvent(new CustomEvent('layer:open'));
  return el;
}

export function closeLayer(instant = false) {
  if (!current) return;
  const el = current;
  current = null;
  releaseTrap?.();
  el.classList.remove('is-open');
  document.documentElement.classList.remove('is-locked');
  el.dispatchEvent(new CustomEvent('layer:close'));
  const done = () => { if (current !== el) el.hidden = true; };
  if (instant || reducedMotion) done(); else setTimeout(done, 520);
  if (!instant) lastFocus?.focus?.({ preventScroll: true });
}

export const layerOpen = () => current?.dataset.layer || null;

export function initLayers() {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) { e.preventDefault(); openLayer(opener.dataset.open); return; }
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeLayer(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) closeLayer(); });
}

/* ---------- the buy button: a sneaker dashes across, then it confirms ---------- */

export function buyButton({ label, price = '', attrs = '', cls = '' }) {
  return `<button type="button" class="btn btn--primary buy ${cls}" ${attrs}>
    <span class="buy__idle"><span class="buy__label">${esc(label)}</span>${price ? `<span class="buy__price">${esc(price)}</span>` : ''}</span>
    <span class="buy__run" aria-hidden="true"><i></i><i></i><i></i>${ICON.shoe}</span>
    <span class="buy__done" aria-hidden="true">${ICON.check}<span>Added to bag</span></span>
  </button>`;
}

/** Plays the add animation and resolves when the sneaker has crossed the button. */
export function playBuy(btn) {
  if (btn.classList.contains('is-running')) return Promise.resolve(false);
  btn.classList.add('is-running');
  btn.setAttribute('aria-busy', 'true');
  const runFor = reducedMotion ? 0 : 620;
  return new Promise((resolve) => {
    setTimeout(() => {
      btn.classList.remove('is-running');
      btn.classList.add('is-done');
      btn.removeAttribute('aria-busy');
      resolve(true);
      setTimeout(() => btn.classList.remove('is-done'), 1700);
    }, runFor);
  });
}
