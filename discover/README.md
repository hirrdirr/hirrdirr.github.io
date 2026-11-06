# Game Discovery — Release Radar (hidden preview)

- Direct route: https://hirrdirr.se/discover/
- Design preview with **fictitious example games**: https://hirrdirr.se/discover/?demo=1
- The page deliberately has no links from the homepage or main navigation, is marked noindex, and is excluded from the sitemap. This is *unlisted*, not password protected.
- Phase 1 includes PC/Windows weekly releases, genre filters, week navigation, text search, cover art, ratings where available, responsive UI, and theme support.
- Limited Explore preview: https://hirrdirr.se/discover/explore/ – uses the Release Radar cache, NOT a full game catalog.
- Fictional Explore design demo: https://hirrdirr.se/discover/explore/?demo=1 – 13 clearly marked fictional games for search, genre, rating and sorting tests.
- Private 1–5 star TEST ratings use localStorage in your browser only; they are not public and do not sync across devices.
- The Discover and Explore pages automatically show **clearly labeled fictional demo games** when real cached IGDB data is missing or invalid. Query `?demo=1` still forces a demo even after IGDB is connected.
- Each game links to `/discover/game/?id=...` with a matching demo query parameter if needed. Game detail pages show cover, summary, release info and community rating, plus a local review draft with stars/status/text. Drafts are saved only on the current browser/device; this is NOT an authenticated or public reviews system.
- Complete server-side game search and public authenticated reviews will be implemented in subsequent stages.

## Connect real IGDB data

1. Register an application with Twitch Developer Console and obtain a **Client ID** and **Client Secret**, following https://api-docs.igdb.com/#authentication.
2. In GitHub repository Settings → Secrets and variables → Actions, create repository secrets `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`. Do NOT put the secret in files or browser JavaScript.
3. On GitHub Actions, run the **Discover PC releases** workflow manually once. The workflow then refreshes at 07:27 UTC daily. If the API fails, the last good JSON remains intact.
4. Verify the workflow logs, then open /discover/ directly. The app displays clearly labeled fictional demo games automatically until authenticated data is generated.

IGDB PC/Windows platform ID = 6. Dates are fetched from platform-specific release_date entries and preserved as UTC dates. The generated cache covers the two prior weeks, current week and five upcoming weeks. Only eligible game types are displayed; game additions and duplicates are filtered. Names, genres, images and links remain credited to IGDB.

## Offline tests

```sh
python -m unittest discover -s tests -p 'test_discover_releases.py'
node --check assets/discover/discover.js
node --check assets/discover/explore.js
node --check assets/discover/game-detail.js
node --test tests/discover-data.test.mjs
node --test tests/discover-explore.test.mjs
```
