# Homepage: closer to the supplied composition

Based on `main` at `bded3bf44a528d64afef12b043b18a360471b628` (PR #43).

The first homepage pass was too tall and treated the illustrations as separate areas. This revision follows the reference more closely: a compact hero, a wide featured game with adjacent copy, a smaller companion project list, an open video row and a compact news area. More of the page is visible at desktop sizes.

## Artwork flowing through the page

The existing hero, garden and station are now three decorative layers in one homepage background. The hero extends behind the next section; the garden continues along the right edge; the station finishes that edge beside the social links. CSS masks soften the transitions. Reading surfaces remain strong behind text and links, with the fades outside their edges.

On tablet and mobile, the garden and station move to the bottom of the composition. The hero remains behind the welcome text, with stronger shading for readability. No fixed background or scroll animation is introduced.

All ten original homepage artwork files are unchanged: the three dark/light scene pairs and the four game images. Each scene appears once; no new artwork was generated. Existing theme variables still select the dark/light files, and the theme script is unchanged.

## Palette and components

| Treatment | Dark | Light |
| --- | --- | --- |
| Page base | Deep blue-green `#061d27` | Warm paper `#f2efe5` |
| Main text | Ivory `#f2f3eb` | Deep green `#253e40` |
| Accent | Lantern gold `#ffc27b` | Warm brown `#935029` |

Branding, navigation icons and section headings are more prominent. Project spacing and artwork proportions are tighter. Video previews use a modest cinematic crop on desktop and the full 16:9 ratio on mobile. Four real news entries use compact editorial rows/columns rather than a tall image-first arrangement.

Only `index.html` and the existing homepage-only `assets/open-home.css` change. The shared layout still loads this stylesheet only for the homepage. Games, Videos, News, game code, data, workflows, shared scripts and original images are unchanged. Idle Guild remains non-clickable with its Coming Soon label.

## Screenshots

The before images show the merged PR #43 homepage. All after images are real Chrome captures. The preview uses the stated CSS viewport dimensions and scales the iframe to fit the available capture area; these are not native-resolution image exports. Full-page views use the document height at 1920px width, so the whole composition can be compared with the supplied reference.

| View | Before | After |
| --- | --- | --- |
| 1920 × 1080, dark | [Before](before-1920-dark.jpg) | [After](after-1920-dark.jpg) |
| 1920 × 1080, light | [Before](before-1920-light.jpg) | [After](after-1920-light.jpg) |
| Full composition, dark | — | [After](after-full-dark.jpg) |
| Full composition, light | — | [After](after-full-light.jpg) |
| 2560 × 1440, dark | — | [After](after-2560-dark.jpg) |
| 390 × 844, dark | — | [After](after-mobile-dark.jpg) |
| 390 × 844, light | — | [After](after-mobile-light.jpg) |

## Validation

- Chrome at 2560 × 1440, 1920 × 1080, 1366 × 768, 1280 × 720, 768 × 1024 and 390 × 844, each in dark and light: 12 cases, with no horizontal overflow or broken image elements. Four actual YouTube thumbnails loaded in every case.
- All three scene backgrounds select the correct theme variant. Theme preference survives Home → Games → Home; Games does not load the homepage stylesheet.
- Keyboard Tab reaches the play link with a visible 3px outline. The play target is at least 44px tall. Idle Guild contains no interactive element.
- All original `href` and `src` attributes are preserved. Every rendered news title, source, date and URL matches the current security-digest data. All four video entries remain present.
- Desktop, laptop, tablet and mobile views were inspected, including the complete composition and the mobile footer transitions. Contrast behind light-theme text was strengthened after visual review.
- `git diff --check` passes. Detailed DOM measurements and data checks: [browser-checks.json](browser-checks.json).

Native Ruby/Jekyll is unavailable in this environment. The browser preview uses LiquidJS with the repository's layouts/includes/data; no local GitHub Pages production build was run. External article/video destinations were preserved and checked against source data, not exhaustively opened or played. Existing disabled controls and unconfigured social destinations remain unchanged.

For visual review; do not merge automatically.
