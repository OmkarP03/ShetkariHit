"use strict";
const fs = require("fs"), path = require("path");
const { loadPrepared, forecast } = require("../src/core");
function args(values) { const out = {}; for (let i = 2; i < values.length; i += 2) out[values[i].replace(/^--/, "").replace(/-/g, "_")] = values[i + 1]; return out; }
const query = args(process.argv); if (!query.district || !query.market || !query.variety) throw new Error("Usage: npm run predict -- --district <name> --market <name> --variety <name> [--as-of YYYY-MM-DD]");
const base = path.resolve(__dirname, ".."), model = JSON.parse(fs.readFileSync(path.join(base, "artifacts", "cotton_daily_forecast_model.json"), "utf8"));
console.log(JSON.stringify({ query, predictions: forecast(model, loadPrepared(path.join(base, "data", "daily_market_prices.csv")), query) }, null, 2));
