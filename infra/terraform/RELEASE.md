# First-release file manifest

Baseline: `07217ca307d741745d80c9a6506980c950e46504` on
`sarthak/shetkarihit`. Local HEAD and the local origin tracking ref matched at
review. The index matched HEAD. GitHub has not been queried. The baseline
contains no root buildspec or Terraform files. This manifest describes an
uncommitted candidate, not a Git revision.

## CI/CD and release review

- Root: `.gitignore`, `buildspec.yml`.
- `infra/terraform/`: `.terraform.lock.hcl`, `main.tf`, `storage.tf`,
  `cloudfront.tf`, `iam.tf`, `pipeline.tf`, `deploy.yml`,
  `terraform.tfvars.example`, `tests/offline.tftest.hcl`, `README.md`,
  and this `RELEASE.md`. The lockfile, documentation and tests belong in
  source control; only the root buildspec runs from the GitHub source ZIP.
- The private variable file, state, provider cache, local environment files,
  installed dependencies and build output belong outside the release tree.

## Frontend production inputs

Start with the entire **tracked frontend tree at the baseline**, including
its package-lock.json, src, public, HTML and tool configurations. The exact
baseline paths are available with
`git ls-tree -r --name-only 07217ca307d741745d80c9a6506980c950e46504 -- frontend`.
Keep the baseline app routes, copy and styling. Overlay:

- `frontend/vite.config.ts`: take **only the workbox block** introducing
  importScripts and disabling runtime caching. Keep the baseline manifest
  for this candidate; the working copy retains the user's newer manifest.
- `frontend/public/retire-api-cache.js`: worker activation cleanup.
- `frontend/src/context/AuthContext.tsx`: logout cleanup.
- `frontend/src/services/supabase.ts`: disable browser HTTP caching on the client.
- `frontend/scripts/check-public-config.mjs`: build input gate.
- `frontend/tests/cache-upgrade.test.js`: required CI test, outside the bundle.

## Existing modified frontend work

These **14 tracked files** already differed from HEAD before CI/CD implementation.
Under `frontend/`: `package-lock.json`, `src/App.tsx`, `src/i18n/en.json`,
`src/i18n/mr.json`, `src/index.css`, `src/layouts/AppShell.tsx`,
`src/pages/Account.tsx`, `src/pages/Home.tsx`, `src/pages/Schemes.tsx`,
`src/pages/Signup.tsx`, `src/pages/Welcome.tsx`, `tailwind.config.js`,
`tsconfig.json`, and `vite.config.ts`. Defer their pre-existing diffs until
the feature owner selects a forecast/UI release. Preserve them locally.

## Untracked work outside this candidate

- `frontend/src/pages/PricePrediction.tsx`, `frontend/src/services/cottonForecast.ts`,
  and `frontend/src/services/cottonForecast.test.ts` belong to the forecast feature.
- Its runtime reads `frontend/public/models/cotton/cotton_daily_forecast_model.json`
  and `daily_market_prices.csv` from the same directory. `metrics.json` would
  also be publicly copied by Vite if included. Review all three before publishing.
- All of `models/` (training scripts, serialized model, CSV/XLSX source data,
  reports, charts, backtests and forecasting tools/tests) is outside the first
  release. These files are not needed for the baseline frontend build.

## Acceptance

A clean local clone of the baseline with just these overlays can test the
candidate before a commit exists. After a release commit is authorized,
compare its tree against this manifest, test a fresh checkout **without any
overlays**, and verify that GitHub serves the same SHA on the configured branch.
Never use a blanket add of the current working tree to assemble this release.
