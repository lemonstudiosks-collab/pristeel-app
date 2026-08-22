# PPPP Navigation Contract

Status: canonical runtime contract as of 2026-08-22.

## Top-level ownership

`pristeel-workspace-architecture-v1.js` and its existing release wrapper `pristeel-workspace-release-fix-v3.js` own top-level Workspace navigation (`home`, `projects`, `inbox`, `commercial`, `finance`, `contacts`, `apps/files`).

Home modules may own Home data/rendering, but non-Home routes must delegate to the router chain they captured. They must not replace Projects or Project Workspace with blank fallback pages.

## Project ownership

`pstOpenProjectWorkspace(project_id)` is the only canonical entry to a project.

`pristeel-project-workflow-canonical-v1.js` owns the visible project workflow:
- Përmbledhja
- Prokurimi
- Ekzekutimi
- Financat
- Skedarët
- Komunikimi

Procurement stages are:
- BOM
- RFQ
- Ofertat e furnitorëve
- Krahasimi i ofertave
- Çmimi i shitjes
- Oferta për klientin

Legacy editors may still be used behind compatibility bridges, but they must return to the same project and same canonical stage.

## Hard safety rules

1. A project-only UI module may never hide or mutate ancestors outside `#page-workspace-project`.
2. No CSS selector may hide global app chrome based on `:has(#page-workspace-project.active)` or equivalent ancestor discovery.
3. Project cleanup queries must be scoped to `#page-workspace-project`.
4. Supplier `Detaje` expands/collapses inline. It must never navigate or rerender the project.
5. `Projektet` must activate the Projects workspace and deactivate Home/Project pages.
6. Home waiting/action/project cards must open `pstOpenProjectWorkspace(project_id)` and land on a nonblank Project Workspace.
7. Home rendering must not steal navigation back from a non-Home page after the user navigates.
8. No global `MutationObserver` or polling loop may be introduced to win routing races.
9. Navigation/UI fixes may not change prices, offers, project identity, send email, or alter business records.
10. Every navigation regression fixed in production must receive a smoke test before merge.

## Incident 2026-08-22

A global project-strip cleanup heuristic searched the whole document for `Mbyll projektin / Projekt i ri / Eksporto`, climbed to a common ancestor and tagged it for `display:none` while Project Workspace was active. In Safari the selected ancestor could contain most of the application, creating an apparently blank page. This pattern is retired and forbidden by tests.
