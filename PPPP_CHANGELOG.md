## 2026-09-26 — Mobile Control Tower Home v1

- Added a new <=900px PriSteel Control Tower presentation that answers the operational question “what needs my attention now?” using the existing canonical Home snapshot.
- The first screen now composes canonical user actions, waiting-external items and active projects into one dominant priority, three compact counters and a concise activity feed.
- `Pyet PPPP`, weather, ECB currency conversion and steel-market actions remain owned by the existing mobile Home utility provider; the new presentation delegates to it instead of duplicating network/data logic.
- Added a persistent three-button mobile utility dock for Weather, Convert and Market above the existing bottom navigation.
- The Control Tower adds no direct Supabase reads/writes, no polling, no network fetches, no schema changes and no outbound actions. Canonical project brief/navigation and human approval gates remain unchanged.
- Added runtime-manifest registration and a dedicated mobile Control Tower smoke test.

## 2026-09-26 — Mobile bottom navigation fix + longer Home

- Fixed the six-button mobile bottom navigation after the persistent-Home change. Tapping Mundësitë, Projektet, Partnerët, Financat or Sistemi now releases the mobile Home owner before canonical routing, updates the business-zone marker immediately, and lets the target page render.
- Mobile active-state sync now prefers the canonical visible route over stale body state, so the bottom bar no longer snaps back to Ballina after a tap.
- Extended the approved mobile Home with a new `Lajme & analiza` card linking directly to current SteelOrbis, EUROMETAL and SteelRadar source pages. No copied/stale headlines are embedded.
- Existing market prices, Pyet PPPP, live weather, Calendar, weight calculator, Incoterms, quick note, LME metals and ECB currency converter remain unchanged.
- No new Supabase reads/writes, polling, schema changes or paid APIs were added.

## 2026-09-26 — Persistent mobile Home host

- Fixed the remaining iPhone Safari race where the approved mobile Home could render briefly and then disappear when canonical Home rewrote or switched the underlying Home page.
- The approved mobile Home now mounts directly on the stable `.content` host instead of living inside `#page-home` / `#page-workspace-home`.
- Visibility follows the fixed bottom-navigation Home selection, so canonical/legacy Home owners can rerender underneath without removing the mobile dashboard.
- When another business section is selected, the mobile Home owner releases the content area normally.
- No polling, MutationObserver, Supabase business read/write path or paid API was added.

## 2026-09-26 — Safari blank mobile Home recovery

- Fixed the iPhone Safari startup race visible as a white Home area while the six-button mobile navigation was already rendered.
- The mobile Home can now mount temporarily into the legacy `#page-home` host when the canonical `#page-workspace-home` shell is not active yet, then moves to the canonical host when it becomes available.
- If authentication is already unlocked and no other business page is active, a bounded startup recovery activates the available Home host instead of leaving the content area blank.
- Recovery never runs over the email/password gate or PIN gate, never hijacks another active page, and adds no Supabase read/write path or polling.
- Added bounded 3s/6s Safari recovery attempts and an immediate rerender signal after successful mobile PIN unlock.

## 2026-09-26 — iOS Home Screen app PIN bootstrap

- Fixed the iPhone Home Screen web-app case where Safari opened PPPP with PIN but a newly installed standalone app asked again for email/password.
- Cause: iOS copies login cookies into a newly added Home Screen web app, but does not copy Safari localStorage. PPPP previously kept both the remembered Supabase session and PIN configuration only in localStorage.
- Safari now creates a short-lived, app-path-scoped, Secure/SameSite=Strict bootstrap cookie containing only an AES-GCM encrypted refresh-session payload. The encryption key is derived from the existing four-digit PIN hash; plaintext PIN/password are never placed in the cookie.
- On first launch of a newly installed standalone app, the PIN gate appears before the legacy login form. A correct PIN decrypts the bootstrap, restores the normal local remembered session, refreshes Supabase Auth through the existing refresh path, creates the app-local PIN configuration, and deletes the copied bootstrap cookie inside the standalone app.
- Existing installed web apps remain storage-isolated from Safari, so a one-time remove/re-add is required to receive the new bootstrap cookie. After that, routine app re-entry remains PIN-only.
- No PPPP business reads/writes, schema change, polling, paid API or password storage was added.

## 2026-09-26 — Mobile Home final market dashboard

- Restored visible steel/raw-material market references on mobile Home using dated public benchmarks with explicit market basis; every row remains clickable to its source.
- Current references used for the 26 Sep Home are HRC Northern Europe €740–760/t EXW (25 Sep), Romania rebar €610–615/t ex-warehouse (25 Sep), LME Turkey 1-month steel scrap $393.50/t CFR (24 Sep), and iron ore 61% Fe $95/t (25 Sep).
- Replaced the mm↔inch converter with a Google Calendar shortcut under `Mjete të dobishme`.
- Replaced SteelBenchmarker with `Çmimet e metaleve`, linked to the official LME metals page.
- Explicitly hides the legacy `Ballina e punës` / morning command-center surface and the floating `Kërko` button whenever the approved mobile Home owns the active Home page.
- The fixed bottom navigation, `Pyet PPPP`, live weather, ECB currency converter, Incoterms, quick note and weight calculator remain intact.

## 2026-09-26 — Mobile Home live interaction hardening

- `Pyet PPPP` on mobile now opens a dedicated mobile sheet and delegates directly to the existing read-only `PSTOpenAIAssistantV1` / PPPP context bridge instead of opening generic workspace search.
- Steel-market rows no longer say “current price” when the public source may expose delayed/sample values; they now say `Hap burimin`.
- The SteelBenchmarker shortcut opens the latest public benchmark-history PDF directly.
- No new Supabase path, polling or business write was added; the assistant reuses the existing authenticated PPPP AI owner.

## 2026-09-26 — Trusted mobile PIN page cleanup

- On a phone/tablet that already has a configured PPPP PIN, the legacy email/password form and its error area are removed from the page before the PIN gate is shown.
- The PIN screen no longer mentions email/password controls; it presents only the four-digit PIN flow.
- First-time/untrusted-device authentication remains available only when no device PIN exists, while explicit logout still clears the trusted-device state.
- No Supabase business reads/writes, polling, schema or workflow behavior changed.

## 2026-09-26 — Mobile Home live-source dashboard + PIN-only re-entry

- Finalized the approved information-first mobile Home while leaving the fixed six-button bottom navigation unchanged.
- Home keeps the PRISTEEL header/greeting, prominent `Pyet PPPP`, live Prishtina weather plus local date/time, steel-market source shortcuts, `Mjete të dobishme` and `Burime të tregut`.
- Removed the dated SteelOrbis sample numbers from Home after verification showed that the public values displayed there are lagged/sample data rather than guaranteed current transaction prices. Steel rows now open the current product source instead of presenting stale numbers as live.
- Replaced the Transport shortcut with an on-demand currency converter using the European Central Bank daily reference-rate feed. FX data is cached locally for 12 hours and labeled as reference data.
- Weather remains a bounded Open-Meteo request cached for 30 minutes. Mobile Home adds no Supabase reads/writes, polling or service-worker caching.
- After initial account authentication and PIN setup, normal mobile re-entry is PIN-only even when the access session expires: PIN verification restores the remembered refresh-token session and delegates renewal to the existing auth refresh path.
- The normal PIN gate no longer exposes an email/password fallback. Five wrong PIN attempts trigger a temporary one-minute lock instead of switching to password login. Explicit logout still clears the trusted-device PIN/session state.

## 2026-09-26 — PWA RBAC + PIN session hotfix

- Fixed a standalone-iPhone startup race that could incorrectly label a valid writable/admin account as “Vetëm shikim”.
- RBAC now resolves the authenticated `user_id` first and uses exact authenticated email only when that user-id lookup returns no row.
- A transient startup delay no longer becomes a permanent viewer role, and an earlier viewer lock is reversible once the real writable role resolves.
- Mobile PIN unlock now persists for the current app session and repeated internal `startApp()` calls cannot reopen/reset the PIN gate.
- PIN success emits a bounded startup event so unresolved RBAC can resolve immediately without polling.
- No new background polling, cron, or recurring Supabase reads were added.

## 2026-09-26 — Mobile 4-digit PIN quick unlock

- Added a device-local 4-digit PIN quick-unlock layer for phone/tablet use after one successful normal PPPP login.
- The PIN does not replace Supabase Auth and is never sent to the server. It unlocks only when an existing remembered PPPP session is still usable.
- PIN storage uses a random local salt plus PBKDF2/SHA-256 derivation; plaintext PIN and user password are never stored.
- Five failed PIN attempts force a return to the full email/password login. Explicit logout clears the local PIN configuration.
- A visible `Hyr me email dhe fjalëkalim` fallback prevents lockout.
- The feature adds zero Supabase reads/writes, zero network fetches and zero polling.
- Desktop authentication behavior is unchanged.

## 2026-09-26 — Global mobile bottom-navigation hotfix

- Restored the six mobile bottom-navigation buttons as a global phone/tablet control independent from Home rendering.
- Mobile navigation now calls the canonical `PSTPrimaryNavResilienceV10.route(...)` router first instead of depending on clicks against the hidden desktop sidebar.
- The nav is reattached directly under `document.body`, kept above page overlays, and explicitly retains pointer/touch interaction on every mobile route including Ballina.
- Added route-change/focus reassertion and regression guards so Home or another page owner cannot silently hide or disable the bottom nav.
- Bumped the mobile shell cache token so phones receive the corrected navigation immediately.
- No Supabase reads/writes, polling or business workflow logic changed.

## 2026-09-26 — Mobile Home canonical mount hotfix

- Fixed the blank mobile Home seen on a real phone: the mobile presentation no longer depends on the optional `#pst-native-home-v4` container.
- Mobile Home now mounts directly into canonical `#page-workspace-home`, so it renders even when intermediate Home owners initialize late or are replaced during startup.
- While mobile Home is active, only sibling Home presentations inside the canonical Home page are hidden; the mobile root remains visible.
- Bumped the mobile Home cache token so phones receive the corrected runtime immediately.
- Added a regression guard that forbids reintroducing the optional native-container dependency.
- No Supabase reads/writes, polling, business logic or desktop Home behavior changed.

## 2026-09-26 — Mobile Home v2: richer working context

- Kept the mobile Home top intentionally compact, but added useful working context below it so the page no longer feels empty.
- Added a visible `PRISTEEL Daily` card, `Vazhdo punën` with up to two active projects, and an `Në pritje` card that appears only when the existing Home snapshot contains waiting-external items.
- Enlarged the four approved quick actions into a 2×2 layout: `Krijo projekt`, `Krijo draft`, `Shto partner`, `Shiko tenderët`.
- All new content is derived from already-loaded in-memory Home/Opportunities snapshots and existing route/create controls. No Supabase reads/writes, network fetches, polling or service-worker behavior were added.
- Updated the mobile Home cache-bust token so phones receive this revision immediately after deployment.

## 2026-09-25 — Compact mobile Home redesign

- Added `pristeel-mobile-home-v1.js` as the <=900px final Home presentation, matching the approved clean mobile mockup while leaving desktop Home unchanged.
- Removed the desktop-style sidebar/column ownership from mobile Home and replaced it with a full-width mobile dashboard: compact PRISTEEL header, greeting, `Pyet PPPP`, three small counters, one concise `Çfarë të shohësh sot` card and `Veprime të shpejta`.
- Kept the approved quick actions: `Krijo projekt`, `Krijo draft`, `Shto partner`, `Shiko tenderët`. They delegate to existing PPPP routes/create controls; no parallel business workflow was introduced.
- Mobile Home reads only existing in-memory Home/Opportunities snapshots and adds zero Supabase reads/writes, zero fetches and zero polling.
- Decorative steel/building imagery is intentionally absent.
- Added dedicated smoke coverage and mobile CI checks for the approved layout and zero-backend-cost contract.

## 2026-09-25 — Mobile role and viewport correction

- Fixed RBAC startup lookup so the current authenticated user's role is resolved by `user_id` (email fallback only when user id is unavailable) instead of reading an arbitrary first `user_roles` row.
- The role fix replaces the existing single lookup and does not add extra Supabase polling or background reads.
- Extended the mobile shell media condition to honor physical device width as well as CSS viewport width, preventing phone browsers using a desktop-style viewport from rendering the full desktop sidebar.
- No business workflow, project, Gmail, finance or tender logic changed.

## 2026-09-25 — Mobile/tablet shell v2

- Extended the presentation-only bottom navigation and full-width shell from phone-only widths through 900px so tablets do not lose usable workspace to the desktop sidebar.
- The tablet shell continues to delegate to the same canonical six PPPP routes and adds no Supabase reads/writes, polling, business-state ownership or outbound behavior.
- Kept PWA installation metadata and the existing 192px/512px icons; no service-worker caching was added.
- Updated smoke tests and runtime documentation so the <=900px phone/tablet contract is regression-protected.

## 2026-09-25 — PWA install icon hardening

- Added 192×192 and 512×512 raster fallbacks derived from the approved PRISTEEL app icon for Chromium/PWA installation compatibility.
- Kept the canonical SVG icon and added Apple home-screen icon metadata.
- No service worker, offline cache, Supabase read/write, polling or business-runtime change was introduced.

## 2026-09-25 — Mobile responsive shell v1 (branch)

- Added `pristeel-mobile-responsive-v1.js` as a presentation/navigation-only mobile shell.
- Reuses the canonical six PPPP routes; no new business engine or Supabase data path.
- Added safe-area-aware narrow-screen layout and bottom navigation for phone use while preserving existing page owners.
- Linked the existing `pristeel.webmanifest` and install metadata in the application HTML.
- Deliberately did **not** add service-worker caching in this phase to avoid stale-runtime risk during responsive rollout.
- Added an isolated smoke test and CI workflow that guard against Supabase calls, polling, MutationObserver ownership and duplicate mobile runtime loading.

# PPPP CHANGELOG

This file records material architecture/automation changes. It is not a substitute for Git history. It exists to make project continuity readable across long ChatGPT/engineering sessions.

## 2026-09-25

### Home reorganized around decisions, active projects and compact secondary tools

- Home now shows at most three priority rows and groups repeated actions into one honest summary that opens the canonical Projects area instead of presenting duplicate rows.
- The main lower grid gives active projects the dominant column and keeps Opportunities, Material Trade and the compact PPPP assistant in one supporting column.
- Project rows can fall back to the already-loaded workspace project cache when the canonical Home snapshot has not populated yet, avoiding a large empty card while the sidebar already reports active projects.
- PRISTEEL Daily is mounted inside the Home header instead of floating over content. `Pyet PPPP` stays collapsed until requested and preserves the existing assistant shell when expanded.
- The redesign reuses current in-memory snapshots and existing route owners. It adds no database reads, writes, outbound actions or approval changes.

### Navigation and Opportunities rendering stabilized without page snapshots

- The global route-stability layer no longer clones the active page, duplicates its DOM ids, cancels the canonical click or replays a synthetic click. It now observes the normal route transaction and temporarily suppresses layout animation while the destination settles.
- Route readiness signatures no longer call `getBoundingClientRect()` on every animation frame, removing a forced-layout loop from every protected navigation click.
- The Opportunities Desk no longer uses a subtree `MutationObserver`, no longer replaces the complete visible desk, and no longer performs delayed 80/240 ms scroll corrections. Canonical workflow events trigger bounded column-level reconciliation instead.
- Follow-up live verification showed that preserving only the outer Desk was insufficient: selecting one company still replaced the complete 60-row center column and right column. Selection now preserves the Desk, filters, center column, every project-row node, right-column container and contacted-company list; only the selected class and detail card change.
- Project-centric navigation repairs are coalesced into one animation-frame update. The former 0/90/260/700 ms render burst no longer reprocesses Opportunities four times after a route click.
- Passive startup and `pageshow` handling no longer load Project Command data unless Project Workspace is active and has an explicit project id.
- No Supabase schema/data, business workflow, Gmail behavior, external action or human approval boundary changed.

## 2026-09-24

### External procurement access limited to one morning attempt per source

- TED, KRPP, APP Albania and multilateral procurement discovery schedules now run once each morning instead of hourly/every-two-hours/every-six-hours.
- A service-only Supabase daily access ledger atomically claims each source before collection. A second scheduled, manual or duplicate workflow run on the same Europe/Budapest business day stops before contacting the external portal; failed attempts remain claimed to prevent retry storms.
- Pull-request and push validation no longer performs preview access against the live procurement portals.
- The older KEK/KRPP and secondary TED schedules were removed so they cannot create duplicate source sessions.
- The authenticated KRPP Mac worker is now one-shot at 06:00 local time. Its former three-minute polling loop, `KeepAlive` restart behavior and install-time immediate kick were removed.
- Tender classification, stored opportunities, dossier processing and human approval boundaries are unchanged.

## 2026-09-23

### PPPP V2 project flow is canonical from entry through closure

- Added the read-only, RLS-respecting `public.pppp_project_workflow_state_v1` model over existing Project, RFQ, supplier decision, supplier offer, client offer and invoice evidence.
- Project Data Integrity now loads that state inside the isolated Project payload; Workbench V3 uses it as the primary stage/next-action source and safely falls back to the established heuristics if the optional view is unavailable.
- The three explicit entry workflows now converge on one visible supplier/commercial flow and one shared post-award sequence: `Customer PO → Supplier PO → Procurement → Transport → Delivery → Invoice → Payment → Closed`.
- Human gates remain visible for supplier approval, pricing/dossier, client offer/application, negotiation and outcome decisions. No new database writer, automatic email, financial commitment or supplier commitment was introduced.
- Added smoke coverage for the read-only migration contract, all three lanes, canonical next-action routing and the complete post-award path.

## 2026-09-05

### System presentation recognizes the canonical apps route

- Production verification of the Finance repair exposed that the Operating Assistant received the canonical `apps` route name while its presentation switch expected `system`, leaving the otherwise-active System page empty.
- The presentation owner now normalizes `apps` to `system` before rendering, with a regression that covers the exact production route contract and the same fail-open behavior used by Finance.
- The terminal navigation owner also invokes the existing Operating Experience presenter directly (and once after activation), so the empty System host is populated even when the later assistant layer is unavailable or still loading.
- No business data, Supabase schema, automation, outbound action or approval gate changed.

### Finance presentation now fails open instead of rendering a blank page

- Production verification after PR #390 exposed a separate presentation-owner conflict: the Operating Assistant CSS hid every Finance child before its compact Finance panel existed.
- The terminal navigation owner now explicitly asks the presentation owner to render after Finance or System activation.
- Compact Finance/System CSS is enabled only after the corresponding replacement panel exists; if that layer is late or unavailable, the existing core tools remain visible.
- Updated regression coverage reproduces the terminal-route handoff and protects the fail-open contract. No business data, Supabase schema, automation, outbound action or approval gate changed.

## 2026-09-04

### Finance and System terminal routes isolated from shared router wrappers

- Production verification after PR #388 proved that Partnerët → Financat could still block the browser before any Finance surface became active.
- Daily Finance and System navigation now activates its authoritative page directly and never enters the multiply decorated `pstWorkspaceGo` chain.
- The early native Finance capture hydrates the existing Finance core directly, and its asset version is bumped so returning browsers cannot reuse the stale route owner.
- Dynamic navigation regressions, the complete 175-check suite, runtime manifest and deterministic bootstrap guards pass. No business data, Supabase schema, automation or approval gate changed.

### Finance navigation recursion hotfix

- Stopped late Finance, Tender and canonical Home wrappers from repeatedly recapturing one another.
- The canonical Home router now closes over its immutable base instead of a mutable shared reference, preventing cyclic calls and `Maximum call stack size exceeded` on Finance navigation.
- Added regression coverage for repeated router installation through later wrapper owners.

### Inline boot continuity and canonical project preload stabilized

- Removed a synchronous `loadHub is not defined` failure from the application HTML. The retired cockpit owner is now an optional compatibility callback, so its absence cannot abort the remaining inline runtime.
- Changed the early Project Workspace preloader to verify the stable `PSTProjectIntegrityUIV1.open` module API instead of racing presentation wrappers on the mutable global opener.
- Bumped the preloader cache key so production browsers receive the corrected activation contract.
- Added a regression smoke for both failures and made the ordered-bootstrap timeout smoke portable to Windows timer granularity.
- Made the runtime-manifest blob check normalize CRLF checkouts to Git's canonical LF representation.
- No Supabase schema/data, automation, Gmail, OCR, scheduled job, outbound action or approval-gate logic changed.

## 2026-09-03

### TED winner email preparation restored in Action Console

- Every TED award-winner popup now exposes `Përgatit emailin`, including rows whose company role is still unverified; those rows use neutral capacity-support wording instead of losing the email action.
- Outreach copy follows the actual PRISTEEL messages sent on 2 September 2026: public-award context, additional fabrication capacity, PRISTEEL technical/fabrication coordination, DAP delivery, partner-plant EN 1090-2 / EXC-4 capability and a request for drawings/BOQ/BOM.
- Language routing is deterministic: German for DACH, Serbo-Croatian for Croatia/Montenegro/Serbia and English for all other countries.
- The editable preview remains mandatory. An explicit user click creates a Gmail draft; no message is sent automatically.
- Gmail draft creation prefers the verified `arianit.vllahiu@prissteel.com` send-as alias and appends that alias's live Gmail HTML signature, including its stored logo and links.
- Runtime cache keys were bumped for both the tender-action provider and the Action Console owner. No tender discovery, automation, Supabase schema or project-state logic changed.

## 2026-08-25

### Final daily-surface polish removes the remaining visible control clutter

- PR #268 tightens the already-canonical daily surfaces without replacing any business engine.
- Projects keeps search plus `Të gjitha / Action / Waiting / Execution / Closed` and retires the remaining normal-page maintenance chrome: duplicate manager, manual refresh, board/list toggle, legacy counters/filters, sort selector and the header-level `+ Projekt i ri` button.
- Manual project creation is not deleted. The exceptional `+ Krijo` path remains available, while normal project intake is expected to come increasingly from confirmed Gmail/tender/project events and existing automation.
- System now treats `Automation Health` as the primary visible operational surface.
- The large System app/module grid remains intact but is collapsed under `Mjete teknike` by default, instead of presenting a wall of technical tiles during normal work.
- The duplicate System shortcut strip is hidden from daily use. Gmail, Commercial intake, integrations, diagnostics and fallback modules remain connected and reachable.
- The cleanup remains presentation-only: no Supabase reads/writes, no routing ownership, no polling, no MutationObserver, no provider deletion and no automatic external/financial commitment.
- `tests/daily-zones-cleanup-smoke.js` now protects the calmer Projects/System presentation and `.github/workflows/finance-daily-smoke.yml` runs that regression in CI.
- Canonical daily operating documentation was updated in `docs/DAILY_OPERATING_SURFACES_2026-08-25.md`.

## 2026-08-23

### PPPP operating experience simplified without replacing backend engines

- Added `pristeel-operating-experience-v1.js` as a late presentation/navigation layer loaded dynamically by `pristeel-redesign-finalizer-v1.js`.
- Primary daily navigation is now `Home`, `Opportunities`, `Projects`, `Partners`, `Finance`, `System`.
- Gmail, Commercial intake/review and technical automation surfaces remain connected but are moved out of primary daily navigation and remain reachable through `System` or direct contextual actions.
- Added distinct visual color identity by business zone so location is recognizable through both text and color.
- Project Workspace is presented as five business phases: `Përgatitja -> Prokurimi -> Komerciale -> Ekzekutimi -> Financa`, with `Skedarët` and `Komunikimi` treated as utilities.
- Existing detailed project engines remain reused: `BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`.
- Procurement and Commercial are visually separated without creating duplicate comparison/pricing/client-offer engines.
- `Hapi i radhës` is now lifecycle-aware: won/execution projects route to Execution, technical review routes to preparation, pricing/client-offer states route to the commercial decision, and `wait_for_client` explicitly shows that no user action is required.
- Home action surface is presented as `Duhet veprimi yt`.
- Where a safe existing target is known, Home `Vepro` routes directly to Communication, RFQ, supplier comparison, client offer, Execution or Commercial intake review instead of forcing the user to navigate manually.
- Opportunities now exposes clearer final decision labels: `GO · Krijo projekt`, `REVIEW`, `NO-GO`; underlying tender status/promotion gates are unchanged.
- The new layer performs no Supabase reads/writes, no outbound actions and does not own Home/project business state.
- Final client offer, sell price/margin, supplier commitment, external send and final financial commitment remain human-gated.
- PR #233 merged to `main` as `48c264cab7116ee36f7c485231510e6529891ba6`.
- Before merge, the synthetic merge tree passed the full PRISTEEL test suite, runtime-manifest guard, Pages artifact audit, production Pages build and Local Semantic AI checks.
- Post-merge live backend verification confirmed all active pg_cron jobs at their latest run were `succeeded`; Semantic AI had `48 completed / 21 superseded / 0 pending/failed`; local OCR had `14 completed / 17 no_text` and no failed/pending jobs; `mac-mini-01` remained enabled and online.
- Continuity docs and runtime ownership records were updated in the follow-up continuity PR.

## 2026-08-22

### Project Workspace becomes one canonical end-to-end workflow

- Added `pristeel-project-workflow-canonical-v1.js` as the final UI-only reconciler over the existing Project-First workspace.
- The Project Workspace now exposes six top-level areas: `Përmbledhja`, `Prokurimi`, `Ekzekutimi`, `Financat`, `Skedarët`, `Komunikimi`.
- `Prokurimi` now has one explicit six-stage sequence: `BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`.
- Every procurement stage is independently clickable; state badges describe what exists instead of blocking navigation.
- Empty states now explain what is missing and what the next action is instead of leaving blank pages.
- Existing BOM, RFQ, normalized supplier comparison, pricing calculator and client-offer engines are reused rather than duplicated.
- Added `pristeel-project-workflow-legacy-capture-v1.js` so the old horizontal ribbon is compatibility-only and returns into the same canonical project flow instead of opening disconnected legacy routes.
- Legacy capture installation is idempotent, preventing duplicate global click listeners across delayed bootstrap retries.
- Project context is preserved when a legacy editor is still required, with explicit return to the same active project.
- Supplier offers and the PRISTEEL client offer are separated as distinct stages so `Ofertat` is no longer commercially ambiguous.
- Final sell price, client offer and outbound communication remain human-gated.
- The new workflow layers perform no business-data writes.

### Runtime ownership and regression protection updated

- `runtime-manifest.json`, `runtime-bootstrap-order.json`, `docs/ACTIVE_RUNTIME.md` and bootstrap-sequence guards were updated deliberately for the new final workflow layers.
- Canonical workflow loads after lifecycle, commercial and Project Intelligence owners; legacy ribbon capture loads after the canonical workflow.
- Regression coverage now protects the six project areas, six procurement stages, no-BOM path, supplier-offer empty state, normalized comparison reuse, pricing bridge, client-offer draft-vs-sent state, legacy-ribbon capture and duplicate-listener prevention.
- GitHub checks passed for runtime manifest, production Pages build, Pages artifact audit, Local Semantic AI and the full PRISTEEL test suite before merge.
- Backup branch before the change: `backup/pre-canonical-project-workflow-20260822` at `ea1b2976916fbebd402740137fec6320269b4406`.

## 2026-08-20

### Home visual ownership stabilized

- Retired delayed `Home Happy` timers and legacy hero counter rewrites that continued modifying Home after the canonical render.
- `pristeel-home-command-center-v2.js` v6 is the stable presentation owner over Canonical Home data.
- Home keeps `Për mua tani` consistently, without switching back to `Prioritetet` after load.
- Legacy hero counters are removed.
- Priority cards use the same neutral white visual family as active project cards, with only a subtle top accent/category icon.
- Home remains two-column for priorities and does not introduce business-data writes.
- Key commits: `5c3dbc9f26cdde3c39d29659cab05a11209ce5af`, `448d8a69578b7dfd831777c4dd8ee3425bb7a605`.

### CARINVEST supplier quote made operational

- Eurosteel quotation `ES287-08/2026` from the verified CARINVEST Gmail thread is now registered as an actual supplier offer for project `ITALIAN STYLE - Hala - CARINVEST`.
- Supplier offer total: `359,612.40 EUR`; structured lines retain the two fabrication rates, bolts/anchors, erection and transport.
- Eurosteel RFQ is marked replied and linked to the supplier offer.
- The attached PDF is linked/analyzed against CARINVEST with structured commercial data and review flags.
- Review flags retained rather than silently corrected: the supplier PDF says transport to Budva, Montenegro, and the erection quantity `29,456 kg` does not reconcile with the fabrication quantity `171,100 kg`.
- Project Commercial can therefore show the real supplier quote instead of `0 burime`.

### Project-aware client offer bridge

- `pristeel-project-commercial-prefill-rescue-v1.js` upgraded to v2.
- Opening a new client offer explicitly from a project clears legacy/demo defaults only for that new offer.
- The bridge reloads canonical project data before prefilling, so stale project state does not win over current procurement data.
- Client offer identity is prefilled from the active project, including project name, reference, client and the best project-specific buyer contact.
- CARINVEST reference `MARKO JOVANOVIC` therefore resolves to Marko Jovanovic / `marko@italianstyle.me`, rather than unrelated STACON demo data.
- Supplier quantity can seed the draft quantity when the project itself has no BOM quantity.
- A supplier quote with one coherent cost rate may be selected as procurement cost basis, but mixed-rate/review-flagged quotes are not flattened into one automatic €/kg value.
- For mixed quotes such as CARINVEST, the offer editor shows the exact supplier line summary and total while leaving selling price/margin blank for human approval.
- Existing/saved client offers are not overwritten.
- Key commits: `288f4384083573877d9b783352850a9a11e48496`, `f98b23fe0c9d0c4b7c5e25ce338803939b0d1c24`, `5f5d8281e6cce2dec3948a3407261c9a78d995b1`.

### Client-offer continuation fixed after supplier quote

- `pristeel-project-commercial-prefill-rescue-v1.js` upgraded to v3 after reproducing the real `Krijo / edito ofertë` failure.
- Root cause: the Commercial Document Builder deliberately reset a fresh offer again after opening it, so the earlier project prefill ran too early and was erased.
- The project bridge now owns the explicit Project -> Client Offer handoff and waits until the builder's fresh-form reset is complete before hydrating the draft.
- For a project with one supplier quotation, the supplier's structured quotation rows are carried into the PRISTEEL offer editor as editable sales rows with selling price `0` / pending approval, while supplier costs remain internal metadata/reference.
- CARINVEST therefore carries Eurosteel `ES287-08/2026` lines for the two fabrication rates, bolts/anchors, erection and transport into the client-offer preparation step instead of opening a blank generic offer.
- The project identity, client, buyer contact and supplier quantity context are also carried forward.
- Review flags remain visible internally, including the Budva transport inconsistency and the erection/fabrication quantity mismatch; they are not silently copied into customer-facing notes.
- The bridge never saves, finalizes or sends the offer automatically. Pricing, margin and final commercial approval remain human-gated.
- Runtime bootstrap cache key bumped to `20260820-bridge3` so the corrected bridge is loaded after deployment.
- Key commits: `edc108eb90bf54a78fafc9cde6b14cb93d0f5429`, `b18835c1b432721c11715e72ec7d0218a3f30ecb`.

### Regression coverage updated

- Home smoke coverage now protects stable five-action behavior, removal of legacy counters, neutral priority presentation and unambiguous action tagging.
- Commercial prefill regression coverage reproduces CARINVEST with legacy STACON defaults, project/ref/contact replacement and a multi-rate supplier quote that must remain review-gated rather than flattened.
- Key commits: `7b3118d7189d79c7924066179693d2ee32fdcdbf`, `bd6397a8b0e616a2d2cdb74fe521f279dc5abe92`.

## 2026-08-19

### Home becomes an operational action engine

- `pristeel-home-canonical-v1.js` upgraded from passive Home aggregation to current-state/action logic.
- Home is now `Për mua tani`, capped at five concrete actions.
- Added `Në pritje` for projects where no user action is currently due.
- Added Project Brief popup with current state, recent activity, missing information, source context and recommended next actions.
- Added supplier-quote, client-reply, technical-deadline and sent-offer state handling.
- Automatic stale-task reconciliation introduced for superseded project events.
- Commit: `9f98da502aa6e720d1d110e6d58b4e7814e4c61b`.

### Workspace shell cleanup

- Removed visible right legacy rail from current Workspace routes while keeping compatibility providers in DOM where required.
- Enforced a single Workspace sidebar.
- Cleaned legacy lower-sidebar remnants and old floating search behavior.
- Home priority cards normalized to two-column neutral presentation.
- Project sort control compacted without removing function.
- Key commits: `432102919a37acb8fec039cbb9c8d68d12f6b8b8`, `127f857f3f1530ba15fed5bf6f00bef9fca3498e`.

### Automation-first daily navigation

- Sidebar daily path standardized around Home, Projektet, Tenderat and Kontaktet.
- Gmail, Komerciale, Financa and Modulet kept connected under tools/back-office navigation.
- Duplicate/concatenated `Modulet` presentation cleaned by reconstructing canonical nav buttons rather than stacking decorators.
- `pristeel-task-source-actions-v1.js` upgraded to v15.
- Commit: `9c38f51db88cac5fc0e8505fa6b820e5f1759a4f`.

### Contact Master

- Added `pristeel-contact-master-v1.js` as the unified Workspace relationship register.
- Contact view combines canonical PPPP identity with Gmail, HubSpot and Bitrix24 source identities and linked projects.
- Existing CRM/contact pages remain as back-office/classic fallback.
- Commit introducing UI: `3d5f0bf2bc30357a91da503702ad5877600ac8ba`.
- Supabase migration `pppp_contact_master_gmail_sync_v1` added incoming Gmail-to-contact/project synchronization.
- Historical backfill processed 86 email/project sender pairs.
- `pppp_contact_party_guard_v1` corrects supplier identity from actual RFQ/partner evidence instead of treating every external sender as a client.
- `pppp_contact_master_v1` now canonicalizes duplicate contact rows by email without deleting HubSpot/Bitrix24/Gmail source history.
- Verified sample identities: Aleksandar Cingelic = Italian Style/client; Ermal Rula = Eurosteel/supplier; Zoran Ilievski = AKTIVA/supplier/production-side relationship.

### Durable PPPP continuity

- Added live continuity registry in Supabase:
  - `pppp_platform_context`
  - `pppp_platform_changelog`
  - `pppp_platform_protected_rules`
  - `pppp_platform_integrations`
  - `pppp_platform_snapshot_v1()`
- Added repository continuity documents:
  - `PPPP_MASTER_CONTEXT.md`
  - `PPPP_DO_NOT_BREAK.md`
  - `PPPP_CONTINUITY_PROTOCOL.md`
  - `PPPP_CHANGELOG.md`
- New sessions no longer need to reconstruct the platform only from chat memory.
- `runtime-manifest.json` and `docs/ACTIVE_RUNTIME.md` were refreshed to record Canonical Home, the final Workspace shell reconciler and Contact Master ownership.

### Structured project requirements

- Added `project_requirements` and `pppp_project_requirements_summary_v1`.
- Analyzed attachments now convert supported extracted evidence into structured standards, execution classes, steel grades, certificates, surface requirements, dynamic-plan and selected commercial/deadline signals.
- OCR/conflict evidence remains review-gated.
- Historical analyzed-document backfill produced 482 structured requirement rows.
- Migrations: `pppp_structured_project_requirements_v1`, `pppp_structured_requirements_project_id_cast_v1`.

### Security verification for new automation objects

- Supabase advisors were run after the new DDL.
- New security-definer-view findings were removed by converting Contact Master and requirements summary views to `security_invoker`.
- `project_requirements` now has RLS enabled with authenticated read access.
- New SECURITY DEFINER trigger/helper functions have `search_path` fixed and are not executable by anon/authenticated users.
- Remaining advisor warnings are pre-existing platform items, not introduced by this work.

### Regression project state corrected

- Dukley: revised offer `PST-OFF-2026-08-025` recognized as sent; obsolete dynamic-plan action closed; project deadline recorded as 10.10.2026; project waits for client.
- CARINVEST: Eurosteel supplier response promotes `Përgatit ofertën PRISTEEL` and project pricing stage.
- TenneT / SPIE: concrete technical-closeout action used before 21.08.2026 offer deadline.

### Human gates retained

Automation may read, classify, reconcile, calculate, compare and prepare drafts. External sends, final commercial commitments, supplier commitment, PO/contract and final financial commitments remain human-approved.

# 2026-09-05 — Finance canonical click owner follow-up

- Production verification after #389 showed that the earlier Finance stability capture listener still consumed `Partnerët → Financat` before the refreshed primary navigation owner could run.
- The early capture now hands Finance directly to `PSTPrimaryNavResilienceV1.openFinance()` when available and retains only a bounded local recovery fallback during bootstrap.
- Cache identities for both the early Finance capture and the terminal primary navigation owner were advanced together so returning browsers cannot retain the stale routing behavior.
