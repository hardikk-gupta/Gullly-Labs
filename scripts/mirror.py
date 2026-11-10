#!/usr/bin/env python3
"""Make a static, offline copy of a page from gullylabs.com.

Usage:  python3 scripts/mirror.py [page_path] [output_html]
        python3 scripts/mirror.py /            index.html

What it does:
  * downloads the rendered HTML of the page
  * downloads every theme asset (CSS/JS) and image hosted on gullylabs.com/cdn
    into ./assets and rewrites the references to point at the local copies
  * downloads url(...) references found inside the downloaded CSS files
  * removes third-party app / analytics / checkout scripts that can't work
    outside Shopify (they are listed in BLOCKED_SCRIPT_PATTERNS)
"""
import hashlib
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://gullylabs.com"
IMG_WIDTH = 1500  # one size per image instead of every srcset variant

ASSET_RE = re.compile(r"""(?:https?:)?//gullylabs\.com(/cdn/[^"'\s)\\,]+)""")
CSS_URL_RE = re.compile(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""")

BLOCKED_SCRIPT_PATTERNS = [
    "cdn.shopify.com/extensions/", "shop-js/modules", "origin_trials",
    "checkouts/internal", "sagepilot", "razorpay", "standard-actions.js",
    "web-components/account.js", "clarity.ms", "customerlabs", "judge.me",
    "gokwik", "stoqapp", "heliumbuilder", "alia-prod", "binary.so",
    "codetasker", "monorail", "perf-kit", "portable-wallets", "load_feature",
    "googletagmanager", "connect.facebook", "trekkie",
]

cache = {}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (static-mirror)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def local_name(path):
    """Map a /cdn/... path (with query) to a local file under assets/."""
    parsed = urllib.parse.urlsplit(path)
    p = parsed.path
    if "/cdn/shop/files/" in p:
        sub = "images"
    elif "/assets/" in p:
        sub = "theme"
    else:
        sub = "misc"
    base = os.path.basename(p) or "index"
    if sub == "misc":
        base = hashlib.md5(p.encode()).hexdigest()[:8] + "-" + base
    return f"assets/{sub}/{base}"


def download(path):
    """Download a /cdn/... path once; return the local relative path or None."""
    parsed = urllib.parse.urlsplit(path)
    key = parsed.path
    if key in cache:
        return cache[key]
    rel = local_name(path)
    dest = os.path.join(ROOT, rel)
    url = ORIGIN + parsed.path
    if "/cdn/shop/files/" in parsed.path and re.search(r"\.(jpe?g|png|webp)$", parsed.path, re.I):
        url += f"?width={IMG_WIDTH}"
    elif parsed.query:
        url += "?" + parsed.query
    try:
        if not os.path.exists(dest):
            data = fetch(url)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if rel.endswith(".css"):
                data = process_css(data.decode("utf-8", "replace"), parsed.path).encode()
            with open(dest, "wb") as f:
                f.write(data)
        cache[key] = rel
        print("ok ", rel)
    except Exception as e:  # keep going; leave the remote URL in place
        print("ERR", url, e)
        cache[key] = None
    return cache[key]


def process_css(css, css_path):
    """Download assets referenced from a CSS file and point at them relatively."""
    def repl(m):
        ref = m.group(1).strip()
        if ref.startswith("data:") or ref.startswith("#"):
            return m.group(0)
        absu = urllib.parse.urljoin(ORIGIN + css_path, ref)
        u = urllib.parse.urlsplit(absu)
        if u.netloc != "gullylabs.com" or not u.path.startswith("/cdn/"):
            return m.group(0)
        rel = download(u.path + ("?" + u.query if u.query else ""))
        if not rel:
            return m.group(0)
        # CSS lives in assets/theme/, so make the path relative to it
        return f'url("{os.path.relpath(rel, "assets/theme")}")'
    return CSS_URL_RE.sub(repl, css)


def strip_scripts(html):
    def repl(m):
        tag = m.group(0)
        head = tag[: tag.find(">") + 1]
        if any(p in head for p in BLOCKED_SCRIPT_PATTERNS):
            return ""
        return tag
    html = re.sub(r"<script\b[^>]*>.*?</script>", repl, html, flags=re.S | re.I)
    # third-party stylesheets / preconnects that won't resolve offline
    html = re.sub(r"<link[^>]+cdn\.shopify\.com/extensions/[^>]*>", "", html)
    return html


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "/"
    out = sys.argv[2] if len(sys.argv) > 2 else "index.html"
    html = fetch(ORIGIN + page).decode("utf-8", "replace")
    html = strip_scripts(html)

    def repl(m):
        rel = download(m.group(1))
        return rel if rel else m.group(0)
    html = ASSET_RE.sub(repl, html)

    # make internal page links absolute to the live site for now
    html = re.sub(r'href="/(?!/)', f'href="{ORIGIN}/', html)

    with open(os.path.join(ROOT, out), "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", out)


if __name__ == "__main__":
    main()
