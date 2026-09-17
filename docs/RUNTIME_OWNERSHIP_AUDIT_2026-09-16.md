# PPPP runtime ownership audit — 2026-09-16

Baseline: `origin/main` at `a9b1cd95214ef10c4446989526394f29d26cc79c`. This audit lives on isolated branch `codex/runtime-ownership-audit`. No production or business-data changes have been made.

## Production connectivity

Supabase project `awqfpnzqwfjrjefoktgd` reported `ACTIVE_HEALTHY`. A direct read-only `select public.pppp_chatgpt_bridge_manifest_v1();` completed successfully and returned bridge version `chatgpt-command-v19`. The reported connection timeout did not reproduce in this check; it does not establish that the connector cannot intermittently time out. No database write was attempted.

## Actual loading path

`pristeel-project-emails.js` loads the ordered runtime modules. Near its end, `pristeel-redesign-finalizer-v1.js` loads project-centric workflow dynamically. `pristeel-primary-nav-resilience-v1.js` is in the ordered bootstrap. `pristeel-home-canonical-interaction-v1.js` dynamically starts four presentation scripts independently: Opportunities mindmap, global full-width shell, Finance mindmap, and production surface owner. Their relative completion order is not enforced by that loader.

## Confirmed ownership collisions

| Surface | Existing competing owners | Conflict observed in code |
| --- | --- | --- |
| Global navigation / Back | Workspace architecture + release fix, primary-nav resilience, global-fullwidth shell, production-surface owner | The shell creates `#pst-global-back-home` with its own click handler. Production surface captures the same click on `window` and stops propagation, then directly mutates every `.page`, rerenders Home, and schedules three more Home repairs. Primary nav has a separate `openHome` route. |
| Opportunities | Project-centric workflow, Opportunities mindmap v5, production-surface owner | Mindmap v5 filters cards and owns a document capture listener and observer. Production surface also captures `[data-pst-opp-field]`, filters the same cards, and rewrites the result count after delays. |
| Finance | Finance mindmap v1, production-surface owner, existing Finance runtime | Both presentation modules write `#pst-finance-mindmap` CSS/DOM and own its clicks and return button. The older module offers four abstract branches; production surface replaces its contents with ten real branches and stops click propagation. Final appearance depends on dynamic load/timing. |
| Sidebar | Primary-nav resilience, global-fullwidth shell, production-surface owner | Primary nav repeatedly rebuilds the sidebar while the two later modules hide it. Production surface sets inline styles on the sidebar during each repair, which its own body-wide attribute observer can detect and reschedule. |

These are source-level findings, not yet a claim that every production click fails. Existing smoke tests do not cover repeated real navigation and rerender sequences specified in the handoff. Attempts to run four relevant interaction tests in this clean worktree were blocked by missing `jsdom` dependency (`node_modules` absent); this is a test-environment prerequisite, not a product failure.

## Safe stabilization sequence

1. Establish deterministic loader order and runtime instrumentation in an isolated branch; add repeated-click/rerender tests for the three required journeys, counting event dispatches, duplicate nodes/styles, and observer callbacks.
2. Assign one owner per surface: primary-nav resilience for top-level routing; project-centric workflow for Opportunities data/cards, mindmap v5 for its presentation/filters; existing Finance runtime for calculations and tabs, production surface for the ten-branch presentation only. Retire the four-branch Finance presentation and duplicate field filter/Back handlers after tests prove equivalent behavior.
3. Make visual repair idempotent and observer-scoped; never trigger repair from its own DOM/style writes. Preserve all business semantics and approval gates.
4. Run interaction tests for repeated Home → Opportunities → APP → TED → Field → All → Back, Home → Projects → project → Back, and Home → Finance → each branch → map → Back without refresh. Then verify the built GitHub Pages artifact and production visually. No merge without explicit approval.

`docs/ACTIVE_RUNTIME.md` and `docs/NAVIGATION_CONTRACT.md` describe older ownership expectations and do not fully reflect the dynamically loaded 2026-09-16 modules; use the actual boot chain as evidence before updating either contract.

## Isolated stabilization implemented after audit

- The dynamic loader no longer starts the obsolete four-branch Finance map. The ten real destinations stay with the production surface owner and delegate to existing Finance functions; no Finance calculation changed.
- The production surface no longer intercepts global Back or Opportunities field clicks. The global shell/primary nav owns Back, and Opportunities mindmap v5 owns field filtering.
- Presentation repairs are idempotent; the production owner no longer removes/reinserts its stylesheet or rebuilds an intact Finance map on every repair. It no longer schedules four blind startup repairs. Its observer is scoped to Finance and only schedules a repair when the map is missing or malformed.
- A three-cycle DOM interaction regression test covers all ten Finance branches, Projects and Opportunities Back, one Home route per click, one stylesheet per owner, and no settled observer loop. Existing Opportunities rerender test covers APP → TED → field filtering. These tests are local fixtures, not live production verification.

Validation: 177 existing syntax/smoke commands passed when run directly through Node, plus the new multi-cycle and focused owner tests. `navigation-system-smoke.js` logged an asynchronous Home fixture error after reporting pass; this is not a clean signal and needs follow-up. No merge or deployment was performed. The unwanted top message was not the read-only role banner; the user later supplied its exact screenshot.

## Additional live UI findings and isolated fixes

After a read-only production login, Home opened Projects and the Kropp project. The Kropp project showed two offers in recent activity (`PST-OFF-2026-09-029` and `PST-OFF-2026-09-030`); the summary still says the latter lacks recorded send proof, so do not infer a confirmed delivery from this UI. The Projects → Kropp → Projects route worked.

The current production Opportunities page displayed tender cards but **no mindmap**. Its DOM had `#pst-pcw-lifecycle-tabs` (legacy map) hidden by the v5 stylesheet while `#pst-opp-v4-map` (replacement) was absent. The v5 owner gave up readiness after about four seconds. The isolated fix keeps the legacy map visible until the replacement exists and allows delayed startup for up to sixty seconds without any additional Supabase reads. A late-owner DOM test now covers the case.

The current production global `← Kthehu` element was repeatedly replaced during project/Opportunity rerenders; a normal browser click could time out while the element was visibly present. The global shell now retains the same Back node and listener when the active page is unchanged. A repeated-render test asserts node identity and one Home route per click.

On the Kropp project's Prokurimi view, `Skedarët` and `Komunikimi` were each displayed twice. The operating-experience renderer regenerates utility buttons in the phase nav, while daily-zones cleanup had appended each regenerated pair to an existing external utility strip. The cleanup now retains one button per action and removes duplicates after rerenders. A four-cycle DOM regression test covers it.

The user supplied the exact unwanted top message: `PPPP ruajti punë të pambyllur`. `pristeel-operating-assistant-v2.js` recreated this global fixed banner on each apply/login even though `pristeel-home-route-precision-v1.js` tried to remove it with a body-wide MutationObserver. This was both ineffective during the login paint and extra work on every DOM mutation. The assistant now keeps unsaved local records untouched but does not auto-open the banner. A `Sistemi → Punë e ruajtur` control opens recovery in that page only on explicit click; dismissing it does not replay or delete records. The body-wide banner-removal observer was retired. The operating assistant regression test checks the no-banner login and explicit recovery path.

Focused tests for the above fixes passed, and the production Pages artifact builder verified 251 source files, 244 JS files, and the runtime dependency closure. The current production site does **not** contain these branch fixes. Live testing of every page/card and post-deployment visual behavior remain outstanding; do not claim full platform stabilization from local CI alone.
