# PPPP Bootstrap Runtime

## Purpose

The production bootstrap must preserve strict sequential module loading. Load order is runtime behavior because later modules intentionally decorate, replace, or wrap earlier globals and DOM owners.

## Source of truth

- Editable ordered registry: `runtime-bootstrap-order.json`
- Generated production artifact: `pristeel-project-emails.js`
- Generator: `scripts/generate-bootstrap.mjs`
- Sequence guard: `scripts/bootstrap-sequence-check.mjs`
- Runtime ownership/audit: `runtime-manifest.json`

`pristeel-project-emails.js` remains the file loaded in production. The registry/generator architecture does **not** add another browser request and does **not** change bootstrap timing.

## Current invariant

The audited registry contains 149 versioned module entries.

Sequence SHA-256:

`96de57adc1d370cd160702e37e487c1046391f7b71c4c2db4a4021a6b843eacc`

At introduction of this registry, the generator reproduces the existing production `pristeel-project-emails.js` byte-for-byte, including its current Git blob SHA.

## Rules

1. Do not hand-edit the generated module list in `pristeel-project-emails.js`.
2. Change ordered modules or cache-version query strings in `runtime-bootstrap-order.json`.
3. Run `node scripts/generate-bootstrap.mjs` to regenerate the production artifact.
4. Run `node scripts/generate-bootstrap.mjs --check` to prove the artifact matches the registry exactly.
5. Any deliberate sequence change requires review of `runtime-manifest.json`, load-order constraints, final owners, compatibility layers, and smoke tests.
6. If the generated production artifact changes, update the audited `bootstrapGitBlobSha` in `runtime-manifest.json` only after reviewing that runtime change.
7. Never parallelize the bootstrap without a separate dependency audit. The current engine loads one module at a time and continues after an individual module load error.

## Why this exists

Previously, the ordered registry and the loader engine lived as one large hand-maintained file. The registry/generator split makes the order explicit and machine-checkable while keeping the browser runtime behavior unchanged.
