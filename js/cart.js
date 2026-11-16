// Bag: lives in localStorage, renders the drawer, and hands off to the store's checkout with real variant ids.

import { $, $$, esc, money, ICON, cartStore, catalog, product, productUrl, shopUrl, picture, sizeLabel, genderLabel, reducedMotion } from './lib.js';
import { rollNumber, watchImages } from './motion.js';
import { openLayer } from './components.js';

const MAX_QTY = 10;

export function lines() {
  return cartStore.get()
    .map((l) => {
      const p = product(l.h);
      const v = p?.v.find((x) => x.id === l.id);
      return p && v ? { ...l, p, v } : null;
    })
    .filter(Boolean);
}
export const count = () => lines().reduce((n, l) => n + l.qty, 0);
export const subtotal = () => lines().reduce((n, l) => n + l.qty * l.p.price, 0);
export const checkoutUrl = () => `${catalog.store}/cart/${lines().map((l) => `${l.id}:${l.qty}`).join(',')}`;

export function addToBag(id, h, qty = 1) {
  const list = cartStore.get().map((l) => ({ ...l }));
  const hit = list.find((l) => l.id === id);
  if (hit) hit.qty = Math.min(MAX_QTY, hit.qty + qty);
  else list.unshift({ id, h, qty });
  lastAdded = id;
  cartStore.set(list);
}
export function setQty(id, qty) {
  cartStore.set(cartStore.get().map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)));
}
export function removeLine(id) {
  cartStore.set(cartStore.get().filter((l) => l.id !== id));
}

export const openBag = () => openLayer('bag');

let lastAdded = null;

function lineHtml(l) {
  const size = l.p.v.length > 1 ? sizeLabel(l.v.t) : '';
  return `
  <li class="line ${l.id === lastAdded ? 'is-new' : ''}" data-line="${l.id}">
    <a class="line__media media" href="${productUrl(l.p.h)}">${picture(l.p.imgs[0], { sizes: '96px' })}</a>
    <div class="line__body">
      <a class="line__name" href="${productUrl(l.p.h)}">${esc(l.p.name)}</a>
      <p class="line__meta">${esc([l.p.line, genderLabel(l.p.g), size].filter(Boolean).join(' · '))}</p>
      <div class="line__row">
        <div class="stepper" role="group" aria-label="Quantity">
          <button type="button" data-step="-1" aria-label="Decrease quantity" ${l.qty <= 1 ? 'disabled' : ''}>${ICON.minus}</button>
          <span class="stepper__n" aria-live="polite"><span data-qty>${l.qty}</span></span>
          <button type="button" data-step="1" aria-label="Increase quantity" ${l.qty >= MAX_QTY ? 'disabled' : ''}>${ICON.plus}</button>
        </div>
        <span class="line__price" data-line-price>${money(l.p.price * l.qty)}</span>
      </div>
    </div>
    <button type="button" class="line__remove" data-remove aria-label="Remove ${esc(l.p.name)}">${ICON.close}</button>
  </li>`;
}

function emptyHtml() {
  return `
  <div class="bag-empty">
    <div class="bag-empty__art">${ICON.shoe}</div>
    <p class="bag-empty__title">Your bag is empty</p>
    <p class="bag-empty__text">Nothing in here yet. Start with what just dropped.</p>
    <a class="btn btn--primary" href="${shopUrl('new-drops')}" data-close-on-nav><span class="btn__label">Shop new drops</span>${ICON.arrow}</a>
    <a class="btn btn--outline" href="${shopUrl('best-sellers')}" data-close-on-nav><span class="btn__label">Bestsellers</span></a>
  </div>`;
}

function renderBag() {
  const root = $('[data-bag]');
  if (!root) return;
  const items = lines();
  const n = count();

  $$('[data-bag-count]').forEach((el) => { rollNumber(el, n); el.parentElement.classList.toggle('has-items', n > 0); });
  $('[data-bag-btn]')?.setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`);
  $('[data-bag-title]').textContent = n ? `Bag (${n})` : 'Bag';

  const body = $('[data-bag-body]', root);
  const foot = $('[data-bag-foot]', root);
  foot.hidden = !items.length;
  if (!items.length) { body.innerHTML = emptyHtml(); lastAdded = null; return; }

  // Update in place when only quantities changed, so the stepper doesn't lose focus or re-animate.
  const existing = $$('[data-line]', body).map((el) => el.dataset.line).join();
  if (existing === items.map((l) => l.id).join()) {
    items.forEach((l) => {
      const row = $(`[data-line="${l.id}"]`, body);
      rollNumber($('[data-qty]', row), l.qty);
      $('[data-line-price]', row).textContent = money(l.p.price * l.qty);
      $('[data-step="-1"]', row).disabled = l.qty <= 1;
      $('[data-step="1"]', row).disabled = l.qty >= MAX_QTY;
    });
  } else {
    body.innerHTML = `<ul class="lines">${items.map(lineHtml).join('')}</ul>`;
    watchImages(body);
  }
  lastAdded = null;
  rollNumber($('[data-bag-subtotal]', root), money(subtotal()));
  $('[data-checkout]', root).href = checkoutUrl();
}

export function initBag() {
  const root = $('[data-bag]');
  root.addEventListener('click', (e) => {
    const row = e.target.closest('[data-line]');
    if (!row) return;
    const id = Number(row.dataset.line);
    const step = e.target.closest('[data-step]');
    if (step) {
      const line = lines().find((l) => l.id === id);
      if (line) setQty(id, line.qty + Number(step.dataset.step));
      return;
    }
    if (e.target.closest('[data-remove]')) {
      if (reducedMotion) { removeLine(id); return; }
      row.style.height = `${row.offsetHeight}px`;
      void row.offsetHeight;
      row.classList.add('is-leaving');
      setTimeout(() => removeLine(id), 340);
    }
  });
  cartStore.subscribe(renderBag);
  renderBag();
}
