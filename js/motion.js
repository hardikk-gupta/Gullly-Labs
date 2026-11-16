// Motion & micro-interaction layer. Everything here degrades to "just show it" under reduced motion.

import { $, $$, esc, reducedMotion, finePointer, clamp, ICON } from './lib.js';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* ---------- image fade-in (replaces the shimmer placeholder once pixels are ready) ---------- */

document.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded'); }, true);
document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded', 'is-broken'); }, true);
export function watchImages(root = document) {
  $$('img', root).forEach((img) => { if (img.complete && img.naturalWidth) img.classList.add('is-loaded'); });
}

/* ---------- reveal on scroll, staggered per batch that enters together ---------- */

let revealObserver;
export function initReveal(root = document) {
  const els = $$('[data-reveal]:not(.is-visible)', root);
  if (reducedMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
  revealObserver ||= new IntersectionObserver(
    (entries) => {
      const batch = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      batch.forEach((e, i) => {
        e.target.style.setProperty('--d', `${Math.min(i, 10) * 55}ms`);
        e.target.classList.add('is-visible');
        revealObserver.unobserve(e.target);
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
  );
  els.forEach((el) => revealObserver.observe(el));
}

/* ---------- headings that rise word by word ---------- */

export function initSplit(root = document) {
  $$('[data-split]:not([data-split-done])', root).forEach((h) => {
    h.dataset.splitDone = '';
    if (reducedMotion) return;
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.innerHTML = text.split(/\s+/).map((w, i) => `<span class="split" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { h.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(h);
  });
}

/* ---------- horizontal rails: arrows, mouse drag, progress line ---------- */

export function initRails(root = document) {
  $$('[data-rail-root]:not([data-rail-done])', root).forEach((wrap) => {
    wrap.dataset.railDone = '';
    const rail = $('[data-rail]', wrap);
    if (!rail) return;
    const prev = $('[data-rail-prev]', wrap);
    const next = $('[data-rail-next]', wrap);
    const bar = $('[data-rail-bar]', wrap);
    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) * 2;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft >= max - 4;
      if (bar) {
        const visible = clamp(rail.clientWidth / rail.scrollWidth, 0.08, 1);
        bar.style.setProperty('--w', visible);
        bar.style.setProperty('--x', max > 0 ? (rail.scrollLeft / max) * (1 - visible) : 0);
        bar.hidden = max <= 4;
      }
    };
    prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(rail);
    update();

    let down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; rail.classList.add('is-dragging'); }
      if (moved) rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      rail.classList.remove('is-dragging');
    });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    rail.addEventListener('dragstart', (e) => e.preventDefault());
  });
}

/* ---------- segmented controls with a pill that slides to the active option ---------- */

export function moveIndicator(group) {
  const active = $('.is-active', group);
  let pill = $(':scope > .seg__pill', group);
  if (!pill) { pill = document.createElement('span'); pill.className = 'seg__pill'; pill.setAttribute('aria-hidden', 'true'); group.prepend(pill); }
  if (!active) { pill.style.opacity = 0; return; }
  pill.style.opacity = 1;
  pill.style.width = `${active.offsetWidth}px`;
  pill.style.height = `${active.offsetHeight}px`;
  pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}
export function initSegments(root = document) {
  $$('[data-seg]', root).forEach((g) => {
    moveIndicator(g);
    requestAnimationFrame(() => g.classList.add('is-ready'));
    if (!g.dataset.segDone) { g.dataset.segDone = ''; new ResizeObserver(() => moveIndicator(g)).observe(g); }
  });
}

/* ---------- magnetic buttons + cursor label (mouse only) ---------- */

export function initPointerFx() {
  if (!finePointer || reducedMotion) return;
  let magnet = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-magnetic]');
    if (magnet && magnet !== el) { magnet.style.transform = ''; magnet = null; }
    if (el) {
      magnet = el;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }, { passive: true });

  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span></span>';
  document.body.append(cursor);
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
  const loop = () => {
    x += (tx - x) * 0.22; y += (ty - y) * 0.22;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    const host = e.target.closest?.('[data-cursor]');
    const blocked = e.target.closest?.('button, .card__tray, .card__save');
    const label = host && !blocked ? host.dataset.cursor : '';
    if (label && !on) { x = tx; y = ty; }
    on = !!label;
    cursor.classList.toggle('is-on', on);
    if (label) cursor.firstElementChild.textContent = label;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => { on = false; cursor.classList.remove('is-on'); });
}

/* ---------- ink ripple on press ---------- */

export function initRipple() {
  if (reducedMotion) return;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('.btn, .chip, .size');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple';
    const d = Math.max(r.width, r.height) * 2;
    dot.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    el.append(dot);
    dot.addEventListener('animationend', () => dot.remove());
  }, { passive: true });
}

/* ---------- parallax for banner artwork ---------- */

export function initParallax(root = document) {
  if (reducedMotion) return () => {};
  const imgs = $$('[data-parallax]', root);
  if (!imgs.length) return () => {};
  let ticking = false;
  const tick = () => {
    const vh = window.innerHeight;
    imgs.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty('--py', `${(p * -2).toFixed(2)}%`);
    });
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  tick();
  return () => window.removeEventListener('scroll', onScroll);
}

/* ---------- fly a product thumbnail into the bag icon ---------- */

export function flyToBag(sourceEl) {
  const target = $('[data-bag-btn]');
  if (reducedMotion || !sourceEl || !target) { bumpBag(); return Promise.resolve(); }
  const from = sourceEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, 120);
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  const src = sourceEl.currentSrc || sourceEl.src;
  ghost.innerHTML = src ? `<img src="${esc(src)}" alt="">` : '';
  ghost.style.cssText = `left:${from.left + from.width / 2 - size / 2}px;top:${from.top + from.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const opts = { duration: 720, fill: 'forwards' };
  // x and y use different easings so the thumbnail travels along an arc
  ghost.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { ...opts, easing: 'cubic-bezier(0.3, 0, 0.7, 1)' });
  const inner = ghost.firstElementChild || ghost;
  const anim = inner.animate(
    [
      { transform: 'translateY(0) scale(0.6)', opacity: 0 },
      { transform: `translateY(${Math.min(dy * 0.2, -30) - 30}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translateY(${dy}px) scale(0.12)`, opacity: 0.9 },
    ],
    { ...opts, easing: 'cubic-bezier(0.5, 0, 0.6, 1)' }
  );
  return anim.finished.then(() => { ghost.remove(); bumpBag(); });
}

export function bumpBag() {
  const btn = $('[data-bag-btn]');
  if (!btn) return;
  btn.classList.remove('is-bump');
  void btn.offsetWidth;
  btn.classList.add('is-bump');
}

/* ---------- toast ---------- */

let toastTimer;
export function toast(message, action) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.innerHTML = `<span class="toast__tick">${ICON.check}</span><span>${esc(message)}</span>${action ? `<button class="toast__action" type="button">${esc(action.label)}</button>` : ''}`;
  if (action) $('.toast__action', el).addEventListener('click', () => { action.run(); el.classList.remove('is-on'); });
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 3200);
}

/* ---------- numbers that roll when they change ---------- */

export function rollNumber(el, value) {
  const text = String(value);
  if (el.dataset.value === text) return;
  const up = Number(text.replace(/\D/g, '')) >= Number((el.dataset.value || '0').replace(/\D/g, ''));
  el.dataset.value = text;
  if (reducedMotion || !el.textContent) { el.textContent = text; return; }
  el.textContent = text;
  el.animate(
    [{ transform: `translateY(${up ? 60 : -60}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 320, easing: EASE }
  );
}

/* ---------- FLIP-style reshuffle of a grid using view transitions ---------- */

export function shuffle(grid, update) {
  if (reducedMotion || !document.startViewTransition) { update(); return; }
  const inView = () => $$('.card', grid).filter((c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).slice(0, 24);
  const name = (cards) => cards.forEach((c) => (c.style.viewTransitionName = `card-${c.dataset.i}`));
  const clear = () => $$('.card', grid).forEach((c) => (c.style.viewTransitionName = ''));
  name(inView());
  document.documentElement.classList.add('vt-shuffle');
  const t = document.startViewTransition(() => { update(); name(inView()); });
  t.finished.finally(() => { clear(); document.documentElement.classList.remove('vt-shuffle'); });
}

/* ---------- focus trap for drawers / dialogs ---------- */

export function trapFocus(panel) {
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = $$('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])', panel).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  panel.addEventListener('keydown', onKey);
  return () => panel.removeEventListener('keydown', onKey);
}
