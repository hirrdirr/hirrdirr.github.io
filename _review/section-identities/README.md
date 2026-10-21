# Games, Videos and News visual identities

## Scope

Based on main `6bc7fca` (including the October 21 digest and the unlisted Slot Rush updates). Homepage markup, homepage assets, shared navigation/theme scripts, game code, video data, news data, posts and GitHub Actions are unchanged.

- **Games:** Japanese arcade entrance, asymmetric showcase with prominent Core Defense artwork, two compact game panels and a non-interactive Idle Guild strip. Existing three public game URLs retained. Slot Rush remains unlisted.
- **Videos:** portrait recording studio beside a featured player, followed by a numbered horizontal video library. All four IDs/titles/descriptions come from `_data/videos.yml`. Actual YouTube thumbnails use `img.youtube.com`. An accessible click-to-load button creates a privacy-enhanced YouTube iframe; direct links remain usable without JavaScript.
- **News:** cybersecurity newsroom panorama, publication masthead, edition bar, source-grouped digest and a separate highlights/archive rail. Wide screens use newspaper columns. The complete latest post content is rendered unchanged, including publishers with no new articles. Highlights retain their own compilation date and source. A plain article fallback handles missing images.

## Theme and assets

`assets/sections.css` is loaded only when a page declares `section`. Each section sets a `--section-scene` URL, with `body.light` selecting its daylight counterpart. Existing theme initialization, persistence and toggle behavior are reused unchanged. There are no additional JavaScript dependencies. Only Videos loads the small deferred player enhancement.

New original environments were generated using the built-in image-generation tool. Dark environments are new compositions; light variants recompose the same environments in natural daylight, with brighter materials, sky and planting rather than a CSS brightness filter. Existing game-card art is retained.

| Asset under `assets/artwork/sections/` | Dimensions | Purpose |
| --- | --- | --- |
| games-dark.webp | 1800 × 750 | Night arcade entrance |
| games-light.webp | 1800 × 750 | Daylight arcade entrance |
| videos-dark.webp | 960 × 1280 | Night recording/editing studio |
| videos-light.webp | 960 × 1280 | Daylight recording/editing studio |
| news-dark.webp | 1800 × 600 | Night cybersecurity operations room |
| news-light.webp | 1800 × 600 | Daylight cybersecurity operations room |

Images were proportionally exported as WebP (quality 91). Combined new artwork is approximately 2.4 MB; a page uses its own selected environment, not the complete set.

## Validation

- Rendered in a real Chromium browser at 2560×1440, 1920×1080, 1366×768, 768×1024 and 390×844 in both themes. See `responsive-validation.json`; the new October 21 news content was checked again in `final-news-validation.json`.
- No horizontal overflow or visible broken image elements in those measurements. Visually reviewed desktop/tablet/mobile composition and both themes. Corrected the featured game image's collapsed flex height at the mobile breakpoint and spacing when the intro line break disappears.
- Theme selection persists through section navigation, changes the environment URL and leaves shared branding intact.
- Browser-tested Games/Videos/News/Home navigation, game-selection and video-library anchors, news archive, all three public game launches, and the keyboard-triggered YouTube player. Core Defense reached its build HUD, Dodge & Drift showed Running, and Ball dismissed its start overlay.
- Idle Guild contains no link, button or tab stop; its UI Coming Soon label remains.
- All four real YouTube thumbnail images loaded at natural width 480. The YouTube player loaded the real “Cs clutch” controls. Full streamed playback across every video/device was not exhaustively tested.
- Checked 61 rendered links for valid internal targets and all local artwork paths. Original external article URLs are preserved, not rewritten or exhaustively availability-tested.
- Liquid rendering checks covered an empty video list, no news posts, a publisher with no new items, absent highlights, and a first digest with no earlier archive entries.
- JavaScript syntax check and `git diff --check` passed. Homepage does not load the new section stylesheet or video script.

## Screenshots

These are real browser screenshots of the viewport harness. The iframe renders at the selected CSS viewport dimensions, then is scaled to fit the capture; JPEG files are **not native 1920×1080 exports**. The small controls above the site are local QA tooling and are not shipped. Desktop captures show 1920×1080 layouts; mobile captures show 390×844 layouts. Some images were captured before the October 21 digest arrived; the final News desktop/mobile images include October 21 data.

| Page | Dark | Light |
| --- | --- | --- |
| Games | [Dark](games-dark.jpg) | [Light](games-light.jpg) |
| Videos | [Dark](videos-dark.jpg) | [Light](videos-light.jpg) |
| News | [Dark](news-dark.jpg) | [Light](news-light.jpg) |

Mobile: [Games](games-mobile-dark.jpg), [Videos](videos-mobile-dark.jpg), [News](news-mobile-dark.jpg).

## Remaining limitations

Ruby/Jekyll is unavailable in this workspace. Local browser previews use LiquidJS plus Markdown rendering with UTC dates; this is not a production GitHub Pages build. Production compatibility relies on standard existing Jekyll front matter/includes/filters and must be confirmed by the normal Pages build after review. No workflows were changed or triggered manually.

The existing Om item and search control are disabled in current main; they remain disabled. No destination or search functionality was invented. Archive and individual digest page layouts are outside this redesign's scope.
