// Product page: gallery + lightbox, size picker, the buy button, sticky buy bar, details, related rails.

import {
  $, $$, esc, money, ICON, catalog, product, picture, imgUrl, srcset, productUrl, shopUrl, sizeLabel, genderLabel, catLabel, discount,
  isSaved, pushRecent, recent, collection, reducedMotion, clamp,
} from './lib.js';
import { badges, productRail, buyButton, playBuy, openLayer, closeLayer } from './components.js';
import { flyToBag, toast, moveIndicator, initSegments, watchImages } from './motion.js';
import { addToBag, openBag } from './cart.js';

const CAT_COLLECTION = { footwear: 'all-shoe', slides: 'slides', apparel: 'apparel', accessories: 'all-accessories' };
const LINE_COLLECTION = [
  [/^gully number 001/i, 'gully-number-001'], [/^gully number 002/i, 'gully-number-002-the-vintage-trainers'],
  [/^gully number 003/i, 'gully-number-003'], [/^gully number 004/i, 'gully-number-004'],
  [/^gully number 005/i, 'gully-number-005-deluxe-chappal'], [/^kara/i, 'kara'], [/nivia/i, 'gully-labs-x-nivia'], [/jersey/i, 'jerseys'],
];
const lineCollection = (line) => { const hit = LINE_COLLECTION.find(([re]) => re.test(line)); return hit && collection(hit[1]) ? hit[1] : ''; };

function notFound() {
  return {
    title: 'Not found — Gully Labs',
    html: `<div class="container empty empty--page"><div class="empty__art">${ICON.shoe}</div><p class="empty__title">We couldn't find that product</p><p class="empty__text">It may have sold out for good or moved.</p><div class="empty__actions"><a class="btn btn--primary" href="${shopUrl('all-collections')}"><span class="btn__label">Shop everything</span>${ICON.arrow}</a></div></div>`,
    mount: () => {},
  };
}

export function pdpView(params, home) {
  const p = product(params.get('h'));
  if (!p) return notFound();

  const oneSize = p.v.length === 1;
  const pair = p.pair && product(p.pair);
  const siblings = catalog.products.filter((x) => x.line && x.line === p.line && x.h !== p.h && (x.g === p.g || x.g === 'unisex' || p.g === 'unisex') && x.cat === p.cat).slice(0, 12);
  const related = catalog.products
    .filter((x) => x.h !== p.h && x.cat === p.cat && x.inStock && x.line !== p.line && (x.g === p.g || x.g === 'unisex' || p.g === 'unisex'))
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, 10);
  const seen = recent.get().filter((h) => h !== p.h).map(product).filter(Boolean).slice(0, 10);
  const perks = (home.sections.find((s) => s.type === 'features')?.items || []).filter((f) => !(p.nocod && /cash/i.test(f.title)));
  const perkIcons = { global: ICON.globe, next: ICON.bolt, returns: ICON.swap, cash: ICON.cash };
  const lineUrl = lineCollection(p.line);
  const hasEu = p.v.some((v) => v.eu);

  const gallery = p.imgs.map((file, i) => `
    <button type="button" class="gallery__item media ${i === 0 ? 'gallery__item--lead' : ''}" data-zoom="${i}" data-cursor="Zoom" aria-label="Open image ${i + 1} of ${p.imgs.length}">
      ${picture(file, { sizes: i === 0 ? '(max-width: 1023px) 100vw, 58vw' : '(max-width: 1023px) 100vw, 29vw', eager: i === 0, alt: i === 0 ? p.title : '', cls: i === 0 ? 'gallery__hero' : '' })}
    </button>`).join('');

  const sizePicker = oneSize ? '' : `
    <div class="sizes" data-sizes>
      <div class="sizes__head">
        <p class="sizes__label">Size<span data-size-chosen></span></p>
        ${p.v.some((v) => !v.ok) ? '<p class="sizes__note">Struck-through sizes are sold out</p>' : ''}
      </div>
      <div class="sizes__grid" role="radiogroup" aria-label="Size">
        ${p.v.map((v) => `
          <button type="button" role="radio" aria-checked="false" class="size" data-vid="${v.id}" ${v.ok ? '' : 'disabled aria-disabled="true"'}>
            <span class="size__main">${esc(sizeLabel(v.t))}</span>${v.eu ? `<span class="size__alt">EU ${v.eu}</span>` : ''}
          </button>`).join('')}
      </div>
      <p class="sizes__error" data-size-error role="alert" hidden>Pick a size first</p>
    </div>`;

  const html = `
  <article class="pdp" data-pdp>
    <div class="container pdp__layout">
      <div class="gallery" data-gallery>
        <div class="gallery__track" data-gallery-track>${gallery}</div>
        <div class="gallery__hud show-mobile" aria-hidden="true">
          <span class="gallery__count"><span data-gallery-n>1</span> / ${p.imgs.length}</span>
          <div class="gallery__bar"><i data-gallery-bar style="--n:${p.imgs.length}"></i></div>
        </div>
      </div>

      <div class="pdp__info">
        <div class="pdp__sticky">
          <nav class="crumbs" aria-label="Breadcrumb" data-stagger>
            <a href="./">Home</a><span>/</span><a href="${shopUrl(CAT_COLLECTION[p.cat])}">${catLabel(p.cat)}</a>
            ${lineUrl ? `<span>/</span><a href="${shopUrl(lineUrl)}">${esc(p.line)}</a>` : ''}
          </nav>
          <div class="pdp__badges" data-stagger>${badges(p)}</div>
          <p class="pdp__line" data-stagger>${esc([p.line, genderLabel(p.g)].filter(Boolean).join(' · '))}</p>
          <h1 class="pdp__title" data-split>${esc(p.name)}</h1>
          <div class="pdp__price" data-stagger>
            <span class="price ${p.was ? 'is-sale' : ''}">${money(p.price)}</span>
            ${p.was ? `<s class="price__was">${money(p.was)}</s><span class="badge badge--sale">Save ${discount(p)}%</span>` : ''}
          </div>

          ${pair ? `
          <div class="pdp__block" data-stagger>
            <div class="seg seg--full" data-seg aria-label="Sizing">
              <a class="seg__item ${p.g === 'men' ? 'is-active' : ''}" href="${productUrl(p.g === 'men' ? p.h : pair.h)}" data-replace>Men's sizing</a>
              <a class="seg__item ${p.g === 'women' ? 'is-active' : ''}" href="${productUrl(p.g === 'women' ? p.h : pair.h)}" data-replace>Women's sizing</a>
            </div>
          </div>` : ''}

          ${siblings.length ? `
          <div class="pdp__block" data-stagger>
            <p class="pdp__label">More from ${esc(p.line)} <span data-sibling-name></span></p>
            <div class="swatches">
              <span class="swatch is-current media" aria-current="true" title="${esc(p.name)}">${picture(p.imgs[0], { sizes: '72px' })}</span>
              ${siblings.map((s) => `<a class="swatch media ${s.inStock ? '' : 'is-out'}" href="${productUrl(s.h)}" data-name="${esc(s.name)}" aria-label="${esc(s.name)}${s.inStock ? '' : ', sold out'}">${picture(s.imgs[0], { sizes: '72px' })}</a>`).join('')}
            </div>
          </div>` : ''}

          <div class="pdp__block" data-stagger>${sizePicker}</div>

          <div class="pdp__buy" data-stagger data-buy-anchor>
            ${p.inStock
              ? buyButton({ label: 'Add to bag', price: money(p.price), attrs: 'data-buy data-magnetic', cls: 'btn--xl' })
              : '<button type="button" class="btn btn--primary btn--xl" disabled><span class="btn__label">Sold out</span></button>'}
            <button type="button" class="save-btn ${isSaved(p.h) ? 'is-on' : ''}" data-save="${esc(p.h)}" aria-pressed="${isSaved(p.h)}" aria-label="Save ${esc(p.title)}">${ICON.heart}</button>
          </div>

          <ul class="perks" data-stagger>
            ${perks.map((f) => `<li>${perkIcons[f.title.toLowerCase().split(' ')[0]] || ICON.check}<span><b>${esc(f.title)}</b> ${esc(f.text)}</span></li>`).join('')}
          </ul>

          <div class="accordion" data-stagger>
            ${p.info.map((s, i) => `
              <details class="acc" ${i === 0 ? 'open' : ''}>
                <summary><span>${esc(s.title)}</span><i class="acc__icon" aria-hidden="true"></i></summary>
                <div class="acc__body"><div class="prose">${s.html}</div></div>
              </details>`).join('')}
          </div>

          <button type="button" class="link-btn pdp__share" data-share data-stagger>${ICON.share}<span>Share</span></button>
        </div>
      </div>
    </div>

    ${productRail('You may also like', related, { viewAll: shopUrl(CAT_COLLECTION[p.cat]) })}
    ${productRail('Recently viewed', seen)}

    <div class="buybar" data-buybar aria-hidden="true">
      <div class="container buybar__inner">
        <span class="buybar__thumb media hide-mobile">${picture(p.imgs[0], { sizes: '56px' })}</span>
        <div class="buybar__copy">
          <p class="buybar__name">${esc(p.name)}</p>
          <p class="buybar__meta"><span>${money(p.price)}</span><span data-buybar-size></span></p>
        </div>
        ${p.inStock ? buyButton({ label: 'Add to bag', attrs: 'data-buy tabindex="-1"' }) : '<button type="button" class="btn btn--primary" disabled tabindex="-1"><span class="btn__label">Sold out</span></button>'}
      </div>
    </div>
  </article>`;

  return {
    title: `${p.name} — ${p.line || 'Gully Labs'}`,
    html,
    mount(root) {
      pushRecent(p.h);
      let variant = oneSize ? p.v[0] : null;
      const track = $('[data-gallery-track]', root);

      /* entrance: info column rises in a short stagger */
      $$('[data-stagger]', root).forEach((el, i) => el.style.setProperty('--d', `${80 + i * 45}ms`));
      requestAnimationFrame(() => $('[data-pdp]', root)?.classList.add('is-in'));

      /* sizes */
      const sizesEl = $('[data-sizes]', root);
      const pick = (v) => {
        variant = v;
        $$('.size', sizesEl).forEach((b) => { const on = b.dataset.vid === String(v.id); b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
        $('[data-size-chosen]', sizesEl).textContent = ` — ${sizeLabel(v.t)}${v.eu ? ` · EU ${v.eu}` : ''}`;
        $('[data-size-error]', sizesEl).hidden = true;
        sizesEl.classList.remove('is-error');
        $('[data-buybar-size]', root).textContent = sizeLabel(v.t);
      };
      sizesEl?.addEventListener('click', (e) => {
        const b = e.target.closest('.size');
        if (b && !b.disabled) pick(p.v.find((v) => String(v.id) === b.dataset.vid));
      });
      sizesEl?.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
        const items = $$('.size:not(:disabled)', sizesEl);
        const i = items.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length].focus();
      });
      const available = p.v.filter((v) => v.ok);
      if (!oneSize && available.length === 1) pick(available[0]);

      /* buy */
      const onBuy = async (e) => {
        const btn = e.target.closest('[data-buy]');
        if (!btn) return;
        if (!variant) {
          sizesEl.classList.remove('is-error'); void sizesEl.offsetWidth; sizesEl.classList.add('is-error');
          $('[data-size-error]', sizesEl).hidden = false;
          const r = sizesEl.getBoundingClientRect();
          if (r.top < 90 || r.bottom > innerHeight - 90) sizesEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
          return;
        }
        const ok = await playBuy(btn);
        if (!ok) return;
        addToBag(variant.id, p.h);
        flyToBag($('.gallery__hero', root));
        setTimeout(openBag, reducedMotion ? 0 : 480);
      };
      root.addEventListener('click', onBuy);

      /* sticky buy bar once the main button leaves the viewport */
      const bar = $('[data-buybar]', root);
      const anchor = $('[data-buy-anchor]', root);
      const barIo = new IntersectionObserver(([e]) => {
        const on = !e.isIntersecting && e.boundingClientRect.top < 0;
        bar.classList.toggle('is-on', on);
        bar.setAttribute('aria-hidden', !on);
        $$('button', bar).forEach((b) => (b.tabIndex = on ? 0 : -1));
        document.documentElement.classList.toggle('has-buybar', on);
      });
      barIo.observe(anchor);

      /* sibling names on hover */
      const sibName = $('[data-sibling-name]', root);
      $$('.swatch[data-name]', root).forEach((s) => {
        s.addEventListener('pointerenter', () => (sibName.textContent = `— ${s.dataset.name}`));
        s.addEventListener('pointerleave', () => (sibName.textContent = ''));
      });

      /* accordions: animate height, keep one-click toggling */
      $$('.acc', root).forEach((d) => {
        const body = $('.acc__body', d);
        $('summary', d).addEventListener('click', (e) => {
          if (reducedMotion) return;
          e.preventDefault();
          const opening = !d.open;
          if (opening) d.open = true;
          const h = body.scrollHeight;
          d.classList.toggle('is-closing', !opening);
          body.animate([{ height: opening ? '0px' : `${h}px`, opacity: opening ? 0 : 1 }, { height: opening ? `${h}px` : '0px', opacity: opening ? 1 : 0 }], { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
            .finished.then(() => { if (!opening) d.open = false; d.classList.remove('is-closing'); });
        });
      });

      /* share */
      $('[data-share]', root).addEventListener('click', async () => {
        const data = { title: p.title, url: location.href };
        try {
          if (navigator.share) await navigator.share(data);
          else { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
        } catch { /* dismissed */ }
      });

      /* mobile carousel progress */
      const onTrack = () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        $('[data-gallery-n]', root).textContent = clamp(i + 1, 1, p.imgs.length);
        $('[data-gallery-bar]', root).style.setProperty('--i', clamp(track.scrollLeft / track.clientWidth, 0, p.imgs.length - 1));
      };
      track.addEventListener('scroll', onTrack, { passive: true });

      /* lightbox */
      const box = $('[data-layer="lightbox"]');
      const stage = $('[data-lightbox-stage]', box);
      const thumbs = $('[data-lightbox-thumbs]', box);
      let at = 0;
      const show = (i, dir = 0) => {
        at = (i + p.imgs.length) % p.imgs.length;
        stage.classList.remove('is-zoomed');
        stage.innerHTML = `<img src="${esc(imgUrl(p.imgs[at], 1600))}" srcset="${esc(srcset(p.imgs[at]))}" sizes="100vw" alt="${esc(p.title)} — image ${at + 1}" style="--from:${dir * 40}px" draggable="false">`;
        watchImages(stage);
        $('[data-lightbox-n]', box).textContent = `${at + 1} / ${p.imgs.length}`;
        $$('button', thumbs).forEach((b, k) => b.classList.toggle('is-on', k === at));
        $('button.is-on', thumbs)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      };
      thumbs.innerHTML = p.imgs.map((f, i) => `<button type="button" class="media" data-thumb="${i}" aria-label="Image ${i + 1}">${picture(f, { sizes: '64px' })}</button>`).join('');
      const onZoomClick = (e) => {
        const z = e.target.closest('[data-zoom]');
        if (!z) return;
        openLayer('lightbox');
        show(Number(z.dataset.zoom));
        watchImages(thumbs);
      };
      root.addEventListener('click', onZoomClick);
      const onBoxClick = (e) => {
        const t = e.target.closest('[data-thumb]');
        if (t) return show(Number(t.dataset.thumb));
        if (e.target.closest('[data-lightbox-prev]')) return show(at - 1, -1);
        if (e.target.closest('[data-lightbox-next]')) return show(at + 1, 1);
        if (e.target.closest('[data-lightbox-stage]')) {
          if (e.target.tagName !== 'IMG') return closeLayer();
          stage.classList.toggle('is-zoomed');
          pan(e);
        }
      };
      const pan = (e) => {
        if (!stage.classList.contains('is-zoomed')) return;
        const r = stage.getBoundingClientRect();
        stage.style.setProperty('--ox', `${clamp(((e.clientX - r.left) / r.width) * 100, 0, 100)}%`);
        stage.style.setProperty('--oy', `${clamp(((e.clientY - r.top) / r.height) * 100, 0, 100)}%`);
      };
      const onBoxKey = (e) => {
        if (box.hidden) return;
        if (e.key === 'ArrowLeft') show(at - 1, -1);
        if (e.key === 'ArrowRight') show(at + 1, 1);
      };
      let touchX = null;
      const onTouchStart = (e) => { touchX = stage.classList.contains('is-zoomed') ? null : e.touches[0].clientX; };
      const onTouchEnd = (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        touchX = null;
      };
      box.addEventListener('click', onBoxClick);
      stage.addEventListener('pointermove', pan);
      stage.addEventListener('touchstart', onTouchStart, { passive: true });
      stage.addEventListener('touchend', onTouchEnd);
      document.addEventListener('keydown', onBoxKey);

      initSegments(root);
      $$('[data-seg]', root).forEach(moveIndicator);

      return {
        destroy() {
          barIo.disconnect();
          document.documentElement.classList.remove('has-buybar');
          box.removeEventListener('click', onBoxClick);
          stage.removeEventListener('pointermove', pan);
          stage.removeEventListener('touchstart', onTouchStart);
          stage.removeEventListener('touchend', onTouchEnd);
          document.removeEventListener('keydown', onBoxKey);
          stage.innerHTML = ''; thumbs.innerHTML = '';
        },
      };
    },
  };
}
