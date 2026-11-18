"use strict";
const fs = require("fs"), path = require("path");
const { loadPrepared, trainHorizon, writeCsv, sha256, FEATURE_NAMES, isoDate } = require("../src/core");
const base = path.resolve(__dirname, "..");
const dataFile = path.join(base, "data", "daily_market_prices.csv"), records = loadPrepared(dataFile);
const maxMs = Math.max(...records.map(r => r.dateMs)), validationStartMs = maxMs - 365 * 86_400_000;
const trained = [1, 7, 30].map(h => trainHorizon(records, h, validationStartMs));
const bundle = { schema_version: 1, model_type: "direct_horizon_ridge_with_last_price_blend", target: "market-variety modal price",
  trained_at: new Date().toISOString(), trained_through: isoDate(new Date(maxMs)), validation_policy: "last 365 days; rolling daily observations available up to each origin date",
  data_sha256: sha256(dataFile), features: FEATURE_NAMES, models: trained.map(({ backtest, ...model }) => model) };
const outDir = path.join(base, "artifacts"); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "cotton_daily_forecast_model.json"), JSON.stringify(bundle, null, 2));
fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify({ trained_through: bundle.trained_through, horizons: trained.map(h => ({ horizon_days: h.horizon_days, prediction_strategy: h.prediction_strategy, blend: h.blend, interval_80_pct: h.interval_80_pct, interval_95_pct: h.interval_95_pct, validation: h.validation })) }, null, 2));
writeCsv(path.join(outDir, "backtest_predictions.csv"), trained.flatMap(h => h.backtest), ["horizon_days","origin_date","target_date","district","market","variety","actual_price","predicted_price","error_pct"]);
console.log(JSON.stringify({ trained_through: bundle.trained_through, records: records.length, validation_start: isoDate(new Date(validationStartMs)), horizons: trained.map(h => ({ horizon_days: h.horizon_days, prediction_strategy: h.prediction_strategy, blend: h.blend, model: h.validation.model, baseline: h.validation.baseline_last_price, interval_80_pct: h.interval_80_pct })) }, null, 2));
