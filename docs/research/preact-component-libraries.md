# Component / accessibility libraries that work natively with Preact

Researched 2026-09-09 against primary sources (official docs, GitHub repos/issues, npm
registry). Versions, release dates, and maintenance status quoted here were observed on
that date and **will drift** — re-check the linked sources before acting on them.

Follows up on [ADR-0001](../adr/0001-preact-signals-react-aria-for-ui.md): we adopted
Preact + @preact/signals, planned react-aria for accessibility primitives, and in
practice react-aria's event plumbing did not fire reliably over `preact/compat`, so the
redesign shipped native controls instead. Question: is there a component/a11y library
that works **natively** with Preact (no React shim) worth adopting in phases 2–3?

Needs to cover: Dialog (focus trap), Tabs (visualizer mode switcher), Popover, Select,
Combobox (radio search with suggestions), virtualized list for a large track library.
Constraints: PWA bundle budget, a11y quality, maintenance status; no SSR; custom
HI-FI visual design (so styled design-system components fight us, headless does not).

## Executive summary

Nothing replaces our native-first approach wholesale, and no serious Preact-native UI
kit exists — but there is exactly one library worth adopting for phases 2–3:
**Zag.js**, which ships a first-party `@zag-js/preact` adapter (published in lockstep
with the rest of the monorepo, Aug 2026), models every component as a headless state
machine tested against the WAI-ARIA Authoring Practices with per-machine Playwright
e2e suites, and covers Dialog, Tabs, Popover, Select, and Combobox while leaving
styling — our bespoke HI-FI look — entirely to us. Keep hand-built native controls as
the default; reach for Zag machines only for the genuinely hard a11y patterns (dialog
focus management, combobox keyboard/listbox semantics). For the virtualized track
library, use `@tanstack/virtual-core` directly — it is framework-agnostic TypeScript
(no React dependency) even though TanStack Virtual ships no official Preact adapter.
Avoid the Web Components suites for this project: Shoelace is sunset, Material Web is
in maintenance mode pending new maintainers, Web Awesome gates Combobox (and
virtualized data grid) behind its paid Pro tier, and Lit/shadow-DOM styling was already
rejected in ADR-0001 for the BEM redesign. react-aria stays off the table: Adobe
closed the Preact-support request as *not planned*, and the compat layer keeps drifting
against React internals their code relies on.

## Comparison

Coverage key: D Dialog, T Tabs, P Popover, S Select, C Combobox, VL virtualized list.
✓ = covered, ~ = partial/building block only, ✗ = not covered. Bundle numbers are gzip,
measured/published 2026-09-09 unless noted.

| Library | Type | Preact support | D/T/P/S/C/VL | A11y evidence | Bundle cost | Maintenance (2026-09) |
| --- | --- | --- | --- | --- | --- | --- |
| Native controls (status quo) | — | native | ✗/~ per MDN | platform UX + our audits | ~0 | platform |
| [Zag.js](https://github.com/chakra-ui/zag) | headless machines | **native adapter** `@zag-js/preact` | ✓/✓/✓/✓/✓/✗ | APG-modelled + per-machine Playwright e2e ([README](https://github.com/chakra-ui/zag)) | per-machine packages, headless TS | active: 1.43.3 published 2026-08-31 ([npm](https://www.npmjs.com/package/@zag-js/preact)) |
| [TanStack Virtual](https://tanstack.com/virtual/latest) | headless virtualizer | **no adapter**; `virtual-core` usable directly | ✗×5/✓ | n/a (no a11y logic; our markup) | ~7.5 kB measured for the React wrapper; core is a plain TS class | active: core 3.17.9 on 2026-09-07 ([npm](https://www.npmjs.com/package/@tanstack/virtual-core)) |
| [Web Awesome](https://webawesome.com) | styled Web Components (Lit) | native (custom elements) | ✓/✓/✓/✓/**Pro**/**Pro** | "built with accessibility in mind" ([README](https://github.com/shoelace-style/webawesome)); per-component docs | shared Lit runtime + per component | active (Font Awesome); MIT core + paid Pro ([components](https://webawesome.com/docs/components/)) |
| [Lion](https://github.com/ing-bank/lion) | white-label WC (Lit) | native (custom elements) | ✓/✓/✗ (overlays system)/✓ (select-rich)/✓/✗ | "aimed at compliance with the WCAG 2.2 AA standard" ([README](https://github.com/ing-bank/lion)) | Lit + per component | active: @lion/ui 0.21.1 on 2026-09-04 ([npm](https://www.npmjs.com/package/@lion/ui)) |
| [Material Web](https://github.com/material-components/material-web) | styled WC (Lit) | native (custom elements) | ✓/✓/✗ (menu only)/✓/✗/✗ | "Fully tested for accessibility" ([announcement](https://github.com/material-components/material-web/discussions/5642)) | own [size table](https://github.com/material-components/material-web/blob/main/docs/size.md): Dialog 5.0, Tabs 7.7, Select 26.6, all 72.1 kB | **maintenance mode pending new maintainers** (Jun 2024) |
| [Spectrum WC](https://github.com/adobe/spectrum-web-components) | styled WC (Lit) | native (custom elements) | ✓/✓/✓/✓ (picker)/✓/✗ | Adobe internal product use; WCAG-focused review culture ([repo](https://github.com/adobe/spectrum-web-components)) | Lit + Spectrum CSS tokens per component | active: 1.12.2 line published 2026-09-03 ([npm](https://www.npmjs.com/package/@spectrum-web-components/dialog)) |
| [FAST](https://github.com/microsoft/fast) | WC suite on fast-element | native (custom elements) | ✓/✓/~ (anchored-region)/✓/✓/✗ | ARIA-pattern base classes ([fast-foundation](https://fast.design/docs/1.x/api/fast-foundation/)) | fast-element runtime + per component | element v3 alive (3.0.2, Jul 2026); **ready-made `fast-components` frozen at v2.30.6**; Microsoft points "ready-made" to Fluent UI ([README](https://github.com/microsoft/fast)) |
| [Shoelace](https://github.com/shoelace-style/shoelace) | styled WC (Lit) | native | ✓/✓/✓/✓/✗/✗ | same lineage as Web Awesome | Lit + per component | **sunset — no active development** ([README](https://github.com/shoelace-style/shoelace)); last publish 2.20.1 on 2025-03-11 |
| [react-aria](https://react-spectrum.adobe.com/) | headless hooks (React) | **compat shim only; unsupported** | ✓/✓/✓/✓/✓/✓ | excellent, APG-based | headless TS | very active — but Preact officially out ([#781](https://github.com/adobe/react-spectrum/issues/781)) |
| Preact-native kits ([awesome-preact](https://github.com/preactjs/awesome-preact)) | kits | native | ✗ (nothing at this level) | ad-hoc | small | hobby-scale, no serious maintained kit |

## Candidates

### What the Preact project itself offers

- **`preact/compat` is the official answer for React libraries**, and it is a shim:
  "Libraries and Components originally written for React work seamlessly with our
  compatibility layer" — via bundler aliasing of `react`/`react-dom` to Preact
  ([getting-started guide](https://preactjs.com/guide/v10/getting-started/#aliasing-react-to-preact)).
  The docs promise compatibility, not parity; the failure modes we hit are known-class
  (see react-aria section).
- **`preact-custom-element`** (4.6.0, published 2025-10-30,
  [repo](https://github.com/preactjs/preact-custom-element)) registers a Preact
  component as a v1 custom element; attributes map to props, observed attributes must
  be declared. Useful for islands that need to look like elements, but it is a wrapper,
  not a component library.
- **Core is healthy**: Preact 10.29.8 published 2026-09-08, 11.0.0 is in RC
  ([releases](https://github.com/preactjs/preact/releases)); measured ~4.8 kB gzip
  ([Bundlephobia](https://bundlephobia.com/package/preact)).
- **No official "Preact Catalyst" exists today.** `github.com/preactjs/catalyst`
  returns 404, no `catalyst` package appears in an npm search for Preact, and the
  curated [awesome-preact](https://github.com/preactjs/awesome-preact) list has no
  Catalyst entry. The current official starter is
  [`create-preact`](https://github.com/preactjs/create-preact) (Vite-based). Treat any
  Catalyst reference as stale or third-party.

### react-aria over preact/compat: officially unsupported, with known failure modes

- Adobe's own tracking issue for Preact support was **closed as "not planned"**
  (2024-04-01): "This is not work that the team is able to take on in the near future"
  ([react-spectrum#781](https://github.com/adobe/react-spectrum/issues/781)). The
  [react-aria docs](https://react-spectrum.adobe.com/) never mention Preact.
- The maintainer's rationale in that thread matches what we observed: react-aria
  relies on React specifics — the synthetic event system ("focus bubbling in React but
  not in the DOM") and React's `key` handling
  ([comment](https://github.com/adobe/react-spectrum/issues/781#issuecomment-664012728));
  the team's working list of compat breakages from a real integration attempt is
  [mischnic's gist](https://gist.github.com/mischnic/15d81e667cda5c6fa7ab60d0bc77d34b).
- Concrete compat drift incidents: `flushSync` missing from compat broke
  `@react-aria/virtualizer` ([preact#2636](https://github.com/preactjs/preact/issues/2636),
  fixed 2022 in [preact#3094](https://github.com/preactjs/preact/pull/3094)); the
  unsupported third (`getServerSnapshot`) argument of `useSyncExternalStore` broke
  react-aria-components' `Collection` plumbing — Tabs, Select, Combobox, ListBox —
  under Preact SSR ([preact#4972](https://github.com/preactjs/preact/issues/4972),
  closed completed 2026-07; SSR-specific, and we have no SSR); and a react-aria
  Combobox that rendered with React but failed under `preact/compat` in Astro
  ([astro#4107](https://github.com/withastro/astro/issues/4107)).

Conclusion: react-aria is excellent React code and unsupported Preact code. Do not
reattach it.

### Web Components route (framework-agnostic, works inside Preact islands)

Custom elements interoperate with Preact natively — attributes/children just work;
the usual caveats are setting **properties** (not attributes) for complex values,
listening to custom events, and shadow-DOM styling (ADR-0001 already rejected Lit for
exactly the shadow-DOM/BEM reason).

- **Shoelace — sunset.** "There is no active development on this codebase… do not open
  issues, pull requests, or feature requests here"
  ([README](https://github.com/shoelace-style/shoelace)). Last npm publish 2.20.1,
  2025-03-11. Not adoptable; superseded by Web Awesome.
- **Web Awesome** ([repo](https://github.com/shoelace-style/webawesome),
  [components](https://webawesome.com/docs/components/)) — Font Awesome's successor,
  Lit-based, MIT-licensed core with a **paid Pro tier**. Coverage for our needs from
  the component catalog: Dialog (free), Tab/Tab Group/Tab Panel (free), Popover (free),
  Select (free); **Combobox is Pro**, and the only virtualized offering is the Pro
  Data Grid. Strong a11y posture on paper ("built with accessibility in mind", docs
  FAQs on accessibility), backed by the team's commercial stakes. Risks for us: Pro
  paywall on two of our six needs, and theming a design system onto our HI-FI custom
  look (the same fight that sunk the Lit option in ADR-0001).
- **Lion** ([repo](https://github.com/ing-bank/lion)) — ING's white-label web
  components, "aimed at compliance with the WCAG 2.2 AA standard", explicitly built to
  be **extended into your own design system** rather than themed; actively published
  (@lion/ui 0.21.1, 2026-09-04). Component set
  ([docs/components](https://github.com/ing-bank/lion/tree/master/docs/components)):
  combobox, dialog, select/select-rich, tabs, listbox, tooltip, form controls —
  but **no popover** (floating content goes through its `overlays` system and tooltip)
  and no virtualized list. The extend-and-subclass model is elegant but pulls its
  Lit/shadow-DOM architecture into our styling pipeline.
- **Material Web (`@material/web`) — maintenance mode, verified.** Official
  announcement (2024-06-10): "Material Design is focusing on support for Google's
  large-scale internal Wiz framework, and has reassigned the engineers… This places
  MWC into maintenance mode… New features and components are no longer planned.
  GitHub PRs will not be accepted by default"
  ([discussion #5642](https://github.com/material-components/material-web/discussions/5642));
  the README still says "MWC is in maintenance mode pending new maintainers". Coverage:
  Dialog, Tabs, Select — no Combobox, no Popover (Menu only), no virtualization. The
  team's own accessibility milestone claim ("fully tested for accessibility") is real,
  but adoption means adopting an orphaned roadmap; bundle cost is material too (Select
  alone is 26.6 kB gzip per the [official size table](https://github.com/material-components/material-web/blob/main/docs/size.md),
  updated 2025-08-20).
- **Spectrum Web Components** ([repo](https://github.com/adobe/spectrum-web-components))
  — actively developed by Adobe's design engineering team (1.12.2 components published
  2026-09-03; packages exist for dialog, tabs, popover, combobox, picker, etc.).
  Proven a11y through Adobe product use. Best-in-class coverage on our list — but it
  brings Adobe's Spectrum design language and token system, which we would fight to
  bend to the HI-FI mockup.
- **FAST** ([repo](https://github.com/microsoft/fast)) — split verdict. The
  `@microsoft/fast-element` base (v3.0.2, 2026-07-29) is alive, but the **ready-made
  `fast-components` suite is frozen at v2.30.6** and no longer exists on the repo's
  main branch (only `fast-element` and `fast-router` remain under
  [packages](https://github.com/microsoft/fast/tree/main/packages)); Microsoft's README
  routes "I just want ready-made components" to
  [Fluent UI Web Components](https://github.com/microsoft/fluentui/tree/master/packages/web-components)
  instead. The v1/v2 suite did cover dialog, tabs, select, combobox, anchored-region
  ([fast-components API](https://fast.design/docs/1.x/api/fast-components/)), so it is
  usable but not a going concern as a component source.

### Headless libraries with official Preact adapters

- **Zag.js — the one real match.** Finite-state-machine core ("write once, use
  everywhere"), with adapters for React, Solid, Svelte, Vue, Vanilla — **and Preact**
  ([packages/frameworks](https://github.com/chakra-ui/zag/tree/main/packages/frameworks)
  contains `preact`; npm confirms `@zag-js/preact` is "The preact wrapper for zag",
  v1.43.3 published 2026-08-31, same release train as the other adapters).
  Accessibility is the project's stated focus: machines modelled on the WAI-ARIA
  Authoring Practices with a Playwright e2e suite per machine
  ([README](https://github.com/chakra-ui/zag#guiding-principles)). Machines cover
  Dialog, Tabs, Popover, Select, Combobox, Listbox and ~45 more
  ([packages/machines](https://github.com/chakra-ui/zag/tree/main/packages/machines)).
  Caveats: the docs site's install snippets enumerate React/Solid/Vue/Svelte tabs, so
  the Preact adapter is under-documented on [zagjs.com](https://zagjs.com) despite
  shipping; no virtualizer (pair with TanStack or hand-rolled); headless means we
  style everything ourselves — which, for our custom design, is the point.
- **TanStack** — mixed. Official **first-party Preact packages exist for Query
  (@tanstack/preact-query 5.102.8), Table (@tanstack/preact-table 9.2.4) and Form
  (@tanstack/preact-form 1.30.5)**, all published Aug 2026 ([npm](https://www.npmjs.com/package/@tanstack/preact-query)).
  **Virtual has no Preact adapter**: the framework docs list React, Solid, Svelte,
  Vue, Lit, Angular, Marko ([docs/framework](https://github.com/TanStack/virtual/tree/main/docs/framework)),
  and `@tanstack/react-virtual` exports only React hooks
  ([source](https://github.com/TanStack/virtual/blob/main/packages/react-virtual/src/index.tsx)).
  The good news: `@tanstack/virtual-core` (3.17.9) is the framework-agnostic
  `Virtualizer` class the React wrapper is a thin shell over — a Preact integration is
  a small amount of our own glue (observe scroll element, re-render window slice via a
  signal), no compat layer anywhere. The React wrapper's 7.5 kB gzip size
  ([Bundlephobia](https://bundlephobia.com/package/@tanstack/react-virtual)) bounds the
  cost; the core is smaller.

### Preact-native UI kits

[awesome-preact](https://github.com/preactjs/awesome-preact)'s Components section is
the complete census: small single-purpose components, ports (Pant from Vant), hobby
kits (Preact Fluid, Kamod UI, Tailored Components). Nothing covers dialog/tabs/
combobox-class accessibility with real maintenance. Honest conclusion: the
Preact-native UI-kit ecosystem does not exist at the level we need; Preact projects
either use compat, Web Components, or headless machines (Zag).

## What this changes for us

1. **Keep native-first as the default.** `input[type=range]`, `button`, native
   `<dialog>`/`popover` attributes where the platform gives them to us. Nothing in
   this research beats that for bundle cost, and ADR-0001's instinct was right.
2. **Adopt Zag.js (via `@zag-js/preact`) when a phase needs a hard a11y pattern** —
   realistically: Dialog with focus trap (phase 2) and Combobox for radio search
   (phase 3). Tabs and Popover are fine native-first (`<popover>` API / simple
   `tablist` markup) but Zag has tested machines if we want them. Introduce it as
   `useMachine` + our JSX, styled entirely by our CSS; no compat alias, no design
   system to fight. Watch the docs gap — the Preact adapter ships but zagjs.com's
   snippets do not show it yet; the API is the same `useMachine`/`connect` shape as
   the React docs.
3. **Virtualized track library: `@tanstack/virtual-core` directly** (no adapter exists
   for Preact), or hand-roll — the window-slice + signal integration is small. Do not
   pull `@tanstack/react-virtual` through compat for this.
4. **Do not adopt a Web Components suite for phases 2–3**: Shoelace (sunset) and
   Material Web (maintenance mode) are out on maintenance alone; Web Awesome gates
   Combobox/virtualization behind Pro; Spectrum WC and Lion would drag their design
   language or Lit/shadow-DOM architecture into the BEM-based HI-FI redesign that
   ADR-0001 already rejected Lit over. Revisit only if we ever want ready-made
   visuals more than bespoke ones.
5. **react-aria stays rejected** — Adobe closed Preact support as not planned, and the
   compat failure modes on record (synthetic events, `key` handling,
   `useSyncExternalStore`) are exactly the class of bug that bit the redesign.
6. Update ADR-0001's "Considered options" pointer to this file when phase 2 starts:
   the escape hatch it named ("react-aria via compat") is dead; the working escape
   hatch is `@zag-js/preact`.

*Versions and status quoted as of 2026-09-09; check the linked sources before
acting — maintenance statuses especially can change quickly (Shoelace and MWC both
changed posture within the last two years).*
