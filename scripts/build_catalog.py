#!/usr/bin/env python3
"""Build data/catalog.json from the live store's public JSON feeds.

Usage:  python3 scripts/build_catalog.py

Reads   https://gullylabs.com/products.json and /collections/<handle>/products.json
Writes  data/catalog.json — everything the shop (listing, product page, bag, search) needs:
        products with real variant ids (so the bag can hand off to the store checkout),
        image references, cleaned-up descriptions split into sections, and collection membership.
"""
import json
import os
import re
import urllib.request
from html import escape, unescape
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://gullylabs.com"
CDN_PREFIX = "https://cdn.shopify.com/s/files/1/0693/2385/0012/files/"

# Collections that are internal plumbing on the store (tax groups, promo mechanics, teasers).
SKIP_COLLECTIONS = re.compile(
    r"exclude-|gst|freebies|pre-order|flat-|teaser|^diwali|^all-products$|^kara-all$|^featured$|"
    r"^classics$|^all-india-kulfi-week$|^gl004gl005$|^gully-labs-bestsellers$|^new-arrivals$"
)
COLLECTION_TITLES = {
    "all-collections": "Everything",
    "all-shoe": "Footwear",
    "apparel": "Apparel",
    "slides": "Slides & Chappals",
    "shoe-under-5000": "Under ₹5,000",
    "gully-number-002-the-vintage-trainers": "Gully Number 002",
    "kulfi-tribute-to-india-s-favourite-summer-treat": "Kulfi",
    "gully-labs-x-royal-enfield-hunter-350": "Gully Labs x Royal Enfield",
    "gully-number-005-deluxe-chappal": "Gully Number 005",
    "y2k-a-gully-labs-baaz-collection": "Baaz Y2K",
}


def get(path):
    req = urllib.request.Request(ORIGIN + path, headers={"User-Agent": "Mozilla/5.0 (catalog build)"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


# ---------- description clean-up ----------

ALLOWED = {"p", "ul", "ol", "li", "strong", "em", "br", "h3"}
RENAME = {"b": "strong", "i": "em", "div": "p", "h1": "h3", "h2": "h3", "h4": "h3"}
VOID = {"br"}


class Cleaner(HTMLParser):
    """Keeps a small allowlist of tags, drops every attribute."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        tag = RENAME.get(tag, tag)
        if tag in ALLOWED:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        tag = RENAME.get(tag, tag)
        if tag in ALLOWED and tag not in VOID:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(escape(data, quote=False))


def clean_html(html):
    c = Cleaner()
    c.feed(html or "")
    s = "".join(c.out)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"<li>\s*<p>(.*?)</p>\s*</li>", r"<li>\1</li>", s)
    for _ in range(3):
        s = re.sub(r"<(p|strong|em|li|h3)>(\s|<br>)*</\1>", "", s)
    s = re.sub(r"(<br>\s*)+</(p|li)>", r"</\2>", s)
    s = re.sub(r"<p>\s*(<(?:ul|ol)>.*?</(?:ul|ol)>)\s*</p>", r"\1", s)
    return s.strip()


HEADING = re.compile(r"<(?:p|h3)>\s*(?:<br>)?\s*(?:<em>)?\s*<strong>([^<]{2,48})</strong>\s*(?:</em>)?\s*:?\s*</(?:p|h3)>|<h3>([^<]{2,48})</h3>")


def sections(html):
    """Split a description on its bold one-line headings (Features, Care Instructions, …)."""
    s = clean_html(html)
    parts, last, title = [], 0, "Details"
    for m in HEADING.finditer(s):
        body = s[last:m.start()].strip()
        if body:
            parts.append({"title": title, "html": body})
        title = unescape((m.group(1) or m.group(2)).strip(" :")).capitalize()
        last = m.end()
    body = s[last:].strip()
    if body:
        parts.append({"title": title, "html": body})
    for p in parts:
        if re.match(r"introducing|gl\d|gully (labs|number)", p["title"], re.I):
            p["title"] = "Details"
    return parts


# ---------- naming ----------

GENDER_SUFFIX = re.compile(r"\s*[-–]?\s*\(?\b(for\s+(wo)?men|unisex)\)?\s*$", re.I)


def smart_case(s):
    if s.isupper() and len(s) > 4:
        s = s.title()
    return re.sub(r"\bUk\b", "UK", s)


def names(title):
    t = title.replace("“", "").replace("”", "").strip()
    t = re.sub(r"\s+", " ", t)
    t = GENDER_SUFFIX.sub("", t)
    if "|" in t:
        t = GENDER_SUFFIX.sub("", t.split("|")[0].strip())
    parts = [p.strip() for p in re.split(r"\s+[-–]\s+", t) if p.strip()]
    if len(parts) == 1:
        m = re.match(r"^(Gully Number \d+|GL\d+)\s+(.+)$", t, re.I)
        if m:
            parts = [m.group(1), m.group(2)]
    if len(parts) == 1:
        return "", smart_case(parts[0])
    line = parts[0]
    line = re.sub(r"^gully number", "Gully Number", line, flags=re.I)
    line = re.sub(r"^GL(\d{3})\b", r"Gully Number \1", line)
    return line, " · ".join(smart_case(p) for p in parts[1:])


def category(p, line):
    text = f"{p['title']} {p['product_type']} {' '.join(p['tags'])}".lower()
    if re.search(r"sock|perfume|charm|lace|gift", text):
        return "accessories"
    if re.search(r"kara|jersey|trouser|shirt|shacket|pant", text) and "sneakers" != p["product_type"].lower():
        return "apparel"
    if re.search(r"gully number 00[45]\b|gl00[45]\b|chappal|slide", f"{line} {text}".lower()) and "gully number 002" not in text:
        return "slides"
    return "footwear"


def gender(p):
    tags = {t.lower() for t in p["tags"]}
    title = p["title"].lower()
    m = "men" in tags or bool(re.search(r"for men\b", title))
    w = "women" in tags or "for women" in title
    if "unisex" in tags or "unisex" in title or (m and w) or not (m or w):
        return "unisex"
    return "women" if w else "men"


def eu_size(sku):
    m = re.search(r"_(\d{2})$", sku or "")
    return int(m.group(1)) if m and 34 <= int(m.group(1)) <= 50 else None


def main():
    raw, page = [], 1
    while True:
        chunk = get(f"/products.json?limit=250&page={page}")["products"]
        raw += chunk
        if len(chunk) < 250:
            break
        page += 1

    products, index = [], {}
    for p in raw:
        variants = p["variants"]
        price = min(float(v["price"]) for v in variants)
        tags = {t.lower() for t in p["tags"]}
        if (
            price <= 0 or not p["images"] or "hidden" in tags
            or p["product_type"] == "Live event" or "gift card" in p["title"].lower()
        ):
            continue
        line, name = names(p["title"])
        compare = max(float(v["compare_at_price"] or 0) for v in variants)
        size_opt = len(variants) > 1
        item = {
            "h": p["handle"],
            "line": line,
            "name": name,
            "cat": category(p, line),
            "g": gender(p),
            "price": int(price),
            "was": int(compare) if compare > price else None,
            "date": p["published_at"][:10],
            "imgs": [i["src"].replace(CDN_PREFIX, "") for i in p["images"] if i["src"].startswith(CDN_PREFIX)][:10],
            "v": [
                {"id": v["id"], "t": re.sub(r"^UK(\d)", r"UK \1", v["title"]) if size_opt else "One size", "ok": bool(v["available"]),
                 **({"eu": eu_size(v["sku"])} if eu_size(v["sku"]) else {})}
                for v in variants
            ],
            "nocod": "no-cod" in tags,
            "info": sections(p["body_html"]),
        }
        index[p["handle"]] = len(products)
        products.append(item)

    # men's ↔ women's counterpart of the same shoe
    by_key = {}
    for i, p in enumerate(products):
        by_key.setdefault((p["line"].lower(), re.sub(r"\W+", "", p["name"].lower())), []).append(i)
    for group in by_key.values():
        if len(group) == 2 and {products[group[0]]["g"], products[group[1]]["g"]} == {"men", "women"}:
            a, b = group
            products[a]["pair"], products[b]["pair"] = products[b]["h"], products[a]["h"]

    collections = []
    for c in get("/collections.json?limit=250")["collections"]:
        h = c["handle"]
        if SKIP_COLLECTIONS.search(h) or not c["products_count"]:
            continue
        members = get(f"/collections/{h}/products.json?limit=250")["products"]
        ids = [index[m["handle"]] for m in members if m["handle"] in index]
        if not ids:
            continue
        collections.append({
            "h": h,
            "t": COLLECTION_TITLES.get(h, c["title"].strip()),
            "d": re.sub(r"<[^>]+>", "", c.get("body_html") or "").strip()[:240],
            "p": ids,
        })
        print(f"  {h}: {len(ids)}")

    out = {"cdn": ORIGIN + "/cdn/shop/files/", "store": ORIGIN, "products": products, "collections": collections}
    path = os.path.join(ROOT, "data", "catalog.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(products)} products, {len(collections)} collections → {path} ({os.path.getsize(path) // 1024} KB)")


if __name__ == "__main__":
    main()
