# PRISTEEL Stability Audit — 2026-08-07

Status: IN PROGRESS

Release rule: no audit change is promoted to `main` until the complete smoke suite passes and the critical user workflow is reviewed as one coherent release.

Critical workflow under audit:
1. Boot / login
2. Home
3. Universal search
4. Gmail live inbox
5. Gmail thread -> create/link project
6. Project 360 workspace
7. RFQ / supplier flow
8. Pricing
9. Our offer
10. Commercial register
11. Finance / documents
12. Navigation and modal escape paths

Stability rules:
- No global MutationObserver.
- No unbounded polling.
- No modal may preload large datasets merely by opening.
- Network-dependent UI must have bounded waits and recoverable states.
- Escape / close must remain available while background work is running.
- No silent destructive reassignment of Gmail/project relations.
- No production change before the audit package is verified.

Current findings:
- Universal search opens by preloading 15 large Supabase sources with `Promise.all` and no timeout. A single hanging request can leave the modal on an infinite spinner. This is the first blocking defect being removed.
