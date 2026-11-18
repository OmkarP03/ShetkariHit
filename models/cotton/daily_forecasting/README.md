# ShetkariHit daily cotton forecasting

This folder provides market-and-variety-level cotton forecasts for 1, 7 and 30 calendar days ahead. It uses only verified observations available at each prediction date. The models predict each horizon directly and return an 80% empirical range alongside the point estimate.

The implementation uses Node.js with no third-party packages. The model artifact is portable JSON, which makes it easier to call from an API service than the earlier pickle file.

## Build and train

From this folder:

```powershell
npm.cmd run prepare
npm.cmd test
npm.cmd run train
npm.cmd run verify
```

The preparation step reads `../cleaning/cotton_cleaned_stage1.csv`, rejects invalid price records and writes an aggregated daily dataset to `data/daily_market_prices.csv`. Training uses the most recent 365 days as an out-of-time rolling validation period. For every horizon, it compares regularized models and blends against the last-price baseline. The selected model cannot score worse than that baseline on the recorded validation period because the baseline is one of the candidates.

After new verified observations have been appended, `npm.cmd run daily` retrains all horizons and applies the deployment checks in one command.

## Add a verified daily observation

```powershell
npm.cmd run ingest -- --date 2026-10-21 --district Akola --market "APMC Akola" --variety Desi --min-price 7800 --max-price 8300 --modal-price 8100 --arrivals-tonnes 125 --source verified_market_report
```

The command rejects duplicates, invalid dates, out-of-range values and inconsistent price ordering. Production applications should first store farmer submissions as unverified records and promote them only after confirmation from the market or an authorized reviewer.

## Predict

```powershell
npm.cmd run predict -- --district Akola --market "APMC Akola" --variety Desi --as-of 2026-10-21
```

The market and variety need at least two verified historical observations. If today's observation is unavailable, the service automatically uses the latest verified observation from the previous 30 days. It marks the result as `stale_fallback`, reports `data_age_days`, lowers the confidence label and widens the range. The response contains 1-day, 7-day and 30-day point estimates, 80% ranges and the corresponding validation MAPE.

## Production schedule

Append verified records throughout the day. Run preparation only for a full historical rebuild. Run training after daily validation closes or on a weekly schedule, then atomically replace the active model after its metrics pass your deployment thresholds. Keep every model, metric file and source-data hash for auditability.

The forecasts are estimates. Market prices can move outside the reported range during weather shocks, policy changes or sudden supply and demand changes.
