# SPIE operative dossier

The dedicated `/spie/` workspace now has five routes: overview, commercial, execution, files and finance. Legacy route hashes redirect to the appropriate section. The original static shell, typography and sidebar remain the presentation owner; the left column explains the work for the selected section. No global module, schema, scheduler or protected commercial workflow was changed.

## Canonical state and sources

The canonical project is `c937aea1-af5e-4807-ae1e-e36864e46794` in `awqfpnzqwfjrjefoktgd`. The existing project snapshot, project emails, analyzed attachment evidence, offers, documents, invoices, expenses and guarantees supply the read model. The existing Gmail intake/analysis workers remain the background ingestion owners. Reads are project scoped, bounded, coalesced for five minutes, and refreshed on stale foreground return; no polling or full scans are added. Existing Google consent can supply bounded Gmail metadata and one project-folder Drive metadata page. Google-only or suggested evidence never becomes a canonical assignment through these reads.

`operations.mjs` projects eleven execution stages and A/B/C shipping document responsibilities. Clear, unquoted, non-future statements from the shipment's canonical Gmail thread can update the displayed phase with source evidence. Unknown dates and responsibilities remain unknown. Finding a document can mark it ready only with exact shipment and document-type evidence or a human-confirmed file identity. Applicability remains unset until confirmed; incoterm alone never makes every customs document mandatory. Approval-required or ambiguous evidence remains for review. No source projection silently changes a PO, contract, supplier selection, price, payment or canonical commercial pipeline.

Files use individual Drive IDs, Gmail message/attachment IDs and content hashes. Different titles pointing to an unverified shared Drive ID are flagged and the unsafe link is removed. Provider metadata validates real Drive filenames. Exact IDs/hashes merge Gmail/Drive copies; a filename alone does not prove duplicate bytes. Off-platform ChatGPT uploads appear only after a controlled observed `spie.document.v1.<identity>` fact with `project_id`, `identity_verified: true`, actual source identity and real URL has been registered. This is a reference into the existing PPPP context, not a parallel store or an automatic upload from ChatGPT.

## Controlled changes

`bridge.mjs` reads the live manifest only on a human-approved UI write and appends `context_fact` to the existing Commands sheet using its live header. The existing trusted worker remains the sole business-write processor. Each change is an immutable event keyed `spie.operation.v1.<shipment_id>.<command_id>`, with value:

```json
{"schema_version":1,"project_id":"canonical UUID","shipment_id":"stable identity","event_type":"shipment | stage | document","payload":{},"source_url":"actual evidence URL"}
```

Shipment payloads contain title, reference, optional incoterm and Gmail thread. Stage payloads contain stage ID, owner, status, planned/actual dates and note. Document payloads contain document ID/name, A/B/C group, owner, applicability, status/date, file identity and note. Append-only per-change facts avoid replacing another operator's shipment record. The current context view provides the shared state used by ChatGPT and the UI.

Before showing a save as complete, the UI requires the exact command receipt to succeed and reads back the matching canonical fact. Pending/uncertain commands remain identifiable across same-tab reloads in temporary session storage; business state is never saved there. Ambiguous append failures are not automatically retried. Completed/sent/received facts require an evidence URL and actual date; ready documents require a real file. Manual checkbox interaction opens the approval form and never silently saves.

Session handling accepts seconds/milliseconds in existing expiry metadata and refreshes only the existing canonical session using the shared cross-tab refresh lock. It never restores a logged-out session or refreshes the inactive Supabase project. Read responses are discarded on logout/account changes.

## Validation and limits

Node regressions cover exact file identity, conflicts, deduplication, commercial versions/values, suggested evidence, stage evidence/negation, checklist applicability, direction/vendor/currency separation, session isolation/refresh/logout and approved command append plus canonical verification. A browser test exercises all five routes, active material status from current source fixtures, 11 stages, A/B/C checklist, search, finance categories, approval forms, manual saves, mobile overflow, stable sidebar/type and cache reuse. Provider/command writes in browser tests are mocked; no real commercial records are changed for testing.

The current project has no registered incoming/outgoing invoices. Missing records are displayed explicitly. The existing suggested DDP association remains review-only. Production Google-consent availability, a complete real shipment dossier, effective offer acceptance/currentness, physical execution, bank balances and real bridge writes must be verified from real evidence; this UI does not fabricate them. Large folders/context/attachment sets disclose their bounded scope and remain accessible in the original project folder. No automatic persistence of inferred phases, uncertain links or off-platform uploads is introduced.
