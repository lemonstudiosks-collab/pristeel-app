# Historical snapshot: PRISTEEL Stability Audit — 2026-08-07

> **Archived on 2026-08-14.** This document is a historical snapshot from the August 7 stability-audit branch and is no longer an operational status document. For the current production source of truth, use `docs/ACTIVE_RUNTIME.md`, the current `main` branch, runtime manifests and current CI results.

Original snapshot follows unchanged below.

---

# PRISTEEL Stability Audit — 2026-08-07

Status: IN PROGRESS — FINAL CI GATE

Release rule: no audit change is promoted to `main` until the complete smoke suite passes and the critical user workflow is reviewed as one coherent release.

Critical workflow under audit:
1. Boot / login — inspected, bounded fallbacks already present
2. Home — bounded stability layer added
3. Universal search — blocking preload removed; bounded lazy search added
4. Gmail live inbox — bounded v2 added
5. Gmail thread -> create/link project — consolidated v3 added
6. Project 360 workspace — bounded full-loader fallback added
7. RFQ / supplier flow — duplicate registration guard added
8. Pricing / supplier offers — serialized autosave + steel-origin repair added
9. Our offer — duplicate save-click guard added; existing document-number collision guard retained
10. Commercial register — stable document register replaces observer/polling implementation
11. Finance / documents — bounded loading watchdog added without changing writes
12. Navigation and modal escape paths — synchronous Escape safety added

Stability rules:
- No global MutationObserver in the new stability layers.
- No unbounded polling in the new stability layers.
- No modal may preload large datasets merely by opening.
- Network-dependent UI must have bounded waits and recoverable states.
- Escape / close must remain available while background work is running.
- No silent destructive reassignment of Gmail/project relations.
- No automatic retry of business writes where duplication could be ambiguous.
- No production application change before the audit package is verified.

Findings fixed in audit branch:
- Universal search previously preloaded 15 large Supabase sources with `Promise.all` and no timeout. It now loads only after a real query, uses bounded source waits and can return partial results.
- Home project recovery previously repeated a large unbounded query across multiple timers. It now has one bounded in-flight recovery with cache.
- Gmail live inbox reads now have bounded list/message requests and local recoverable errors.
- Gmail intake no longer relies on a create-project patch layered over v2. Intake v3 distinguishes a real relation from a suggested match and keeps close available during reads.
- Project 360 retains the full integrity loader but falls back to a bounded project-specific dataset if optional sources hang.
- The legacy Document Center used a global `MutationObserver` plus repeated `setInterval`; the audit release uses a stable event-driven register instead.
- RFQ send/register is guarded against accidental duplicate clicks.
- Supplier-offer autosave is serialized so an in-flight first POST cannot produce a second POST before an ID is returned.
- The supplier steel-origin selector is repaired after the legacy renderer.
- Our-offer save buttons are protected from accidental rapid duplicate clicks while keeping the existing document-number collision guard.
- Finance receives bounded visual watchdogs only; no write operation is retried or changed.
- A shared Escape path closes known search, Gmail intake, pipeline and offer overlays synchronously.
- Bootstrap coverage parses and syntax-checks every loaded local module and rejects retired overlapping stability modules.

Final gate: full `npm test` on the exact audit head, then one isolated preview/live verification before promotion to production.
