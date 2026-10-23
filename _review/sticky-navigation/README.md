# Sticky navigation review

The shared header stays at the top while scrolling Home, Games, Videos, News and the news archive. The homepage header uses its existing dark/light canvas color so content does not show through it.

The shared page body can grow with its content; the old `height: 100%` constrained the sticky header's containing block. Root scroll padding reuses the existing `--site-header-height` measurement in `site.js`, including mobile navigation wrapping. Existing 24px section scroll margins remain in place. No JavaScript, artwork or game files changed.

Validation in Chrome using the repository layouts/includes/data rendered with LiquidJS:

- All three homepage quick links at 390 × 844, 768 × 1024 and 1920 × 1080 in dark and light themes: sticky header top is 0; target sections land 24px below the header; no horizontal overflow.
- Scrolling to the page bottom on Home, Games, Videos, News and the archive at 390 and 1920 pixels: header stays visible.
- Keyboard activation of Games, Videos and News section links on mobile: targets remain below the header.
- Theme control works while scrolled; homepage header matches the active theme.
- `git diff --check` passes.

Requested-size checks use real browser iframes sized to the specified CSS viewports. The two screenshots use the native browser viewport, 1348 × 936. Dark shows the videos section; light shows the projects section. Measurements are in `checks.json`.

A native Jekyll production build and gameplay tests were not run. This change does not implement the separate idea of reusing section artwork on the homepage.
