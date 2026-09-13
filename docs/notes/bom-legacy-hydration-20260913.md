# BOM legacy hydration fix — 2026-09-13

Problem: Project-first `Hap BOM` navigated to the legacy BOM surface without hydrating that surface's in-memory `bomRows`, so a project with a canonical saved BOM could render as `0 kg / 0 pozicione`.

Fix: wrap the existing `pstPiLegacy` handoff for BOM/RFQ so it reuses the existing canonical `loadProject(projectId, true)` hydration before/while entering the legacy surface. No second BOM store is introduced and no send/price/supplier approval gate is changed.

Acceptance target for the KEK material-supply project: 20 BOM positions / 87,661 kg must render after `Hap BOM`.
