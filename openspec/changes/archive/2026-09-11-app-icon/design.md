# Design: app-icon

## Decisions

- **Port the approved Superdesign draft as hand-written SVG, not a raster.**
  The draft (`.superdesign/tmp/icon-record-arm.html`, v7) is pure CSS boxes;
  every element maps 1:1 to an SVG shape (rect/circle with transform). SVG
  keeps a single crisp asset for 192px widgets and 512px store listings, which
  the existing manifest already relies on (`sizes: "any"`).
- **Two icon files instead of one dual-purpose file.** The `any` icon keeps
  the draft composition (canvas backing `#e8e0d4` + squircle tile at 92%):
  correct for favicons and tab icons. A maskable crop cuts the canvas corners,
  and the tonearm pivot/counterweight sit outside the 80% safe zone, so the
  same file cannot serve both purposes well. The maskable variant is full-bleed
  cream with the artwork group scaled 0.7 about the center: the worst point
  (counterweight corner, distance ~570/1024 from center) lands at ~400 < 410
  safe-zone radius.
- **Geometry is transcribed from the draft, tile coords +41 to canvas
  coords.** Pivot center (807, 217); wand 290x20 rotated 108deg from the pivot,
  its end hidden 30px under the headshell; headshell 94x49 rotated 118deg at
  (709, 508) with the teal cartridge (48x30) and stylus tab (21x7) as children
  in local coords; counterweight 56x120 rotated -141deg at (861, 149); record
  r306 + 12 ink rim at the center, mint label ring 114..122, teal spindle r26.
  Grooves are approximated with concentric `#111` rings every 16px instead of
  the CSS `repeating-radial-gradient`.
- **Manifest colors follow the page, not the old theme.** `meta theme-color`
  is already `#f6f2ec`; the manifest now matches for both `theme_color` and
  `background_color` so the installed splash does not flash dark before paint.
- **No manifest icon count change.** The e2e scenario pins `iconCount: 2`
  (`any` + `maskable`); it stays at two, only the maskable `src` changes, and
  the scenario learns to fetch both icons.

## Alternatives Considered

- **PNG exports (192/512).** Pixel-perfect but adds binary assets and a build
  export step; SVG serves all sizes and is what the manifest uses today.
- **Single maskable-safe icon.** Would force the favicon view to full-bleed
  cream (worse in browser tabs) or crop the tonearm when masked (worse on
  Android launchers). Two small files are cheaper than either compromise.
