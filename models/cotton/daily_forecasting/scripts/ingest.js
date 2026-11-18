"use strict";
const fs = require("fs"), path = require("path");
const { parseCsv, writeCsv, prepareSourceRows } = require("../src/core");
function args(values) { const out = {}; for (let i = 2; i < values.length; i += 2) out[values[i].replace(/^--/, "").replace(/-/g, "_")] = values[i + 1]; return out; }
const q = args(process.argv), base = path.resolve(__dirname, ".."), file = path.join(base, "data", "daily_market_prices.csv");
for (const field of ["date","district","market","variety","min_price","max_price","modal_price"]) if (!q[field]) throw new Error(`Missing --${field.replace(/_/g, "-")}`);
const raw = { date:q.date, district:q.district, market:q.market, variety:q.variety, min_price:q.min_price, max_price:q.max_price, modal_price:q.modal_price,
  arrivals_tonnes:q.arrivals_tonnes || 0, actual_rain_mm:q.actual_rain_mm || 0, source:q.source || "farmer_submission" };
const { accepted, rejected } = prepareSourceRows([raw]); if (rejected.length) throw new Error(rejected[0].reason);
const existing = parseCsv(fs.readFileSync(file, "utf8")), r = accepted[0];
if (existing.some(x => x.date===r.date && x.district===r.district && x.market===r.market && x.variety===r.variety)) throw new Error("A record already exists for this date, district, market and variety; use an audited correction workflow.");
existing.push(r); existing.sort((a,b)=>a.date.localeCompare(b.date)||a.district.localeCompare(b.district)||a.market.localeCompare(b.market)||a.variety.localeCompare(b.variety));
writeCsv(file, existing, ["date","district","market","variety","arrivals_tonnes","min_price","max_price","modal_price","actual_rain_mm","source","verified"]);
console.log(JSON.stringify({ status:"stored", record:r }, null, 2));
