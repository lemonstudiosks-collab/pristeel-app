# SPIE official commercial document models

The 7 October 2026 uploads are the presentation references for the SPIE pilot: PriSteel offer, invoice and credit note. Customer names, commercial values, destinations and tax clauses in the samples are example data. They are never copied into SPIE automatically.

## Operator flow

- Commercial: create an offer.
- Finance: create an invoice or credit note.
- The same-origin project dialog embeds the existing canonical PriSteel document controllers. It fixes the canonical TenneT/SPIE project identity, uses existing document series and requires a reviewed tax explanation plus explicit commercial approval.
- A successful save is reread by canonical record ID and checked for project, document number, currency, totals and projected content. PDF/email remain unavailable until verification succeeds. The accepted model is frozen, so a legacy controller clearing its form cannot change the exported amounts.
- Draft Gmail attaches the actual generated PDF and selected project files from exact Gmail/Drive identities. Reply metadata preserves the original thread subject and Message-ID. It creates and verifies a draft; it never sends.
- The existing approved context-fact command bridge records the document/draft identities and attachment manifest under `spie.document.email.v1.*`. Its status remains pending until the trusted worker succeeds and the UI rereads the canonical fact. This receipt records `sent:false` and does not prove dispatch or delivery.

## Ownership and boundaries

`spie/document-models.mjs` owns the three source-derived layouts. `spie/editor-host.mjs` adapts only the human-opened editor. `spie/documents.mjs` owns the parent dialog, PDF attachment and draft composer. `spie/editor-safety.js` runs before the legacy scripts only when `spieEditor` is present in a child frame. It stops unrelated dynamic Home/bootstrap owners and rejects background writes, original-document updates and sends. Outside that frame it is inert; the shared ordered bootstrap and its owners remain unchanged.

Existing controllers, authenticated role lookup and server constraints remain authoritative. Offer metadata is stored in `documents_registry.offer_state.pristeel_model`; invoice/credit model metadata is preserved in their existing notes fields. Credit notes retain the original invoice identity and check its live remaining balance after prior credits/debits. There is no schema, SQL writer, numbering service or new scheduler.

Numbers shown before save are proposals from the existing central series, not atomic reservations. Server uniqueness remains the final collision boundary. A collision requires a new proposed number and review. Uncertain saves are not retried automatically. A verified document is immutable in this pilot; changes require a new document/revision rather than overwriting the original.

## Validation and limits

Source PDFs were visually inspected. Synthetic layout QA checks the offer's three-page structure, invoice's two-page structure, credit's one-page structure, totals, fixed transport quantity and escaped content. Browser fixtures exercise the actual canonical controllers, scoped saves/readbacks, frozen invoice total after form cleanup, offer lump-sum numbering, original-invoice linkage, prior-credit balance rejection and PDF actions without repeat saves. No real invoices, offers, credit notes or emails were issued in validation.

PDF generation reuses the existing free html2pdf engine. Gmail/Drive/Sheets operations require the operator's existing scopes or explicit compose consent. Provider responses in browser tests are mocked; this is not a claim of authenticated end-to-end production Gmail/Drive/Sheets testing. An interrupted or failed bridge registration is shown explicitly even if the Gmail draft already exists. Keep the pending command for verification rather than creating another draft.

The pilot creates new documents. Reopening historical documents, full revision management, direct email sending, and automatic shipment dossier publication remain separate follow-up work.


## Integration release 2026-10-08

Combined with the deployed timeout fix; startup uses the bounded project snapshot and hydrates optional actions independently. Shared owner scripts are unchanged. The table action in Commercial, Execution and Finance uses `spie/tracker.mjs`: exact original filename, exact project folder, OAuth reads, formatted cached Excel values, sheets, search and paging. The attachment is known but automatic inbound transfer was rejected by browser security. The UI supports one-time explicit file selection, private multipart upload and ID/name/MIME/size/parent verification. No source workbook or customer values enter public GitHub or Pages. Changes to Excel remain in the original Drive file; values do not silently update canonical BOM, prices, orders or invoices.
