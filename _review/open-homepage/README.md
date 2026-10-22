# Open homepage review

Initial inspection and comparison captures: `main` at `5558e8a05382c2ff54f6541d58309c406aaabdd7` (2026-10-22). Before delivery, the branch was rebased onto `29fc165f92bae58e033ddd737732671ad1d1e5c0`, preserving the newer Slot Rush updates and October 22 security digest. The homepage implementation did not change during that rebase.

The supplied layout reference guides the composition. The existing repository remains the source of artwork, copy, game destinations, video entries and security headlines.

## What changed

- An open hero blends the existing illustration into the page, with the existing pixel wordmark, welcome text and lightweight quick links.
- Dodge & Drift is the featured project: prominent artwork, adjacent description and a clear play action. Core Defense, Ball and the non-clickable Idle Guild use a compact companion list.
- Video thumbnails form an open gallery. Four real security headlines use an editorial list with publisher, digest date and original article imagery or a source fallback.
- The garden and station illustrations sit in the composition without enclosing panels. Both switch with the existing theme preference.
- Homepage-only CSS provides responsive compositions, warm accents, visible keyboard focus and generous primary touch targets. No new dependencies or JavaScript systems were introduced.

Only `index.html` and `assets/open-home.css` define the redesign. The shared layout conditionally includes that stylesheet when `page.home_layout == "open"`; other pages do not load it. Shared scripts, stylesheets, navigation includes, game code, data and workflows are unchanged.

## Existing assets reused

All files below are reused byte-for-byte from `assets/artwork/home/`:

| Placement | Dark theme | Light theme |
| --- | --- | --- |
| Hero | `hero-dark.webp` | `hero-light.webp` |
| Garden beside the feed / below it on small screens | `garden-dark.webp` | `garden-light.webp` |
| Station beside the social section | `station-dark.webp` | `station-light.webp` |
| Featured game | `dodge-drift.webp` | Same existing game artwork |
| Other projects | `core-defense.webp`, `ball.webp`, `idle-guild.webp` | Same existing game artwork |

The existing wordmark and fox mascot are also retained. New artwork: **none**.

The existing `body.light` theme class and `--home-hero`, `--home-garden`, `--home-station` variables select the images; the existing theme initialization, toggle and persistence code is unchanged. The screenshot session also confirmed that the light theme survives a homepage navigation/reload.

Video titles, descriptions and YouTube destinations still come from `_data/videos.yml`. All four gallery images now use their actual YouTube thumbnails. The previous template's hardcoded durations and dates had no corresponding source metadata, so those unsupported labels were removed. Existing decorative thumbnail files are retained in the repository. News remains driven by `_data/security_highlights.json`; the date is introduced as the digest compilation date.

## Screenshots

These are actual Chrome captures of a preview iframe rendered at the listed CSS viewport dimensions, scaled to fit the available browser capture area. They are **not native-resolution image exports**. The harness controls are included for context; its on-screen metrics can predate a resize in the baseline screenshots. The recorded measurements in `browser-checks.json` use the current iframe viewport directly.

| Viewport / theme | Before | After |
| --- | --- | --- |
| 1920 × 1080, dark | [Before](before-1920-dark.jpg) | [After](after-1920-dark.jpg) |
| 1920 × 1080, light | [Before](before-1920-light.jpg) | [After](after-1920-light.jpg) |
| 2560 × 1440, dark | [Before](before-2560-dark.jpg) | [After](after-2560-dark.jpg) |
| 390 × 844, dark | [Before](before-mobile-dark.jpg) | [After](after-mobile-dark.jpg) |

Additional views: [desktop videos, news and decorative scenes](after-1920-dark-lower.jpg), [light mobile](after-mobile-light.jpg). Refreshed captures with the October 22 digest: [dark content view](after-1920-dark-lower-current.jpg), [light content view](after-1920-light-lower.jpg).

## Validation

- Real Chrome rendering at 2560 × 1440, 1920 × 1080, 1366 × 768, 1280 × 720, 768 × 1024 and 390 × 844, each in dark and light themes: **12 cases**.
- No horizontal overflow or broken image elements in those cases; all four YouTube thumbnails loaded. All three scene backgrounds resolve to the correct theme variant. Idle Guild has no link, button or tabindex, and retains the UI-level Coming Soon label.
- Visual inspection of wide desktop, laptop, tablet and mobile compositions, including the lower news/video content. No artwork files were modified.
- Clicked Home → Games → Videos → News → Home in the browser: all destinations loaded, the light theme persisted, and secondary pages did not include the homepage stylesheet. Keyboard Tab reaches the featured play link with a visible 3px outline; Enter opens `/games/dnd/`.
- Rendered game, section and asset destinations resolve locally. All four video titles/descriptions/destinations and four news titles/publishers/dates/destinations/images match their data sources.
- Preview HTML for `/games/`, `/videos/`, `/news/`, `/news/archive/`, `/games/dnd/`, `/games/td/`, `/games/dxball/` and `/games/idleguild/` is unchanged after normalizing the preview prefix and existing build-time cache-busting timestamps. None includes the new stylesheet.
- After rebasing, the October 22 digest was checked again at desktop and mobile widths, with no horizontal overflow or broken images. Its four rendered stories match the updated data. Structured results: [current digest check](current-news-check.json), [navigation](navigation-checks.json).
- `git diff --check` passes. Structured results from the initial comparison: [browser checks](browser-checks.json), [content and scope checks](content-checks.json).

## Limitations / existing behavior

- The environment has no Ruby/Jekyll runtime. Browser previews were rendered with LiquidJS, the repository's Jekyll layouts/includes/data, and Markdown rendering; a native GitHub Pages/Jekyll build was not run locally.
- External video/article destinations were checked against the repository data, not exhaustively loaded or played. External imagery can still fail independently; the gallery and news retain readable fallbacks.
- The existing disabled Om/search controls and social icons without configured destinations remain as they were; no destinations or functionality were invented.
- Screenshots contain the current real digest; later automated digests will naturally change the displayed headlines.

This PR is for review only and must not be merged automatically.
