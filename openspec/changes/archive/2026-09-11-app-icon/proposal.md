# Proposal: app-icon

## Why

The current app icon is a leftover of the old dark theme: a `#262f35` rounded
square with a red play triangle. The product is now Warm Earth themed (cream
`#f6f2ec` surfaces, vinyl-deck identity, `meta theme-color` already `#f6f2ec`),
so the icon looks foreign on a home screen and the manifest colors disagree
with the page (`background_color`/`theme_color` are still `#262f35`). The icon
was redesigned on the Superdesign canvas (draft `80062df9`, v7) and approved:
a cream squircle tile with a vinyl record, mint label, and the deck's tonearm
(counterweight, thin wand, pivot, headshell with teal cartridge).

## What Changes

- Replace `public/assets/images/icon.svg` with the approved Warm Earth vinyl
  artwork (1024 viewBox: `#e8e0d4` backing, cream squircle tile, record with
  grooves/mint label/teal spindle, tonearm assembly).
- Add `public/assets/images/icon-maskable.svg`: full-bleed cream background
  with the same artwork scaled into the maskable safe zone (80%), so installed
  apps can use circular/squircle masks without cropping the tonearm.
- Update the PWA manifest in `vite.config.ts`: `background_color` and
  `theme_color` become `#f6f2ec` (matching `meta theme-color`), and the
  maskable icon entry points to the new maskable SVG (still exactly two icon
  entries, `any` + `maskable`).
- Extend the PWA e2e scenario to verify both manifest icons resolve
  same-origin.
