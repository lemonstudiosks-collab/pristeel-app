# Home Command Grid runtime ownership

The System-style Home command grid is a final presentation layer over Canonical Home data/state.

Production bootstrap invariant:

1. Legacy Home/workflow layers load first.
2. `pristeel-tender-priority-actions-v1.js` loads after legacy workflow capture.
3. `pristeel-home-operating-grid-v1.js` loads after tender priority actions.
4. `pristeel-project-classification-v1.js` loads next.
5. `pristeel-primary-nav-resilience-v1.js` is the final bootstrap module.

All four use the `20260823-homegrid2` cache key for this release. This ordering is deliberate so cached or late legacy Home layers cannot restore the old list layout after the command grid is mounted.

Canonical Home remains the sole owner of action and waiting state. The command grid is presentation/routing only, except for explicit existing human-gated actions such as tender REVIEW/GO/NO-GO and Gmail draft preparation.
