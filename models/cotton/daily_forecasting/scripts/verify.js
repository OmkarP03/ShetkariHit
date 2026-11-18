"use strict";
const fs = require("fs"), path = require("path");
const { loadPrepared, sha256 } = require("../src/core");
const base = path.resolve(__dirname, ".."), dataFile = path.join(base, "data", "daily_market_prices.csv");
const modelFile = path.join(base, "artifacts", "cotton_daily_forecast_model.json");
const model = JSON.parse(fs.readFileSync(modelFile, "utf8")), records = loadPrepared(dataFile), failures = [], warnings = [];
if (model.data_sha256 !== sha256(dataFile)) failures.push("The model is stale because the training CSV changed.");
if (JSON.stringify(model.models.map(m => m.horizon_days)) !== JSON.stringify([1,7,30])) failures.push("Expected 1, 7 and 30-day models.");
const limits = { 1: 3, 7: 4, 30: 8 };
for (const horizon of model.models) {
  const m = horizon.validation.model;
  if (!Number.isFinite(m.mape) || m.mape > limits[horizon.horizon_days]) failures.push(`${horizon.horizon_days}-day MAPE ${m.mape} exceeds ${limits[horizon.horizon_days]}%.`);
  if (m.count < 500) failures.push(`${horizon.horizon_days}-day validation has only ${m.count} observations.`);
  if (!(horizon.interval_80_pct > 0 && horizon.interval_95_pct >= horizon.interval_80_pct)) failures.push(`${horizon.horizon_days}-day intervals are invalid.`);
  if (horizon.prediction_strategy === "persistence") warnings.push(`${horizon.horizon_days}-day learned candidates did not beat last-price persistence.`);
}
const maxDate = records.reduce((max, row) => row.date > max ? row.date : max, "");
if (model.trained_through !== maxDate) failures.push(`Model ends ${model.trained_through}, but data ends ${maxDate}.`);
console.log(JSON.stringify({ status: failures.length ? "failed" : "passed", records: records.length, trained_through: model.trained_through, warnings, failures }, null, 2));
if (failures.length) process.exitCode = 1;
