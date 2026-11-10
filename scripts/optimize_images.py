#!/usr/bin/env python3
"""Convert every image referenced by data/home.json to resized WebP in assets/img/
and point the JSON at the optimised files.

Usage: python3 scripts/optimize_images.py
Re-run after scripts/extract_content.py (it is idempotent).
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "home.json")
OUT_DIR = os.path.join(ROOT, "assets", "img")
HERO_KEYS = {"desktop", "mobile"}
MAX_W = {"hero": 2400, "default": 1200, "logo": 600}
os.makedirs(OUT_DIR, exist_ok=True)
stats = {"in": 0, "out": 0, "n": 0}


def convert(rel, kind):
    if not rel or not rel.startswith("assets/images/"):
        return rel
    src = os.path.join(ROOT, rel)
    name = os.path.splitext(os.path.basename(rel))[0] + ".webp"
    dest_rel = f"assets/img/{name}"
    dest = os.path.join(ROOT, dest_rel)
    if not os.path.exists(dest):
        im = Image.open(src)
        im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
        w = MAX_W[kind]
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(dest, "WEBP", quality=82 if kind != "logo" else 90, method=6)
        stats["in"] += os.path.getsize(src)
        stats["out"] += os.path.getsize(dest)
        stats["n"] += 1
    return dest_rel


def walk(node, kind="default"):
    if isinstance(node, dict):
        is_hero = node.get("type") == "banner"
        for k, v in node.items():
            if isinstance(v, str) and v.startswith("assets/images/"):
                node[k] = convert(v, "hero" if (is_hero and k in HERO_KEYS) else ("logo" if k.startswith("logo") else kind))
            else:
                walk(v, kind)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str) and v.startswith("assets/images/"):
                node[i] = convert(v, kind)
            else:
                walk(v, kind)


data = json.load(open(DATA, encoding="utf-8"))
walk(data)
json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
if stats["n"]:
    print(f'converted {stats["n"]} images: {stats["in"]/1e6:.1f} MB -> {stats["out"]/1e6:.1f} MB')
else:
    print("nothing new to convert")
