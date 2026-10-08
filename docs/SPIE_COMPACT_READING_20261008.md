# SPIE compact reading follow-up

Overview uses the existing Inter/Arial font and 13px email text. Only up to three latest thread heads within the last 48 hours appear by default. Other readable evidence remains in closed history; this is presentation filtering, never a relevance decision or deletion. Future, unresolved and foreign evidence retain existing gates.

Document creation has one menu: offer, invoice, credit note, debit note, official letter. Tracker stays in Commercial's supporting section; manual refresh moves to the topline. Commercial offer rows show title, amount, terms, date, source state and open action. Only extracted terms appear in closed details; unknown totals/versions remain explicitly unknown. Deadlines and recent documents are folded; a stale project deadline still marks its heading.

Files show 15 groups initially, with search, category filter and explicit expansion. Same-name/category/party sources share a presentation group, preserving every distinct content identity, revision, original source and review flag. Only exact hashes/Drive/attachment identities deduplicate content. Exact-hash enrichment now retains the Drive ID as well as its URL. No filename-based byte deduplication.

The evidence reader opens small PDF/image/text and Excel attachments on demand. Excel reuses the existing tracker parser and bounded worksheet/table helpers, renders escaped cells in pages of 150, and does not execute formulas or macros. Drive-backed large/other formats keep embedded Drive preview. Gmail-only files with no active browser token show a specific connection explanation and the existing PPPP entrypoint rather than a misleading format/download error. No source file is copied, uploaded or made public; no new Google scopes, OAuth owner or server worker.

Verification: Node regressions include current/history filtering, independent same-name revisions, exact Drive enrichment and a GET-only Gmail PDF-to-dialog flow plus inactive-session recovery. Browser QA could not run in this session: computer-use inventory returned no browsers and createBrowserTab reported Browser is not available: iab. Deployment checks remain required before merge.
