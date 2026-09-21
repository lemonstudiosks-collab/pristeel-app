# PPPP Opportunities — Operational Contract v1

Date: 2026-09-21  
Scope: `Mundësitë` / PriSteel Opportunity Desk  
Production Supabase: `awqfpnzqwfjrjefoktgd`

This document is a **read-only operational contract** for the Opportunities UI. It does not authorize database writes, outbound sends, supplier commitments, project creation without a human decision, or any other protected action.

## 1. Purpose

The Opportunities page must answer four operator questions:

1. What did PPPP find?
2. What is relevant to PriSteel?
3. What requires action now?
4. What is the single clearest next action?

The page is not a generic tender list and not a decorative dashboard.

## 2. Two business lanes

### Direct Tender

Sources such as KRPP, APP_AL, World Bank and other active direct-procurement sources.

Expected flow:

`found -> review -> dossier -> analysis -> human decision -> project promotion`

A project must **not** be created automatically.

### TED Award Sales

TED award notices are already awarded. PriSteel is not bidding into the closed award.

Expected flow:

`award -> winner verification -> winner classification -> contact research -> draft -> send under shared outbound governance -> reply/follow-up`

Winner categories:

- `gc_epc`
- `producer`
- `trader_consortium`
- `unknown`

Producer, GC/EPC and consortium routes must not be treated as interchangeable.

## 3. Identity and deduplication

Identity precedence:

1. canonical tender `id`
2. publication/reference number
3. procurement number
4. title + authority only as a weak similarity signal

**Never deduplicate only by title + authority.**

Audit snapshot on 2026-09-21:

- exact reference duplicate groups among the current visible set: **0**
- repeated title+authority groups: **19**
- rows in those groups: **59**

Those repeated-title rows have distinct references and commonly represent separate lots, awards, repeat notices or award publications. They must remain separate unless stronger canonical evidence proves a duplicate.

## 4. Canonical state sources

Use the existing sources; do not create a parallel state store for UI convenience.

### Opportunity / lane state

`public.pppp_tender_operating_lanes_v1`

Important fields include:

- `operating_lane`
- `human_action_required`
- `winner_company_type`
- `cooperation_angle`
- `deadline`
- `relevance_score`
- `project_id`
- `payload`

### Active actions

`public.pppp_opportunity_action_queue_v2`

This is a view over existing active `pppp_opportunity_actions`. It is **not complete enough to be the sole source of Next Action**.

### Direct tender dossier state

Latest row from:

`public.pppp_tender_dossier_versions`

### Project promotion

`public.pppp_tender_project_promotions`

### TED contacts

`public.outreach_contacts`

### Legacy opportunity outreach evidence

`public.pppp_opportunity_outreach_registry_v1`

Do not treat this registry as the sole truth for the newer shared outbound dispatcher. It is useful as opportunity-level draft/sent evidence only.

## 5. Next Action resolver

The UI should derive one primary operator action. It should not show several equal-priority primary buttons.

### 5.1 TED precedence

Apply in this order:

1. **Reply evidence exists** -> `Shiko përgjigjen`
2. **Sent evidence exists and no reply** -> `Në pritje`
3. **Draft exists** -> `Shiko draftin`
4. **Draft is missing/failed but a usable contact exists** -> `Rikrijo draftin`
5. **Winner type is unknown** -> `Verifiko fituesin`
6. **Winner type is trader_consortium** and human action is required -> `Verifiko anëtarët e konsorciumit`
7. **Winner type is gc_epc or producer and no usable email exists** -> `Gjej kontaktet`
8. **Winner type is gc_epc or producer and a usable email exists but no draft exists** -> `Përgatit draftin`
9. **human_action_required=false** -> `Monitoro`
10. fallback -> `Shqyrto mundësinë`

A stale action-queue route must not override a stronger current state. Example: a current `producer` row with an old `TED_GC` action should not be presented as a GC opportunity without review.

### 5.2 Direct Tender precedence

Apply in this order:

1. **Already promoted/linked to a project** -> `Hap projektin`
2. **Active dossier amendment review exists** -> `Shqyrto ndryshimet`
3. **Dossier fetch/authentication is required** -> `Merre dosjen`
4. **Dossier analysis failed** -> `Rishiko analizën`
5. **No dossier evidence exists** -> `Merre dosjen`
6. **Dossier exists but is not analyzed** -> `Analizo dosjen`
7. **Recommendation is REVIEW** -> `Vendos për pjesëmarrje`
8. **Recommendation is VAZHDO and not promoted** -> `Vendos / krijo projekt`
9. **Downstream supplier RFQ plan exists only after the participation decision is valid** -> expose as secondary context, not as a substitute for the human project/participation gate
10. fallback -> `Shqyrto mundësinë`

## 6. Dossier state must be derived, not trusted from one flag

Do not render `dossier_complete=true` as “ready” by itself.

Audit found rows where:

- `dossier_complete=true`
- `document_count=0`
- and an active `dossier_analysis_failure` exists

Therefore the effective dossier state must consider, in precedence:

1. amendment action
2. authenticated fetch required
3. analysis failure
4. actual document evidence
5. analyzed timestamp
6. recommendation

A green “complete” badge is wrong when a higher-priority blocker exists.

## 7. Current TED coverage gap

Audit snapshot on 2026-09-21 for the current visible TED award set:

- visible TED awards: **543**
- `human_action_required=true`: **465**
- with active action queue: **364**
- without active action queue: **179**
- without action queue but human action required: **159**

The missing-action set is not only fresh ingestion:

- last 24h: 0 missing
- 3–7 days: 4 missing
- 7–30 days: 136 missing
- 30+ days: 39 missing

Therefore the UI must implement the fallback resolver above instead of assuming “no queue row = no action”.

## 8. TED contact coverage snapshot

Current visible TED set:

### unknown
- 220 visible
- 23 have contact email
- 8 have outreach-registry evidence
- 1 has a created draft

### trader_consortium
- 168 visible
- 1 has a contact email
- 11 have outreach-registry evidence
- 7 have a created draft

### producer
- 109 visible
- 67 have contact email
- 33 have outreach-registry evidence
- 18 have a created draft
- 1 has sent-registry evidence

### gc_epc
- 46 visible
- 25 have contact email
- 19 have outreach-registry evidence
- 7 have a created draft

This is why “contact state” and “outreach state” must be visually separate.

## 9. Winner/action route drift

Current state contains some route/classification drift.

Examples observed:

- current `producer` with `TED_GC` actions
- current `producer` with `TED_CONSORTIUM` actions
- current `trader_consortium` with `TED_PRODUCER` actions
- current `unknown` with `TED_GC` actions

There are **21 visible TED tenders with actions across more than one route**.

UI rule:

- current canonical winner classification should control the visible segment
- action queue should inform work state
- conflicting route evidence should produce a review state, not silent reclassification

Do not “fix” the database automatically from UI.

## 10. Direct Tender snapshot

Current visible direct set at audit time: 9 rows.

Important observed states:

- APP rows can show `dossier_complete=true` and `document_count=0` while also carrying `dossier_analysis_failure`
- KRPP rows may be analyzed while dossier completeness remains false because authenticated documents or amendments are still required
- one KRPP opportunity is already promoted to a project; its primary action should be `Hap projektin`, not `Krijo projekt`
- World Bank currently has one low-relevance candidate with no action queue and no dossier state; it should not be forced into a false urgent action

## 11. Deadline rules

For Direct Tender:

- near deadline should affect priority
- past deadline may be shown as expired only when a real deadline exists
- missing deadline is a data-quality state, not “overdue”

For TED Award Sales:

- missing tender deadline is normally not an operational problem because the award is already closed
- do not use TED deadline as if PriSteel were bidding

## 12. Relevance rules

Show the numeric relevance only together with evidence that already exists, for example:

- canonical `match_reasons`
- cooperation angle
- verified winner classification
- dossier analysis evidence

Do not fabricate a reason from the numeric score.

## 13. Sorting contract

Default operator sort should prefer:

1. reply requiring review
2. Direct Tender with near deadline and unresolved blocker
3. explicit high-priority review/fetch/amendment action
4. winner verification / consortium verification
5. contact research
6. draft review/preparation
7. new relevant opportunities
8. monitor / waiting items

Alternative user sorts may include:

- newest
- deadline
- relevance

Sorting can be client-side after the bounded dataset is loaded.

## 14. Supabase / performance contract

The Opportunities presentation layer must not create a new database polling loop.

Rules:

- no query on filter click
- no query on card hover
- no query per card
- filter/search/sort client-side over the already loaded bounded dataset
- no MutationObserver render loop
- no per-recipient reads
- no full table scan from the UI
- no database write for derived UI state

Current implementation already uses client-side filtering. Preserve that property.

Potential egress optimizations to consider separately:

- avoid fetching unused columns
- avoid reloading the whole opportunity/outreach dataset on simple navigation if a still-fresh local cache is available
- do not fetch email message fields that are not used for lifecycle determination
- any optimization must preserve fresh-enough reply/outbound state and shared outbound governance

## 15. Human gates

The Opportunities UI must never automatically:

- send external email
- approve a draft
- select or commit a supplier
- decide final selling price/margin
- create a project without the operator decision
- mark project won/lost
- commit a contract/PO

## 16. Acceptance criteria

The page is correct when an operator can look at any card and understand:

- lane: Direct Tender or TED Award Sales
- why it matters
- current blocker/state
- one primary next action
- whether there is a project/dossier/contact/draft/sent/reply state
- whether the state is evidence-backed or requires review

The UI must remain useful even when the action queue is incomplete or stale.
