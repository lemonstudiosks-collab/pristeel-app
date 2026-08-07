# PRISTEEL Stability Audit — 2026-08-07

Status: IN PROGRESS — CI PACKAGE 1

Release rule: no audit change is promoted to `main` until the complete smoke suite passes and the critical user workflow is reviewed as one coherent release.

Critical workflow under audit:
1. Boot / login — inspected, bounded fallbacks already present
2. Home — bounded stability layer added
3. Universal search — blocking preload removed; bounded lazy search added
4. Gmail live inbox — bounded v2 added
5. Gmail thread -> create/link project — consolidated v3 added
6. Project 360 workspace — bounded full-loader fallback added
7. RFQ / supplier flow — source audit in progress
8. Pricing — source audit in progress
9. Our offer — source audit in progress
10. Commercial register — navigation verified read-only
11. Finance / documents — source audit in progress
12. Navigation and modal escape paths — ongoing

Stability rules:
- No global MutationObserver.
- No unbounded polling.
- No modal may preload large datasets merely by opening.
- Network-dependent UI must have bounded waits and recoverable states.
- Escape / close must remain available while background work is running.
- No silent destructive reassignment of Gmail/project relations.
- No production application change before the audit package is verified.

Findings fixed in audit branch:
- Universal search previously preloaded 15 large Supabase sources with `Promise.all` and no timeout. It now loads only after a real query, uses bounded source waits and can return partial results.
- Home project recovery previously repeated a large unbounded query across multiple timers. It now has one bounded in-flight recovery with cache.
- Gmail live inbox reads now have bounded list/message requests and local recoverable errors.
- Gmail intake no longer relies on a create-project patch layered over v2. Intake v3 distinguishes a real relation from a suggested match and keeps close available during reads.
- Project 360 retains the full integrity loader but falls back to a bounded project-specific dataset if optional sources hang.
- Bootstrap coverage test now parses and syntax-checks every loaded local module and rejects retired overlapping stability modules.
