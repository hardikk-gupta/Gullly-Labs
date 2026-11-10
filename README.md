# Gully Labs — website rebuild

A clean, editable rebuild of the https://gullylabs.com homepage. It is the base for the redesign, and it deploys
to Vercel as a static site with no build step.

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. The page loads its content with `fetch`, so opening `index.html` straight from disk won't work.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Page shell (header, drawer, footer) |
| `css/styles.css` | All styling; design tokens at the top (`--blue`, radius, spacing) |
| `js/app.js` | Renders every section from the data and adds the motion: marquee, sliders with mouse drag, image swap on hover, quick sizes, reveal on scroll, split-word headings, parallax banners, auto-rotating testimonials |
| `data/home.json` | **All content**: announcements, nav, banners, products, collections, looks, reviews, footer. Edit here to change copy, reorder sections or swap products |
| `assets/img/` | Optimised WebP images used by the rebuild |
| `original.html` + `assets/theme/`, `assets/images/` | Untouched copy of the live Shopify page, for reference |
| `docs/REVERSE_ENGINEERING.md` | How the live site is built: theme, custom code, apps, performance |
| `scripts/` | `mirror.py` (re-copy a live page), `extract_content.py` (copy → JSON), `optimize_images.py` (→ WebP) |

### Refreshing content from the live site

```bash
python3 scripts/mirror.py / original.html
python3 scripts/extract_content.py
python3 scripts/optimize_images.py
```

Section types in `data/home.json`: `banner`, `products`, `collections`, `lookbook`, `testimonials`, `features`.
Reorder or delete entries in `sections` to change the page.

## Commerce

Product, collection, cart and account links go to the live Shopify store, so buying works end to end there.
This site doesn't hold a cart itself.

## Deploy on Vercel

Import this repo in Vercel with Framework Preset **Other**, no build command, and output directory `./`.
`vercel.json` sends `noindex` so search engines don't index this site as a duplicate of the live store.
Remove that header only when this becomes the official site.
