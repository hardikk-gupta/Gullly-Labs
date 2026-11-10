# Gully Labs – static site copy

A static copy of the homepage of https://gullylabs.com (a Shopify store), used as the starting point for redesign work.

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Layout

- `index.html` – the rendered homepage with its asset links rewritten to local files
- `assets/theme/` – theme CSS and JS (`theme.css`, `custom.css`, `theme.js`, `swiper.js`, …)
- `assets/images/` – every image the homepage uses (at 1500px wide)
- `scripts/mirror.py` – the script that made the copy. Run it again to refresh it, or to copy another page:
  `python3 scripts/mirror.py /pages/our-story our-story.html`

## Limits

- This is the **rendered output** of the Shopify theme, not the Liquid theme source. You can only get that source from the Shopify admin (Online Store → Themes → Download theme file).
- Cart, search, login and checkout need Shopify's backend, so they don't work here.
- Third-party app scripts (reviews, chat, analytics, payments) are removed.
- Links to other pages still point to the live site.
