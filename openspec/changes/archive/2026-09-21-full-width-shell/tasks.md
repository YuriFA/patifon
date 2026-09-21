## 1. Design System

- [x] 1.1 Amend the Layout section in `.superdesign/design-system.md`: replace "full width up to 1440px centered" and the "Side hairline borders, plinth-level page shadow" wording with the full-bleed shell description. Verify: the document no longer mentions a 1440px cap or side chrome for the shell.

## 2. Shell CSS

- [x] 2.1 In `src/styles/main.css`, remove `max-width: 1440px`, `margin-left/right: auto`, `border-left`, `border-right` and `box-shadow: var(--shadow-plinth)` from `.audio_player`, keeping the grid definition intact. Verify: Verify: at viewports wider than 1440px the shell spans the full window width with no side margins or borders.

## 3. Verification

- [x] 3.1 Run the full gate: `npm run typecheck && npm run lint && npm run format:check && npm run test:e2e` and confirm the existing shell scenarios (no page scroll, desktop two-column grid, mobile reflow) stay green. Verify: Verify: all checks pass with zero failures.
