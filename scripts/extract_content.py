#!/usr/bin/env python3
"""Extract the homepage content from the mirrored Shopify page into data/home.json.

Usage: python3 scripts/extract_content.py [original.html] [data/home.json]

The rebuilt site (index.html + js/app.js) renders entirely from that JSON, so
copy edits, product swaps and section re-ordering happen in data, not markup.
"""
import json
import os
import re
import sys

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "original.html")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data", "home.json")
LIVE = "https://gullylabs.com"

soup = BeautifulSoup(open(SRC, encoding="utf-8").read(), "html.parser")


def txt(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def section(suffix):
    return soup.select_one(f'[id$="__{suffix}"]')


def product_cards(sec):
    out = []
    for card in sec.select(".product-card"):
        title = card.select_one(".product-card__title")
        imgs = []
        tpl = card.find("template")
        if tpl:
            imgs = [i.get("src") for i in BeautifulSoup(tpl.decode_contents(), "html.parser").find_all("img")]
        main = card.select_one(".product-card__media a > img")
        if main and main.get("src") not in imgs:
            imgs.insert(0, main.get("src"))
        # Concept theme naming is inverted: .price__regular is what you pay,
        # .price__sale is the struck-through compare-at price.
        price_el = card.select_one(".price")
        current = card.select_one(".price__regular .money")
        compare = card.select_one(".price__sale .money") if price_el and "price--on-sale" in price_el.get("class", []) else None
        rating = card.select_one(".product-card__rating")
        rating_val = None
        if rating:
            m = re.search(r"([\d.]+)\s*\|?\s*(\d+)\s+review", txt(rating))
            if m:
                rating_val = {"score": float(m.group(1)), "count": int(m.group(2))}
        sizes = [b.get_text(strip=True) for b in card.select(".Size--ct-btn button .btn-text")]
        out.append({
            "title": txt(title),
            "url": title.get("href") if title else LIVE,
            "price": txt(current),
            "compareAt": txt(compare) if compare else "",
            "rating": rating_val,
            "badges": [txt(b) for b in card.select(".badge") if txt(b)],
            "images": [i for i in imgs if i][:4],
            "sizes": sizes,
            "gender": card.get("data-gender", ""),
        })
    return out


def featured(suffix, extra=None):
    sec = section(suffix)
    view_all = sec.select_one('a[href*="/collections/"]')
    d = {
        "type": "products",
        "id": suffix,
        "title": txt(sec.find("h2")),
        "viewAll": view_all.get("href") if view_all else "",
        "products": product_cards(sec),
    }
    if extra:
        d.update(extra)
    return d


def banner(suffix):
    sec = section(suffix)
    src = sec.find("source")
    img = sec.find("img")
    link = sec.find("a", href=True)
    return {
        "type": "banner",
        "id": suffix,
        "desktop": img.get("src"),
        "mobile": src.get("srcset", "").split(" ")[0] if src else img.get("src"),
        "alt": img.get("alt") or "",
        "url": link.get("href") if link else "",
    }


def collection_list(suffix):
    sec = section(suffix)
    items = []
    for a in sec.select('a[href*="/collections/"]'):
        img = a.find("img")
        if not img:
            continue
        spans = [txt(s) for s in a.find_all("span") if txt(s)]
        name = spans[0] if spans else ""
        m = re.match(r"^(.*?)\s+(\d+)$", name)
        items.append({
            "title": m.group(1) if m else name,
            "count": int(m.group(2)) if m else None,
            "subtitle": next((txt(p) for p in a.find_all("p") if txt(p) and not txt(p).startswith(m.group(1) if m else name)), ""),
            "image": img.get("src"),
            "url": a.get("href"),
        })
    return {"type": "collections", "id": suffix, "title": txt(sec.find("h2")), "items": items}


def lookbook(suffix):
    sec = section(suffix)
    looks = []
    for cont in sec.select(".lookbook-image-container"):
        look_img = cont if cont.name == "img" else cont.find("img")
        looks.append({"image": look_img.get("src"), "products": []})
    # products follow each look image in document order
    current = -1
    for el in sec.find_all(["img", "a"]):
        if el.name == "img" and "lookbook-image-container" in (el.parent.get("class") or []) + (el.get("class") or []):
            current += 1
        elif el.name == "a" and el.find("img") and current >= 0 and "/products/" in el.get("href", ""):
            card = el.find_parent(class_=re.compile("product")) or el.parent
            price = card.find(string=re.compile("₹"))
            looks[current]["products"].append({
                "title": el.find("img").get("alt", ""),
                "url": el.get("href"),
                "image": el.find("img").get("src"),
                "price": price.strip() if price else "",
            })
    return {"type": "lookbook", "id": suffix, "title": txt(sec.find("h2")), "looks": looks}


def testimonials(suffix):
    sec = section(suffix)
    parts = [p for p in sec.get_text("|", strip=True).split("|") if p.strip()]
    items = []
    for i, p in enumerate(parts):
        if p.startswith("—") and items:
            items[-1]["author"] = p.lstrip("— ").strip()
        elif not p.startswith("—"):
            items.append({"quote": p.strip(), "author": ""})
    return {"type": "testimonials", "id": suffix, "items": [i for i in items if i["author"]]}


def features(suffix):
    sec = section(suffix)
    ps = [txt(p) for p in sec.find_all("p") if txt(p)]
    return {"type": "features", "id": suffix,
            "items": [{"title": ps[i], "text": ps[i + 1]} for i in range(0, len(ps) - 1, 2)]}


def links(sec, heading):
    for span in sec.find_all("span"):
        if txt(span) == heading:
            block = span.find_parent(["details", "div"], class_=re.compile("footer|block|menu")) or span.parent.parent
            return [{"label": txt(a), "url": a["href"]} for a in block.find_all("a", href=True) if txt(a)]
    return []


ann = section("announcement-bar")
footer = section("footer")
data = {
    "brand": {
        "name": "Gully Labs",
        "logo": soup.select_one(".header__logo-link img").get("src"),
        "logoFooter": footer.find("img").get("src"),
        "tagline": max((txt(p) for p in footer.find_all("p")), key=len, default=""),
    },
    "announcements": [{"text": txt(a), "url": a["href"]} for a in ann.find_all("a", href=True)],
    "nav": [
        {"label": "Men", "url": f"{LIVE}/collections/men"},
        {"label": "Women", "url": f"{LIVE}/collections/women"},
        {"label": "Bestsellers", "url": f"{LIVE}/collections/best-sellers"},
        {"label": "Story", "url": f"{LIVE}/pages/our-story"},
        {"label": "Find a Store", "url": f"{LIVE}/pages/find-a-store"},
    ],
    "social": [{"label": txt(a), "url": a["href"]} for a in footer.select('a[href*="facebook"], a[href*="x.com"], a[href*="instagram"], a[href*="youtube"]')],
    "sections": [
        dict(banner("slideshow"), hero=True),
        featured("featured_collection_gTpLbf"),
        featured("featured-collections", {"tabs": ["Sneakers", "Slides", "Apparel", "Accessories"]}),
        banner("slideshow_LbG7H8"),
        featured("featured_collection_PfRqyY"),
        banner("slideshow_UEUK8X"),
        featured("featured_collection_8eyafi"),
        collection_list("collection_list_JRGJy4"),
        lookbook("image_point_Gr46M6"),
        collection_list("collection-list"),
        testimonials("testimonials-banner"),
        features("multicolumn_with_icons_txUcKa"),
    ],
    "footer": {
        "columns": [
            {"title": "Shop", "links": links(footer, "Shop")},
            {"title": "Quick Links", "links": links(footer, "Quick Links")},
        ],
    },
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("wrote", OUT)
for s in data["sections"]:
    n = len(s.get("products") or s.get("items") or s.get("looks") or [])
    print(f'  {s["type"]:12} {s["id"]:30} {s.get("title",""):22} {n}')
