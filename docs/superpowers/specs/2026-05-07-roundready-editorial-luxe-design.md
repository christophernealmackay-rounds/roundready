# RoundReady — Editorial-Luxe Visual Elevation

**Date:** 2026-05-07
**Status:** approved
**Scope:** All 8 tabs, topbar, settings panel, charts, reports

---

## 1. Vision

The current RoundReady UI is functional but under-utilizes its own design vocabulary. The fonts (Fraunces, Inter Tight, JetBrains Mono), the warm cream + blue ink palette, and the plum accent color are all distinctive choices that the existing implementation treats too cautiously. This elevation lets that vocabulary breathe.

**Direction:** *Editorial-luxe clinical instrument.* Premium quarterly clinical journal crossed with a precision data product. Every page should feel like it was set with care: confident hierarchy, generous negative space, deliberate typographic accent, no bouncy or "fun" motion.

**The signature feeling:** when the user opens a tab, the page composes itself with a Fraunces hero heading sliding into place, KPI numbers staggering in below, and supporting content fading in last. The whole motion lasts under 400ms but reads as deliberate, not flashy.

---

## 2. What changes

### Global

- New CSS variable layer for refined shadows (`--shadow-card`, `--shadow-card-hover`, `--shadow-hero`), motion easing tokens (`--ease-luxe`, `--ease-luxe-out`), and an SVG noise texture data URL.
- Body uses Inter Tight at the existing 13px scale (no change to base sizes).
- Page wrappers gain a max-width grid of 1240px (currently varies between pages — consolidate).

### Visual primitives (built in `src/components/ui/`)

| Component | Purpose |
|---|---|
| `<PageHero>` | Per-tab hero. Eyebrow kicker (10px tracked uppercase), Fraunces display 44–56px headline with optional italic accent word, optional caption. Used on every tab. |
| `<SectionLabel>` | Replaces the inline `<div style="textTransform: uppercase">` pattern repeated across pages. Optional 2px colored accent rule prefix. |
| `<RefinedCard>` | Standard card surface: 1px hairline + 1px white inner highlight on top edge + soft warm shadow. Hover lifts 1px and darkens border. |
| `<KpiCard>` | Number (28–36px Mono), label below in 10px tracked uppercase. Optional `delta` prop for arrow + magnitude. Optional `sparkline` data prop renders a 14px-tall hover-revealed line chart. |
| `<RefinedTooltip>` | Custom Recharts tooltip. Warm cream surface, mono numerals, Fraunces caption for the dimension label. Soft border + soft shadow. |

### Topbar

- Layered atmospheric treatment: existing `linear-gradient(180deg, #1A5FA8, #155291)` retained as base, with a 1% SVG noise overlay to prevent banding and add subtle depth. 1px highlight rule on bottom edge.
- "RoundReady" logo gets a small geometric mark — a 4px solid blue-ink dot — before the wordmark.
- Date label gets a tiny green dot indicator (online/synced status connotation).
- Tab nav active state: existing white underline + small plum dot above the underline for the active tab only.

### Dashboard (signature surface)

- Replace the bare date-pill row with `<PageHero>`: eyebrow `DASHBOARD · OVERVIEW`, headline `Today,` (display 44px) + `Thursday — May 7` (Fraunces italic 32px on the next line). Date pills move below the hero.
- Operational KPI row reorganized: 1 hero card on the left (Completion Rate %, larger, with sparkline + delta vs. previous range) + 4 secondary cards.
- QAPI compliance card: replace the empty progress-bar pattern with a richer composition — Fraunces 36px italic for the % number, status icon stays, and a thin gradient bar from `--green-tint` to `--green` showing fill.
- "Open Issues" panel relabeled **"WATCH LIST"** with each item rendered with italic resident name, mono room number aligned right, and the question text wrapped in French quotation marks « … » as a soft editorial touch.
- Census card: Fraunces 44px italic for the `20`, capacity bar restyled with subtle inner shadow.

### Other tabs (broad polish via primitives + tab-specific touches)

- **Angels:** PageHero ("Angels — *the people who round*"), absent-bar gets a soft amber gradient instead of flat tint, row hover state.
- **Residents:** PageHero, list rows rendered with `--hairline-soft` separators, subtle row-hover wash.
- **Issues:** PageHero, filter pills upgraded (active = inset glow), notification trail prefixed with a small bell icon.
- **Users:** PageHero, role badges with subtle border + lucide icon, department dropdown polished.
- **QAPI:** PageHero, sub-tab nav refined to match topbar pattern, QAA Notes editor moved to Fraunces with book-margin reading width.
- **Rounds:** PageHero, drag-drop drop-zone glows plum on hover, question rows separated with `--hairline-soft`.
- **Reports (signature):** Generate-report preview becomes a *real document mockup* — facility masthead in Fraunces, metadata in mono right-aligned, KPI scorecard grid styled as a printed report, signature/date stamp area at the bottom.

### Settings panel

- Section labels switch to `<SectionLabel>` pattern.
- Toggle pill style refined (deeper blue when on, slight inset shadow on the track when off).
- Otherwise structurally unchanged — content already covers the right sections.

### Motion

One signature: **page-load orchestrated reveal**, fired once on mount of any `(app)` route page:
1. PageHero fades in + slides up 8px (240ms, `var(--ease-luxe-out)`)
2. KPI cards stagger in (60ms apart, total ≈ 360ms)
3. Body content fades in (180ms)

Plus three small interactions:
- KPI hover: sparkline + delta slide in (200ms)
- Chart tooltip: fade in (120ms, `var(--ease-luxe)`)
- Card hover: 1px lift + border darken (180ms)

Animations use `cubic-bezier(0.32, 0.72, 0.16, 1)` for `--ease-luxe-out` and `cubic-bezier(0.4, 0, 0.2, 1)` for `--ease-luxe`. No bouncy easing.

---

## 3. What does NOT change

- The 8-tab navigation order or labels.
- The color tokens specified in CLAUDE.md.
- The font choices (Fraunces, Inter Tight, JetBrains Mono) — only their *application* gets bolder.
- Functional behavior. Every fix from the prior 10 testing iterations stays intact.
- No new dependencies. Recharts and Lucide React already cover charts and icons.

---

## 4. Build order

1. CSS variable additions in `globals.css` (~15 min)
2. Five visual primitives in `src/components/ui/` (~45 min)
3. Topbar elevation (~20 min)
4. Dashboard end-to-end refinement (~60 min)
5. Apply PageHero + KpiCard + RefinedCard across remaining 7 tabs (~60 min)
6. Reports signature deep-dive (~45 min)
7. Motion layer wired into PageHero + KpiCard + RefinedTooltip (~20 min)
8. Final smoke + screenshot review + run all tests (~20 min)

Total estimate: ~5 hours focused work.

---

## 5. Acceptance

- All 8 tabs render with the new vocabulary applied.
- `npm run build` clean.
- Existing 21 vitest + 59 pytest tests still green (pure visual changes shouldn't move them).
- Browser smoke at full viewport: no console errors, no broken layouts at 1024px.
- Reports preview reads as a generatable document, not a dashboard.
- The page-load motion is visible but not slow (<400ms total).

---

## 6. Risk

- **Motion can feel slow if poorly tuned.** Mitigation: cap at 240ms hero + 360ms stagger total. Test on every navigation.
- **Bold typography can hurt readability if rushed.** Mitigation: Fraunces stays display-only (32–56px); body remains Inter Tight at existing sizes.
- **Dashboard re-layout may break on small viewports.** Mitigation: keep grid responsive (`repeat(auto-fit, minmax(...))`) and re-test at 1024px.

---

## 7. Out of scope

- New tabs or new feature surfaces.
- Backend changes.
- Dark theme.
- Full responsive redesign for sub-1024px viewports (the original spec's minimum).
- Print stylesheet (Reports gets *visual* document treatment, but no `@media print` rules).
