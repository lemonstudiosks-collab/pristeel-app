# Opportunities complete contact history — 2026-10-06

The contacted-company desk previously reused the active-tender subset and selected only the latest legacy contact per tender. It missed older, archived and unlinked outreach, grouped companies using only the first email domain, and made rows after the first 60 inaccessible.

The existing read owner now loads the outreach registry and dated business outreach history in ordered 1,000-row pages. The desk groups exact company identities across known profile, legal identifier, name, business domain and email evidence; public email domains are never company identities. All contacted/prepared companies are excluded from the active list and its filter counters. Complete history has a permanent navigation entry, independent search, pages and Gmail evidence links. Draft/scheduled, sent, replied, bounce and historical states remain distinct. Existing tender dossiers remain reachable.

No schema, operational records, Gmail drafts, sending, schedules, automation workers, bootstrap order or infrastructure were changed. Publication is based on the latest main tree with a branch-head lease to preserve parallel automation work.

Validation: paginated >1,000-row history, duplicate company emails, public email domains, error-only drafts, independent history filters, paging/detail without extra reads; current desk interaction, late-owner, typography, complete-workflow and draft/sent lifecycle regressions. A bounded live read fixture contained 1,039 historical contacts and 560 registry rows; the desk derived 832 companies and 367 uncontacted TED opportunities. The private fixture is not committed.
