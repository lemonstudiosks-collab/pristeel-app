# Navigation Recovery Status

Branch: `feature/systematic-navigation-recovery-20260822`
Backup: `backup/pre-navigation-recovery-20260822` at `6d3fabd7e196ac3f63c50b6a6e3daef8393cf1dd`

## Completed in branch

- [x] Confirm blank-screen root defect in project chrome cleanup.
- [x] Remove global ancestor discovery/hiding.
- [x] Scope project cleanup to `#page-workspace-project` only.
- [x] Preserve supplier `Detaje` as inline expansion.
- [x] Preserve canonical six-area / six-stage project workflow.
- [x] Bump corrected project capture cache key to `flow2`.
- [x] Add Home waiting project -> brief -> Project Workspace -> Projects smoke.
- [x] Add static router/ownership guard.
- [x] Add release-surface navigation matrix guard.
- [x] Add explicit blank-ancestor regression guard.
- [x] Make canonical workflow/navigation tests part of `npm test`.
- [x] Document routing contract and release matrix.
- [x] Branch is ready for pull-request CI.

## Pending before production merge

- [ ] Pull request CI all green.
- [ ] Merge to `main`.
- [ ] GitHub Pages production build green on merged SHA.
- [ ] Supabase continuity registry updated with merged SHA.
- [ ] Live Safari authenticated verification by user after hard refresh.

Live browser verification is intentionally separate from CI and must not be claimed until observed in the user's session.
