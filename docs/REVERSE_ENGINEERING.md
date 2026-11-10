# gullylabs.com — reverse-engineering notes

How these notes were made: static analysis of the homepage HTML and theme assets, fetched on 2026‑11‑10
(`original.html`, `assets/theme/*`). The REA analysis server was not available in this
environment, so the analysis used direct inspection of the shipped (minified) code.
Each finding is marked **Observed** (seen in shipped code), **Inferred** (reasoned from it) or
**Unknown**. Nothing here ran checkout, login or any app backend.

## 1. Platform & theme

| Item | Value | |
|---|---|---|
| Platform | Shopify Online Store 2.0 (`Shopify.theme`, `/cdn/shop/t/114/…`, section IDs `template--…__…`) | Observed |
| Theme | **Concept** by RoarTheme, v5.3.1, Theme Store #2412 | Observed (`Shopify.theme.schema_name/version`, `theme.js` licence header) |
| Live theme name | "REVIEW 1 Nov - counter = real stock" (theme id 183992713500, role `main`) | Observed |
| Theme revision | `/t/114/` → the store has gone through ~114 theme copies | Inferred |
| Shop ID | 69323850012, myshopify domain `gullylabs.myshopify.com`, locale `en-IN`, INR | Observed |
| Fonts | System Helvetica/Arial stack for headings and body (no web fonts) | Observed (`--font-*-family`) |
| Brand colors | Accent/highlight `#003bd0` (rgb 0 59 208), black buttons, white bg, footer `#171717`, badge green `#39a935`, badge blue `#0f52dc`, rating amber `#f59e0b` | Observed (CSS custom properties) |

## 2. Front-end architecture (Concept theme)

**Observed:**
- Vanilla **Web Components** (no framework). `theme.js` (196 KB) defines ~110 custom elements, e.g.
  `sticky-header`, `menu-drawer`, `cart-drawer`, `slider-element`, `slideshow-element`, `marquee-element`,
  `motion-list`, `split-words`, `magnet-element`, `mouse-cursor`, `parallax-element`, `scrolling-banner`,
  `lookbook-element`, `shop-the-look`, `image-comparison`, `model-media` (3D), `countdown-timer`, `quick-view`.
- Most of the "interactive" feel comes from these built-in components: `motion-list` (staggered
  reveal), `split-words` (word-by-word heading animation), `magnet-*` (magnetic hover buttons),
  `secondary-media` (second image on card hover), `mouse-cursor`.
- Libraries: jQuery (`jquery.js`), Swiper (`swiper.js`), a vendor bundle (`vendor.js`), `instant-page.js`
  (prefetches links on hover).
- Theme JS exposes `page:loaded` and other DOM events for custom code (licence header comment).
- Cart uses the Shopify AJAX API: `/cart/add.js`, `/cart/change.js`, `/cart/update.js`, plus the Section Rendering
  API (`?section_id=…`) to re-render the cart drawer without a reload (`cart.js`).
- Search uses predictive search via `fetch` with an `AbortController` (`search.js`).

## 3. Gully Labs custom code (on top of the theme)

| File | What it does | |
|---|---|---|
| `ab-nav.js` / `ab-nav.css` | **A/B test of the navigation.** Three header variants (`header-ab-1/2/3` sections are all in the page). Variant comes from `?nav=1|2|3` or `window.__gl_ab_nav_url`, is stored in `sessionStorage['gl_ab_nav']`, set as `html[data-ab-nav]`, and appended to every internal link so the variant sticks. Patches `CSSStyleDeclaration.setProperty` and the theme's `sticky-header.setHeight` so hidden headers don't zero `--header-height`. | Observed |
| `custom.js` | Redirects the `product-no-a` template to `?view=product-no-a-v2` (product-page A/B / alternate template); on mobile, the "+" on product cards toggles a size picker (`.size-active`). | Observed |
| `lace-flow.js` / `.css` | **Extra-lace add-on** on product pages: preview lace colours (swaps gallery image), pick an extra pair, ATC label becomes "Add to cart — ₹X (Includes 2 pairs of laces)"; adds a linked lace line item through `/cart/add.js` + `/cart/update.js`. | Observed |
| `tl-cart-custom-name.js` | Builds the **cart note** from line-item properties: free jersey name customisation ("Custom Name"), Rakhi gift wrap, free extra lace. Syncs via `/cart.js` → `/cart/update.js`. | Observed |
| `gl-gift-wrap.css` | Styles an auto gift-wrap line (`gift-wrap-it` product, `window.GL_GIFT_WRAP.variantId`) and hides it from the cart UI when auto-enabled. | Observed |
| Product cards | Custom "+" button (`.ct-Plue`) and an inline size quick-add (UK 6–12) that posts one form per size to `/cart/add`. | Observed |
| Countdown announcement | "ORDER NOW TO GET BEFORE RAKHI" countdown section (currently 00:00:00:00, i.e. expired). | Observed |
| Theme name "counter = real stock" | Stock counters show real inventory. | Inferred from theme name |

## 4. Homepage composition (in order)

1. Announcement marquee (Analog Blue, 30-day returns) + Rakhi countdown bar
2. Header (3 A/B variants; main nav: Men, Women, Bestsellers mega-menus, Story, Find a Store)
3. Hero slideshow: Analog Blue artwork (separate desktop/mobile images; the copy and CTA are part of the image)
4. New Arrivals: product slider (10)
5. Bestsellers: tabbed (Sneakers / Slides / Apparel / Accessories) slider
6. Banner: Shaahi (GL 004 slides)
7. Gully Number 004: slider (10)
8. Banner: "Your Next Favourite Pair Is Hiding Here" → Hidden Gems
9. Hidden Gems: slider (8)
10. Apparel: 4 collection tiles
11. Shop The Look: 5 lifestyle images with linked products
12. Shop By Collection: slider (10 collections with counts)
13. Testimonials: 7 reviews
14. Value props: Global Shipping, Next Day Dispatch, 30-day Returns, COD
15. Footer: Shop / Quick Links / socials, credits "Codetasker" (the agency that built the store)

All content is extracted into `data/home.json` by `scripts/extract_content.py`.

## 5. Third-party apps & tracking (all Observed in the page, removed from both copies)

| Purpose | App |
|---|---|
| Reviews | Judge.me |
| Page builder | PageFly |
| Back-in-stock | Restock Rocket |
| Email/SMS | Omnisend |
| WhatsApp marketing popups | Bitespeed |
| CRO / A/B testing | Impulse (agentic CRO) |
| Chat | SagePilot |
| Checkout | GoKwik, Razorpay Magic Checkout |
| Returns | ClickPost |
| Analytics | Microsoft Clarity, CustomerLabs CDP, Google Analytics `G-W29YFGG1R3`, Google Ads `AW-16636568264`, Shopify Web Pixels |
| Store locator | Stoq, Google Maps |
| Other | Alia, Helium, Binary (careers link) |

## 6. Performance observations

- Homepage HTML is about **1.4 MB** (all three header variants, inlined JSON and app snippets ship on every load). Observed.
- Images: ~207 files; many product shots are 5000×5000 PNGs served through Shopify's resizer. At 1500 px wide
  the PNGs average about 0.5 MB each. Observed (our download totalled 116 MB at 1500 px).
- 30+ third-party script hosts load on the homepage. Observed.
- In the rebuild, WebP conversion takes the images from 94.6 MB to 13.7 MB.

## 7. Unknowns

- Liquid templates, section schemas and theme settings (`settings_data.json`) can only be downloaded from Shopify admin.
- Content of the other Bestsellers tabs (loaded on demand) and mega-menu contents beyond the top level.
- Which A/B variant wins / how traffic is split (handled server-side or in Impulse).
- Checkout customisations (GoKwik/Razorpay run off-site).

## 8. What this means for the redesign

- Concept already ships rich motion components. Many "interactive" ideas (magnetic buttons, split text,
  parallax, image comparison, 3D `model-media`) can be switched on in the theme editor without new code.
- Bigger ideas (3D sneaker viewer, scroll-driven storytelling, a cassette-style Analog Blue page) can be built as new
  sections that use the `page:loaded` event and the same AJAX cart API, so lace-flow, gift wrap and custom names keep working.
- Biggest performance wins: drop unused header variants, use WebP/AVIF product shots, and audit the 30+ app scripts.
