import os
import re
import json
from datetime import datetime, timezone, timedelta
import urllib.request

import feedparser
from dateutil import parser as dtparser

RSS_FEEDS = [
    ("CERT-SE", "https://www.cert.se/feed/atom.xml"),
    ("BleepingComputer", "https://www.bleepingcomputer.com/feed/"),
    ("Malwarebytes", "https://blog.malwarebytes.com/feed/"),
    ("MSRC Update Guide", "https://msrc.microsoft.com/update-guide/rss"),
    ("SANS ISC Diary", "https://isc.sans.edu/rssfeed.xml"),
    ("Google Threat Intelligence", "https://feeds.feedburner.com/threatintelligence/pvexyqv7v0v"),
]

KEV_JSON_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

MAX_PER_FEED = 5
LOOKBACK_HOURS = 36  # buffert

def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9åäö]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "news"

def parse_time(entry):
    for key in ("published", "updated", "pubDate"):
        if key in entry:
            try:
                t = dtparser.parse(entry[key])
                if t.tzinfo is None:
                    t = t.replace(tzinfo=timezone.utc)
                return t
            except Exception:
                pass
    return None

def fetch_kev(cutoff):
    try:
        with urllib.request.urlopen(KEV_JSON_URL, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return []

    out = []
    for v in data.get("vulnerabilities", []) or []:
        date_added = v.get("dateAdded")
        if not date_added:
            continue
        try:
            t = dtparser.parse(date_added).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if t < cutoff:
            continue

        cve = v.get("cveID", "CVE-????-????")
        vendor = (v.get("vendorProject") or "").strip()
        product = (v.get("product") or "").strip()
        title = f"{cve} — {vendor} {product}".strip()
        link = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
        out.append((t, title, link))

    out.sort(key=lambda x: x[0], reverse=True)
    return out[:10]

def main():
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=LOOKBACK_HOURS)
    date_str = now.strftime("%Y-%m-%d")

    os.makedirs("_posts", exist_ok=True)

    filename = f"_posts/{date_str}-{slugify('daily-security-digest')}.md"

    if os.path.exists(filename):
        return

    lines = [
        "---",
        f'title: "Dagens security-digest ({date_str})"',
        "layout: post",
        "categories: [news]",
        "---",
        "",
        "Automatiskt sammanställt från utvalda källor (senaste ~36h).",
        "",
    ]

    for name, url in RSS_FEEDS:
        feed = feedparser.parse(url)
        items = []

        for e in feed.entries[:100]:
            t = parse_time(e)
            if not t or t < cutoff:
                continue
            title = (e.get("title") or "Utan titel").strip()
            link = (e.get("link") or "").strip()
            items.append((t, title, link))

        items.sort(key=lambda x: x[0], reverse=True)
        items = items[:MAX_PER_FEED]

        lines.append(f"## {name}")
        if not items:
            lines.append("_Inga nya poster i tidsfönstret._")
            lines.append("")
            continue

        for t, title, link in items:
            lines.append(f"- [{title}]({link})")
        lines.append("")

    kev = fetch_kev(cutoff)
    lines.append("## CISA KEV (nyligen tillagda)")
    if not kev:
        lines.append("_Inga nya KEV-poster i tidsfönstret._")
        lines.append("")
    else:
        for t, title, link in kev:
            lines.append(f"- [{title}]({link})")
        lines.append("")

    content = "\n".join(lines).strip() + "\n"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
