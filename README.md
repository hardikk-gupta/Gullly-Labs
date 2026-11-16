# Gully Labs — shop experience

A rebuilt storefront for https://gullylabs.com: home, listing (PLP), product page (PDP), search and a bag,
with the motion and micro-interactions layered on top. Static files, no build step, deploys to Vercel as is.

The catalogue is real: `data/catalog.json` is generated from the live store's public feeds, including variant ids,
so the bag's **Checkout** button opens the store's own cart with the chosen sizes and quantities in it.

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. (Content is loaded with `fetch`, so opening the files straight from disk won't work.)

## Pages

| URL | What it is |
|---|---|
| `index.html` | Home: campaign hero, live product rails, bestseller tabs, shop the look, collections, reviews |
| `shop.html?c=<collection>` | Listing. Also `?q=<search>` and `?c=saved`. Filters, sort and category live in the URL (`cat`, `g`, `size`, `price`, `stock`, `sort`) |
| `product.html?h=<handle>` | Product page |

All three HTML files are the same shell; `js/app.js` reads the URL and renders the right view, then takes over
link clicks so moving between pages is instant and animated. **After editing `index.html`, copy it over the other two:**

```bash
cp index.html shop.html && cp index.html product.html
```

## Structure

| Path | What it is |
|---|---|
| `css/styles.css` | All styling. Design tokens at the top (`--blue`, radius, easings) |
| `js/app.js` | Boot, header/footer, search, routing with view transitions, scroll restore |
| `js/home.js`, `js/plp.js`, `js/pdp.js` | The three views |
| `js/components.js` | Product card (hover scrub, quick add, save), rails, drawers, the buy button |
| `js/cart.js` | Bag (kept in `localStorage`), drawer, checkout hand-off |
| `js/motion.js` | Reveal, split headings, rail drag, sliding pills, fly-to-bag, toast, ripple, cursor label |
| `js/three-fx.js` | The 3D pieces (Three.js): rippling hero, spinning sneaker, product ring, 3D photo box. Loaded on demand |
| `js/vendor/three.module.min.js` | Three.js r170 (MIT), vendored so there is no CDN dependency |
| `js/lib.js` | Helpers, catalogue access, image URLs, saved / recently viewed |
| `data/catalog.json` | Products, variants, collections. Generated, don't hand-edit |
| `data/home.json` | Home page content: banners, section order, looks, reviews, footer |
| `assets/img/` | Local WebP images used by the home page. Product images load from the store CDN at the size needed |
| `original.html`, `assets/theme/`, `assets/images/`, `docs/` | Reference copy of the live page and the reverse-engineering notes |

## Refreshing data

```bash
python3 scripts/build_catalog.py
```

Re-run whenever products, prices or stock change on the store (stock is a snapshot from the last run; the store's
checkout has the final word). Home content is refreshed with `scripts/mirror.py`, `scripts/extract_content.py`
and `scripts/optimize_images.py`, as before.

## Interaction notes

- Everything animated respects `prefers-reduced-motion`.
- The intro curtain plays once per browser session.
- Hover-only behaviour (image scrub on cards, cursor label, magnetic button) is limited to mouse pointers; touch gets
  always-visible controls instead.
- The 3D pieces only start where WebGL is available and reduced motion is off; they render only while on screen.
  Without them the hero is the plain image, the sneaker band keeps its text and button, and the ring section is left out.
- Route and grid animations use the View Transitions API and fall back to an instant swap where it is missing.

## Deploy on Vercel

Framework preset **Other**, no build command, output directory `./`.
`vercel.json` sends `noindex` so search engines don't index this as a duplicate of the live store; remove that
header only when this becomes the official site.
