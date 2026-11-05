#!/usr/bin/env python3
"""Fetch PC/Windows releases from IGDB into a static JSON cache.

The script is run by GitHub Actions. Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET
as repository secrets. Never expose either to browser JavaScript.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT = Path("assets/data/discover/releases.json")
UTC = dt.timezone.utc
PLATFORM_PC = 6
PAGE_SIZE = 500
MAX_PAGES = 12
REQUEST_TIMEOUT = 25


def request_json(url: str, *, data: bytes | None = None, headers: dict | None = None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
        return json.load(response)


def token(client_id: str, client_secret: str) -> str:
    encoded = urllib.parse.urlencode({
        "client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"
    }).encode()
    result = request_json("https://id.twitch.tv/oauth2/token", data=encoded)
    if not result.get("access_token"):
        raise RuntimeError("Twitch authentication returned no token")
    return result["access_token"]


def query(endpoint: str, body: str, *, client_id: str, auth: str):
    return request_json(
        "https://api.igdb.com/v4/" + endpoint,
        data=body.encode("utf-8"),
        headers={
            "Client-ID": client_id,
            "Authorization": "Bearer " + auth,
            "Content-Type": "text/plain",
            "Accept": "application/json",
        },
    )


def window(today: dt.date):
    monday = today - dt.timedelta(days=today.weekday())
    # 2 prior weeks, the current week, and 5 upcoming weeks
    return monday - dt.timedelta(weeks=2), monday + dt.timedelta(weeks=6)


def release_rows(start: dt.date, end: dt.date, *, client_id: str, auth: str):
    """IGDB release_dates are platform-specific; query PC explicitly."""
    begin = int(dt.datetime.combine(start, dt.time.min, UTC).timestamp())
    finish = int(dt.datetime.combine(end, dt.time.min, UTC).timestamp())
    rows = []
    for page in range(MAX_PAGES):
        body = (
            "fields game,platform,date; "
            f"where platform = {PLATFORM_PC} & date >= {begin} & date < {finish}; "
            f"sort date asc; limit {PAGE_SIZE}; offset {page * PAGE_SIZE};"
        )
        chunk = query("release_dates", body, client_id=client_id, auth=auth)
        if not isinstance(chunk, list):
            raise ValueError("Unexpected release_dates response")
        rows.extend(chunk)
        if len(chunk) < PAGE_SIZE:
            return rows
    raise RuntimeError("Too many release dates; refuse to publish incomplete data")


def game_records(ids: set[int], *, client_id: str, auth: str):
    result = {}
    ordered = sorted(ids)
    for start in range(0, len(ordered), 250):
        subset = ordered[start:start + 250]
        body = (
            "fields name,slug,cover.image_id,genres.name,rating,rating_count,category,version_parent; "
            "where id = (" + ",".join(map(str, subset)) + "); limit 500;"
        )
        games = query("games", body, client_id=client_id, auth=auth)
        if not isinstance(games, list):
            raise ValueError("Unexpected games response")
        for game in games:
            if isinstance(game, dict) and isinstance(game.get("id"), int):
                result[game["id"]] = game
    return result


def build(rows: list[dict], games: dict[int, dict], start: dt.date, end: dt.date):
    dates = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        game_id, timestamp = row.get("game"), row.get("date")
        if not isinstance(game_id, int) or not isinstance(timestamp, (int, float)):
            continue
        day = dt.datetime.fromtimestamp(timestamp, UTC).date()
        if start <= day < end:
            # If multiple PC release dates overlap, show the earliest.
            dates[game_id] = min(day, dates.get(game_id, day))

    output = []
    for game_id, day in dates.items():
        game = games.get(game_id, {})
        # Keep main games and standalone expansions, not DLC, bundles, ports or editions.
        if game.get("category") not in (0, 8, 9, 10, 11) or game.get("version_parent"):
            continue
        name = game.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        cover = game.get("cover") or {}
        raw_genres = game.get("genres") or []
        genres = sorted({
            genre["name"] for genre in raw_genres
            if isinstance(genre, dict) and isinstance(genre.get("name"), str)
        })
        rating = game.get("rating")
        rating_count = game.get("rating_count")
        output.append({
            "id": game_id,
            "name": name.strip(),
            "slug": game.get("slug") if isinstance(game.get("slug"), str) else "",
            "date": day.isoformat(),
            "cover_id": cover.get("image_id") if isinstance(cover, dict) else None,
            "genres": genres,
            "rating": round(rating, 1) if isinstance(rating, (int, float)) and 0 <= rating <= 100 else None,
            "rating_count": rating_count if isinstance(rating_count, int) else 0,
        })
    output.sort(key=lambda item: (item["date"], item["name"].casefold()))
    return {
        "source": "IGDB",
        "generated_at": dt.datetime.now(UTC).isoformat(timespec="seconds"),
        "window_start": start.isoformat(),
        "window_end": end.isoformat(),
        "platforms": [{"id": PLATFORM_PC, "name": "PC (Windows)"}],
        "games": output,
    }


def main():
    client_id = os.getenv("IGDB_CLIENT_ID")
    client_secret = os.getenv("IGDB_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET – cache left unchanged.", file=sys.stderr)
        return 2
    today = dt.datetime.now(UTC).date()
    start, end = window(today)
    auth = token(client_id, client_secret)
    rows = release_rows(start, end, client_id=client_id, auth=auth)
    ids = {r["game"] for r in rows if isinstance(r, dict) and isinstance(r.get("game"), int)}
    games = game_records(ids, client_id=client_id, auth=auth)
    output = build(rows, games, start, end)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Published {len(output['games'])} PC games in release window {start} to {end} (exclusive)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, urllib.error.URLError) as exc:
        print(f"Failed to update IGDB data (existing cache preserved): {exc}", file=sys.stderr)
        raise SystemExit(1)
