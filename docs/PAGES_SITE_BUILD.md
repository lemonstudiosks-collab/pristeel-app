# PPPP candidate GitHub Pages site build

## Status

This is a **build-and-test gate only**.

It does not change the production GitHub Pages deployment path. Production continues to upload the whole repository from `path: '.'` in `.github/workflows/static.yml`.

## Purpose

Cleanup #10 established an audited candidate public artifact derived from:

- `runtime-manifest.json`
- the ordered active bootstrap
- direct runtime modules
- dynamic runtime modules
- verified public non-JavaScript dependencies
- deliberately retained compatibility assets

Cleanup #11 takes the next safe step: it physically builds those files into `_site/` and tests that directory as an isolated static website without deploying it to production.

## Builder

Run:

```bash
node scripts/pages-artifact-build.mjs
```

The builder first re-runs `scripts/pages-artifact-audit.mjs`. It stops if the audit fails or if the manifest is no longer in `AUDIT_ONLY` mode.

It then:

1. derives the candidate file set using the same current runtime sources used by the audit;
2. recreates `_site/` from scratch;
3. copies only candidate public files while preserving paths;
4. verifies every copied file byte-for-byte with SHA-256;
5. adds `.nojekyll` to the generated site;
6. verifies no unexpected file entered the artifact;
7. rejects repository-only classes such as `.github/`, `tests/`, `scripts/`, `supabase/`, SQL and package metadata;
8. syntax-checks every JavaScript file in the built artifact;
9. checks local HTML/CSS asset references that resolve to static file types.

The generated `_site/` directory is disposable CI output and is not committed.

## CI workflow

`.github/workflows/pages-site-build-check.yml` runs on pull requests, pushes to `main`, and manual dispatch.

The workflow:

1. re-runs the Pages artifact audit;
2. builds `_site/`;
3. serves `_site/` locally with a static HTTP server;
4. performs HTTP smoke requests for the main application and verified auxiliary public assets;
5. confirms `.github/workflows/static.yml` still uses `path: '.'`;
6. uploads `_site/` only as a short-lived GitHub Actions artifact for inspection.

The CI artifact is **not** a GitHub Pages deployment.

## Production safety boundary

This cleanup is successful only if all of the following remain true:

- no application JavaScript is edited;
- no production HTML is edited;
- `.github/workflows/static.yml` is unchanged;
- Pages still deploys `path: '.'`;
- the existing runtime manifest guard passes;
- the existing full PRISTEEL test suite passes;
- the new candidate-site build and HTTP smoke pass.

## Future deployment switch

A future change from:

```yaml
path: '.'
```

to:

```yaml
path: '_site'
```

must be a separate reviewed cleanup. It should not be bundled into this build-validation step.
