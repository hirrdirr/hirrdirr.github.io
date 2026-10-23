# Homepage: an open illustrated canvas

The supplied orange reference communicates through oversized type, open space and freely placed elements. The homepage previously still read as stacked panels. This revision takes that compositional direction while retaining the Japanese pixel art, branding and real content.

## What changed

- The existing pixel wordmark fills the opening composition. The header shares the page background and uses simple text navigation instead of a separate bordered toolbar.
- The original hero blends below the introduction. The garden accompanies the project area and the station closes the page. No artwork files were replaced or recolored.
- Projects use one prominent featured game followed by staggered, unframed illustrations. The section has more breathing room and no enclosing panel or sidebar divider.
- Videos use a larger first clip with three compact companions on desktop. Tablet uses two columns; mobile uses one featured clip followed by compact rows. The first clip has responsive YouTube thumbnail sources and falls back to its original thumbnail on a load error.
- News use an editorial list beside the heading, preserving complete titles, sources, dates, article images and existing fallbacks.
- A real “Utforska” anchor leads to the project section. All existing destinations and source images remain intact. Idle Guild remains non-clickable.

This is a deliberately more spacious, scrolling homepage, rather than a compact dashboard. Content order is unchanged. Decorative layers have no pointer interaction; hover movement is disabled when reduced motion is requested.

| Color | Dark | Light |
| --- | --- | --- |
| Canvas | Charcoal/plum `#1c191d` | Warm paper `#eee9df` |
| Text | Ivory `#f1ede5` | Ink `#29252c` |
| Accent | Muted sage `#c4ceab` | Olive `#536443` |

Only `index.html` and the existing homepage stylesheet `assets/open-home.css` change in the application. The stylesheet is still loaded only for the homepage. Games, Videos and News pages, gameplay, shared scripts, data, artwork and workflows remain unchanged. The branch incorporates the latest Slot Rush work on `main` at `3adf5a85f5a51452972d8257681804d40c7e1bd6`; those changes do not alter the homepage baseline.

## Screenshots

All images are actual Chrome rendering. The clean desktop images use the browser's native 1348 × 926 capture. The 1920 and mobile comparisons use an iframe with the requested CSS viewport, scaled to fit the capture area; they are not native-resolution exports. Harness controls or surrounding space can appear in those images. The full composition uses a document-height iframe at 1920px width.

| View | Dark | Light |
| --- | --- | --- |
| Clean desktop | [After](after-desktop-dark.jpg) | [After](after-desktop-light.jpg) |
| Before, 1920 × 1080 | [Before](before-1920-dark.jpg) | [Before](before-1920-light.jpg) |
| After, 1920 × 1080 | [After](after-1920-dark.jpg) | [After](after-1920-light.jpg) |
| Projects, 1920 × 1080 | [After](after-projects-dark.jpg) | [After](after-projects-light.jpg) |
| Mobile, 390 × 844 | [After](after-mobile-dark.jpg) | [After](after-mobile-light.jpg) |
| Video composition | [After](after-videos-dark.jpg) | — |
| Full composition | [After](after-full-dark.jpg) | — |

## Validation

- Chrome at 2560 × 1440, 1920 × 1080, 1366 × 768, 1280 × 720, 768 × 1024 and 390 × 844, in both themes: all 12 cases have no horizontal overflow or broken image elements. All four YouTube images load.
- All three decorative scenes select the correct dark/light asset. Play targets are 54px tall. Idle Guild has no link, button or tabindex.
- Home → Games → Videos → News → Home preserves the theme; secondary pages do not load the homepage stylesheet.
- “Utforska” lands at the project section with a 24px scroll margin. Keyboard Tab from the featured image reaches the play button with a visible 3px outline.
- All original source `href` and `src` attributes match `main`. The only added destination is the existing project section's new anchor. All rendered news fields match `_data/security_highlights.json`.
- `git diff --check` passes. Measurements are in [browser-checks.json](browser-checks.json); navigation and rendered news are in [navigation-checks.json](navigation-checks.json).

Native Ruby/Jekyll is unavailable locally. Preview rendering uses LiquidJS with the repository layouts, includes and data; a production GitHub Pages build has not been run locally. External article/video destinations were preserved, not exhaustively opened or played. Existing disabled Om/search controls and unconfigured social destinations are unchanged. No gameplay changes or gameplay regression claims are made.

One PR for visual review; do not merge automatically.
