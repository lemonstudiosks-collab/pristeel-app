# PPPP GitHub Pages Artifact Audit

This audit exists to separate **files that belong in the GitHub repository** from **files that must be publicly deployed to GitHub Pages**.

## Current state

Production deployment still uses:

```yaml
uses: actions/upload-pages-artifact@v3
with:
  path: '.'
```

So the entire checked-out repository is currently uploaded to Pages.

Cleanup #10 does **not** change that behavior. It only creates a verified candidate public artifact and a CI audit around it.

## Why this matters

The repository contains several different kinds of files:

- browser runtime files;
- CI workflows;
- automation scripts;
- Supabase SQL/migrations;
- tests;
- audit and historical verification files;
- Gmail Add-on source;
- internal documentation.

Those files can belong in the repository without needing to be public website assets.

## Candidate public artifact

`scripts/pages-artifact-audit.mjs` derives the candidate artifact from the authoritative `runtime-manifest.json` rather than maintaining a second handwritten list of all 137 bootstrap modules.

It includes:

1. `index.html` and `pristeel-procurement.html`;
2. direct runtime JavaScript loaded by the application HTML;
3. the hidden loader and ordered bootstrap;
4. every JavaScript module in the ordered bootstrap;
5. current dynamic runtime modules registered in `runtime-manifest.json`;
6. additional non-JavaScript/public dependencies recorded in `pages-artifact-manifest.json`;
7. deliberately retained public compatibility assets.

## Additional dependencies discovered during this audit

### Document Center CSS

`pristeel-document-center-stable-v2.js` creates a `<link>` element at runtime and loads:

`pristeel-document-center.css`

That file would be missed by a whitelist based only on JavaScript load order.

### Gmail launcher

The current Gmail Add-on source points users to:

`pristeel-gmail-launcher-v2.html`

That launcher then forwards the request into `pristeel-procurement.html` while preserving query parameters and hash state.

### Gmail Add-on icon

`gmail-addon/appsscript.json` references the public Pages URL for:

`gmail-addon/pristeel-addon-icon.svg`

The Add-on source itself does not need to be a Pages runtime file, but the icon does because Google loads it from the public Pages URL.

## Compatibility assets kept deliberately

Two small files are retained in the candidate artifact even though the current audit has not proven a live current caller:

- `pristeel-gmail-launcher.html`
- `pristeel.webmanifest`

They are **not** being declared current owners. They stay in the candidate artifact because removing a public URL is a separate compatibility decision. The old Gmail launcher could still matter to an older installed Add-on deployment, and the web manifest should be handled by a dedicated PWA review rather than by inference.

## Repository-only classes

The artifact manifest records classes that are normally repository/engineering concerns rather than browser assets, including:

- `.github/**`
- `tests/**`
- `scripts/**`
- `supabase/**`
- root SQL files
- `docs/**`
- `package.json`
- `preview-server.mjs`
- Gmail Add-on source/configuration files
- old audit/status text files

This classification is informational in Cleanup #10. Extra repository files do **not** make the audit fail because production still uploads the whole repository.

## CI behavior

The Pages artifact audit fails if:

- a candidate public asset is missing;
- a verified public dependency stops referencing the expected target;
- the current Pages workflow silently stops matching the recorded audit mode;
- the audit is changed from `AUDIT_ONLY` without an explicit manifest change.

It does **not**:

- delete files;
- copy/build a production artifact;
- change the GitHub Pages upload path;
- modify runtime JavaScript or HTML;
- change Supabase, Gmail, APIs or business logic.

## Next decision

After this audit is stable, a future cleanup can generate an `_site/` directory from the candidate artifact and test it before changing production deployment.

That future switch is **not authorized by this audit**. It should be a separate PR with browser/smoke verification and an easy rollback path.
