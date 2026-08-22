# PPPP Incident 2026-08-22: blank navigation destinations

## User-visible symptoms

- Home `Në pritje` project click / `Hap projektin` could end on an apparently blank page.
- Project Workspace could appear fully blank except global floating controls.
- `Projektet` could appear stuck on Home.
- Supplier comparison and project navigation had recently been modified, making this a regression investigation rather than a data-loss incident.

## Confirmed root defect

`pristeel-project-workflow-legacy-capture-v1.js` v2 introduced a global DOM heuristic that searched the entire document for `Mbyll projektin`, `Projekt i ri`, and `Eksporto`, climbed to a common ancestor, marked that node as `pwf-global-project-strip`, then hid it with:

`body:has(#page-workspace-project.active) .pwf-global-project-strip { display:none!important }`

The common ancestor was not guaranteed to be a small action bar. In Safari/live DOM it could contain most of the app, so entering Project Workspace could hide the application itself.

## Recovery implemented on feature branch

Branch: `feature/systematic-navigation-recovery-20260822`
Backup of broken main before recovery: `backup/pre-navigation-recovery-20260822` at `6d3fabd7e196ac3f63c50b6a6e3daef8393cf1dd`.

- Removed all global ancestor discovery/hiding from the project compatibility layer.
- All ribbon/header/detail cleanup is now scoped to descendants of `#page-workspace-project`.
- Supplier `Detaje` remains inline and cannot navigate/rerender the project.
- Project header cleanup may only modify `.pst-pi-actions` inside Project Workspace.
- `Projektet` continues through the existing top-level Workspace router chain. No new router was introduced.
- Cache key for the corrected project capture module was bumped from `flow1` to `flow2`.
- Critical workflow/navigation tests are now part of `npm test`, rather than existing only as uncalled test files.
- Added a Home -> waiting project -> Project Workspace -> Projects navigation smoke.
- Added static ownership guards that forbid the unsafe pattern from returning.
- Added `docs/NAVIGATION_CONTRACT.md` and `docs/NAVIGATION_TEST_MATRIX.md`.

## Data safety

This recovery is UI/navigation only. It does not alter project prices, offers, email state, project identity, business records, Supabase schema, OCR, local semantic AI, or human approval gates.

## Release rule

Do not merge until the full PRISTEEL test suite and Pages/runtime checks are green. After merge, live authenticated Safari verification remains required and must be recorded separately from CI verification.
