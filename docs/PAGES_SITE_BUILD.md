# PPPP production GitHub Pages artifact

## Status

Cleanup #12 makes the verified `_site/` artifact the **production GitHub Pages deployment source**.

Production no longer uploads the whole repository. `.github/workflows/static.yml` now builds the verified public artifact first and uploads only:

```yaml
path: '_site'
```

No application JavaScript, production HTML, runtime load order, Supabase logic, Gmail logic, tender logic, finance logic or other business functionality is changed by this deployment cleanup.

## How we reached this point

### Cleanup #10: artifact audit

Cleanup #10 established the audited public file set derived from:

- `runtime-manifest.json`
- the ordered active bootstrap
- direct runtime modules
- dynamic runtime modules
- verified public non-JavaScript dependencies
- deliberately retained compatibility assets

It also identified dependencies that a JavaScript-only whitelist would have missed, including the Document Center stylesheet and Gmail Add-on launcher/icon assets.

### Cleanup #11: isolated site build

Cleanup #11 physically built the audited file set into `_site/` without using it for production. CI then:

- verified every copied file byte-for-byte;
- syntax-checked the JavaScript inside the built artifact;
- rejected repository-only classes;
- served `_site/` locally;
- HTTP-smoked the application and auxiliary public assets.

Only after that isolated build stayed green was the production switch considered.

### Cleanup #12: production switch

Cleanup #12 changes only deployment/governance files so that GitHub Pages uses the already-tested artifact.

## Production builder

Run:

```bash
node scripts/pages-artifact-build.mjs
```

The builder first runs:

```bash
node scripts/pages-artifact-audit.mjs
```

The audit requires `pages-artifact-manifest.json` to be in `PRODUCTION_ARTIFACT` mode and verifies that `.github/workflows/static.yml`:

1. runs the artifact builder;
2. does so before the Pages upload action;
3. uploads `_site`;
4. does not contain the old whole-repository `path: '.'` deployment.

The builder then:

1. derives the production file set from current runtime sources;
2. recreates `_site/` from scratch;
3. copies only approved public files while preserving paths;
4. verifies every copied file with SHA-256;
5. adds `.nojekyll`;
6. rejects unexpected files;
7. rejects repository-only classes such as `.github/`, `tests/`, `scripts/`, `supabase/`, SQL and package metadata;
8. syntax-checks every JavaScript file in `_site/`;
9. checks local HTML/CSS static asset references;
10. verifies the builder output directory matches the configured production Pages upload path.

The generated `_site/` directory remains disposable build output and is not committed.

## Production deployment flow

```text
main checkout
    ↓
existing syntax checks
    ↓
node scripts/pages-artifact-build.mjs
    ↓
verified _site/
    ↓
actions/upload-pages-artifact
    ↓
GitHub Pages production
```

The repository-only files remain available in GitHub for development, testing, audits and operations, but they are no longer intended to be web-published by Pages.

## Independent CI gate

`.github/workflows/pages-site-build-check.yml` still runs independently on pull requests, pushes to `main`, and manual dispatch.

It:

1. audits the production artifact policy;
2. builds `_site/`;
3. serves `_site/` locally;
4. HTTP-smokes the main app, Gmail launcher, Document Center CSS and Gmail Add-on icon;
5. confirms production builds the artifact and uploads only `_site`;
6. uploads a short-lived copy of the built site for inspection.

This independent workflow is intentionally separate from the actual Pages deploy so artifact completeness is tested before and outside the deployment job itself.

## Rollback

The deployment switch is intentionally small. If a production-only issue is discovered, rollback consists of reverting Cleanup #12 so `.github/workflows/static.yml` returns to the previous whole-repository upload while the artifact audit/build tooling can remain available for diagnosis.

A rollback must not delete runtime modules or change application code.
