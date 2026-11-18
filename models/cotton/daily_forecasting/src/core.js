"use strict";

const fs = require("fs");
const crypto = require("crypto");

const DAY_MS = 86_400_000;
const FEATURE_NAMES = [
  "ret_prev_observation", "ret_7d", "ret_30d", "ret_90d",
  "price_vs_mean_7d", "price_vs_mean_30d", "price_vs_mean_90d",
  "volatility_7d", "volatility_30d", "volatility_90d",
  "log_arrivals", "arrivals_vs_mean_30d", "days_since_previous",
  "rain_actual_log", "day_sin", "day_cos", "month_sin", "month_cos",
  "market_price_ratio", "district_price_ratio", "variety_price_ratio",
  "month_price_ratio"
];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") {
      row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter(r => r.some(v => v !== "")).map(r =>
    Object.fromEntries(headers.map((header, index) => [header, r[index] ?? ""]))
  );
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(file, rows, headers) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(headers.map(h => csvEscape(row[h])).join(","));
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
}

function parseDate(value) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const text = String(value || "").trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return validDate(+match[3], +match[1], +match[2]);
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return validDate(+match[1], +match[2], +match[3]);
  throw new Error(`Invalid date '${text}'. Use YYYY-MM-DD or M/D/YYYY.`);
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date ${year}-${month}-${day}`);
  }
  return date;
}

function isoDate(date) { return date.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }
function number(value, fallback = NaN) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDistrict(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  const key = cleaned.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    amarawati: "Amravati", amravati: "Amravati",
    chattrapatisambhajinagar: "Chhatrapati Sambhajinagar",
    chhatrapatisambhajinagar: "Chhatrapati Sambhajinagar",
    parabhani: "Parbhani", parbhani: "Parbhani"
  };
  return aliases[key] || cleaned;
}

function normalizeText(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function seriesKey(record) { return `${record.district}\u001f${record.market}\u001f${record.variety}`; }

function prepareSourceRows(sourceRows) {
  const accepted = [], rejected = [], seen = new Set();
  for (let index = 0; index < sourceRows.length; index++) {
    const raw = sourceRows[index];
    try {
      const date = parseDate(raw["Reported Date"] ?? raw.date);
      const record = {
        date: isoDate(date), dateMs: date.getTime(),
        district: normalizeDistrict(raw.District ?? raw.district),
        market: normalizeText(raw.Market ?? raw.market),
        variety: normalizeText(raw.Variety ?? raw.variety),
        arrivals_tonnes: number(raw["Arrivals (Tonnes)"] ?? raw.arrivals_tonnes, 0),
        min_price: number(raw["Min.Price (Rs/Quintal)"] ?? raw.min_price),
        max_price: number(raw["Max.Price (Rs/Quintal)"] ?? raw.max_price),
        modal_price: number(raw["Modal.Price (Rs/Quintal)"] ?? raw.modal_price),
        actual_rain_mm: number(raw["Actual Rainfall in mm"] ?? raw.actual_rain_mm, 0),
        source: normalizeText(raw.source || "historical_dataset"), verified: "1"
      };
      if (!record.district || !record.market || !record.variety) throw new Error("district, market and variety are required");
      if (!(record.modal_price >= 1000 && record.modal_price <= 20000)) throw new Error("modal price outside ₹1,000–₹20,000");
      if (!Number.isFinite(record.min_price) || !Number.isFinite(record.max_price) || record.min_price > record.max_price || record.modal_price < record.min_price || record.modal_price > record.max_price) {
        throw new Error("price order must satisfy min <= modal <= max");
      }
      if (!(record.arrivals_tonnes >= 0 && record.arrivals_tonnes <= 100000)) throw new Error("arrivals outside accepted range");
      const duplicateKey = `${record.date}\u001f${seriesKey(record)}\u001f${record.modal_price}\u001f${record.arrivals_tonnes}`;
      if (seen.has(duplicateKey)) throw new Error("exact duplicate");
      seen.add(duplicateKey); accepted.push(record);
    } catch (error) {
      rejected.push({ row_number: index + 2, reason: error.message });
    }
  }
  return { accepted, rejected };
}

function aggregateDaily(records) {
  const groups = new Map();
  for (const record of records) {
    if (String(record.verified) !== "1") continue;
    const key = `${seriesKey(record)}\u001f${record.date}`;
    let group = groups.get(key);
    if (!group) {
      group = { ...record, weight: 0, weightedPrice: 0, weightedMin: 0, weightedMax: 0, weightedRain: 0, count: 0 };
      groups.set(key, group);
    }
    const weight = record.arrivals_tonnes > 0 ? record.arrivals_tonnes : 1;
    group.weight += weight; group.weightedPrice += record.modal_price * weight;
    group.weightedMin += record.min_price * weight; group.weightedMax += record.max_price * weight;
    group.weightedRain += record.actual_rain_mm * weight; group.arrivals_tonnes = (group.arrivals_tonnes || 0) + record.arrivals_tonnes;
    group.count++;
  }
  return [...groups.values()].map(g => ({
    date: g.date, dateMs: g.dateMs, district: g.district, market: g.market, variety: g.variety,
    arrivals_tonnes: g.arrivals_tonnes, min_price: g.weightedMin / g.weight,
    max_price: g.weightedMax / g.weight, modal_price: g.weightedPrice / g.weight,
    actual_rain_mm: g.weightedRain / g.weight, source: g.source, verified: "1"
  })).sort((a, b) => a.dateMs - b.dateMs || seriesKey(a).localeCompare(seriesKey(b)));
}

function groupSeries(records) {
  const groups = new Map();
  for (const record of records) {
    const key = seriesKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  for (const rows of groups.values()) rows.sort((a, b) => a.dateMs - b.dateMs);
  return groups;
}

function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN; }
function std(values) { const avg = mean(values); return values.length > 1 ? Math.sqrt(mean(values.map(v => (v - avg) ** 2))) : 0; }
function quantile(values, q) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b), pos = (sorted.length - 1) * q, low = Math.floor(pos), high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

function entityStats(records) {
  const overall = mean(records.map(r => r.modal_price));
  const stats = { overall, market: {}, district: {}, variety: {}, month: {} };
  for (const [field, target] of [["market", "market"], ["district", "district"], ["variety", "variety"]]) {
    const buckets = new Map();
    for (const r of records) { if (!buckets.has(r[field])) buckets.set(r[field], []); buckets.get(r[field]).push(r.modal_price); }
    for (const [key, values] of buckets) stats[target][key] = mean(values);
  }
  const monthBuckets = new Map();
  for (const r of records) { const m = new Date(r.dateMs).getUTCMonth() + 1; if (!monthBuckets.has(m)) monthBuckets.set(m, []); monthBuckets.get(m).push(r.modal_price); }
  for (const [key, values] of monthBuckets) stats.month[key] = mean(values);
  return stats;
}

function withinDays(rows, index, days) {
  const cutoff = rows[index].dateMs - days * DAY_MS, values = [];
  for (let j = index; j >= 0 && rows[j].dateMs >= cutoff; j--) values.push(rows[j]);
  return values;
}

function priceAtOrBefore(rows, index, daysAgo) {
  const target = rows[index].dateMs - daysAgo * DAY_MS;
  for (let j = index; j >= 0; j--) if (rows[j].dateMs <= target) return rows[j].modal_price;
  return rows[0].modal_price;
}

function featureVector(rows, index, stats) {
  const current = rows[index], price = current.modal_price, previous = rows[Math.max(0, index - 1)];
  const windows = [7, 30, 90].map(days => withinDays(rows, index, days));
  const means = windows.map(w => mean(w.map(r => r.modal_price)) || price);
  const vols = windows.map(w => std(w.map(r => Math.log(r.modal_price))) || 0);
  const arrivals30 = mean(windows[1].map(r => r.arrivals_tonnes)) || Math.max(current.arrivals_tonnes, 1);
  const date = new Date(current.dateMs), day = Math.floor((current.dateMs - Date.UTC(date.getUTCFullYear(), 0, 0)) / DAY_MS), month = date.getUTCMonth() + 1;
  const safeLogReturn = old => Math.log(price / Math.max(old, 1));
  return [
    safeLogReturn(previous.modal_price), safeLogReturn(priceAtOrBefore(rows, index, 7)),
    safeLogReturn(priceAtOrBefore(rows, index, 30)), safeLogReturn(priceAtOrBefore(rows, index, 90)),
    Math.log(price / means[0]), Math.log(price / means[1]), Math.log(price / means[2]),
    vols[0], vols[1], vols[2], Math.log1p(current.arrivals_tonnes),
    Math.log((current.arrivals_tonnes + 1) / (arrivals30 + 1)), Math.min(daysBetween(new Date(previous.dateMs), new Date(current.dateMs)), 30),
    Math.log1p(Math.max(current.actual_rain_mm, 0)), Math.sin(2 * Math.PI * day / 365.25), Math.cos(2 * Math.PI * day / 365.25),
    Math.sin(2 * Math.PI * month / 12), Math.cos(2 * Math.PI * month / 12),
    Math.log((stats.market[current.market] || stats.overall) / stats.overall),
    Math.log((stats.district[current.district] || stats.overall) / stats.overall),
    Math.log((stats.variety[current.variety] || stats.overall) / stats.overall),
    Math.log((stats.month[month] || stats.overall) / stats.overall)
  ];
}

function buildExamples(records, horizon, stats, toleranceDays) {
  const examples = [];
  for (const rows of groupSeries(records).values()) {
    let targetIndex = 1;
    for (let index = 1; index < rows.length; index++) {
      targetIndex = Math.max(targetIndex, index + 1);
      const desired = rows[index].dateMs + horizon * DAY_MS;
      while (targetIndex < rows.length && rows[targetIndex].dateMs < desired) targetIndex++;
      if (targetIndex >= rows.length || rows[targetIndex].dateMs > desired + toleranceDays * DAY_MS) continue;
      const target = rows[targetIndex], current = rows[index];
      examples.push({
        x: featureVector(rows, index, stats), y: Math.log(target.modal_price / current.modal_price),
        currentPrice: current.modal_price, actual: target.modal_price, originDate: current.date,
        originMs: current.dateMs, targetDate: target.date, targetMs: target.dateMs,
        district: current.district, market: current.market, variety: current.variety
      });
    }
  }
  return examples.sort((a, b) => a.originMs - b.originMs);
}

function standardize(examples) {
  const means = FEATURE_NAMES.map((_, j) => mean(examples.map(e => e.x[j])));
  const scales = FEATURE_NAMES.map((_, j) => std(examples.map(e => e.x[j])) || 1);
  return { means, scales };
}

function solveLinear(matrix, vector) {
  const n = vector.length, augmented = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
    [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
    const divisor = augmented[col][col];
    if (Math.abs(divisor) < 1e-12) continue;
    for (let j = col; j <= n; j++) augmented[col][j] /= divisor;
    for (let row = 0; row < n; row++) if (row !== col) {
      const factor = augmented[row][col];
      for (let j = col; j <= n; j++) augmented[row][j] -= factor * augmented[col][j];
    }
  }
  return augmented.map((row, i) => Number.isFinite(row[n]) ? row[n] : 0);
}

function fitRidge(examples, lambda) {
  const { means, scales } = standardize(examples), p = FEATURE_NAMES.length + 1;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0)), xty = Array(p).fill(0);
  for (const example of examples) {
    const x = [1, ...example.x.map((v, j) => (v - means[j]) / scales[j])];
    for (let j = 0; j < p; j++) { xty[j] += x[j] * example.y; for (let k = 0; k <= j; k++) xtx[j][k] += x[j] * x[k]; }
  }
  for (let j = 0; j < p; j++) { for (let k = 0; k < j; k++) xtx[k][j] = xtx[j][k]; if (j > 0) xtx[j][j] += lambda; }
  return { lambda, means, scales, coefficients: solveLinear(xtx, xty) };
}

function predictReturn(model, x) {
  let value = model.coefficients[0];
  for (let j = 0; j < FEATURE_NAMES.length; j++) value += model.coefficients[j + 1] * ((x[j] - model.means[j]) / model.scales[j]);
  return Math.max(-0.7, Math.min(0.7, value));
}

function predictions(model, examples, blend) {
  return examples.map(e => {
    const modelPrice = e.currentPrice * Math.exp(predictReturn(model, e.x));
    return e.currentPrice * (1 - blend) + modelPrice * blend;
  });
}

function driftParameters(examples) {
  const overall = { mean: mean(examples.map(e => e.y)), median: quantile(examples.map(e => e.y), 0.5) };
  const month = {};
  for (let m = 1; m <= 12; m++) {
    const values = examples.filter(e => new Date(e.originMs).getUTCMonth() + 1 === m).map(e => e.y);
    month[m] = values.length >= 20 ? { mean: mean(values), median: quantile(values, 0.5) } : overall;
  }
  return { overall, month };
}

function driftPredictions(examples, parameters, strategy) {
  return examples.map(e => {
    const month = new Date(e.originMs).getUTCMonth() + 1;
    const drift = strategy === "global_mean" ? parameters.overall.mean
      : strategy === "global_median" ? parameters.overall.median
      : strategy === "seasonal_mean" ? parameters.month[month].mean
      : parameters.month[month].median;
    return e.currentPrice * Math.exp(drift);
  });
}

function metrics(examples, predicted) {
  const errors = predicted.map((p, i) => p - examples[i].actual), actual = examples.map(e => e.actual);
  const absPct = errors.map((e, i) => Math.abs(e / actual[i]) * 100), avg = mean(actual);
  const sse = errors.reduce((s, e) => s + e * e, 0), sst = actual.reduce((s, a) => s + (a - avg) ** 2, 0);
  return {
    count: examples.length, mae: mean(errors.map(Math.abs)), rmse: Math.sqrt(mean(errors.map(e => e * e))),
    mape: mean(absPct), bias: mean(errors), r2: sst ? 1 - sse / sst : null,
    within_5_pct: mean(absPct.map(v => v <= 5 ? 100 : 0)), within_10_pct: mean(absPct.map(v => v <= 10 ? 100 : 0))
  };
}

function trainHorizon(records, horizon, validationStartMs) {
  const tolerance = horizon === 1 ? 3 : horizon === 7 ? 4 : 10;
  const encodingRecords = records.filter(r => r.dateMs < validationStartMs), validationStats = entityStats(encodingRecords);
  const examples = buildExamples(records, horizon, validationStats, tolerance);
  const train = examples.filter(e => e.targetMs < validationStartMs), validation = examples.filter(e => e.originMs >= validationStartMs);
  if (train.length < 100 || validation.length < 30) throw new Error(`Insufficient horizon-${horizon} examples: train=${train.length}, validation=${validation.length}`);
  const baselinePredicted = validation.map(e => e.currentPrice);
  let best = { strategy: "persistence", blend: 0, predicted: baselinePredicted, metrics: metrics(validation, baselinePredicted) };
  const trainingDrift = driftParameters(train);
  for (const strategy of ["global_mean", "global_median", "seasonal_mean", "seasonal_median"]) {
    const predicted = driftPredictions(validation, trainingDrift, strategy), score = metrics(validation, predicted);
    if (score.mape < best.metrics.mape) best = { strategy, blend: 0, predicted, metrics: score };
  }
  for (const lambda of [0.1, 1, 10, 100]) {
    const fitted = fitRidge(train, lambda);
    for (const blend of Array.from({ length: 21 }, (_, i) => i / 20)) {
      const predicted = predictions(fitted, validation, blend), score = metrics(validation, predicted);
      if (score.mape < best.metrics.mape) best = { strategy: "ridge_blend", lambda, blend, fitted, predicted, metrics: score };
    }
  }
  const baseline = metrics(validation, baselinePredicted);
  const absPct = best.predicted.map((p, i) => Math.abs(p / validation[i].actual - 1));
  const finalStats = entityStats(records), finalExamples = buildExamples(records, horizon, finalStats, tolerance);
  const finalModel = fitRidge(finalExamples, best.lambda || 10), finalDrift = driftParameters(finalExamples);
  return {
    horizon_days: horizon, tolerance_days: tolerance, prediction_strategy: best.strategy, blend: best.blend,
    interval_80_pct: quantile(absPct, 0.80), interval_95_pct: quantile(absPct, 0.95),
    validation: { start_date: isoDate(new Date(validationStartMs)), model: best.metrics, baseline_last_price: baseline },
    model: finalModel, drift: finalDrift, entity_stats: finalStats,
    backtest: validation.map((e, i) => ({ horizon_days: horizon, origin_date: e.originDate, target_date: e.targetDate,
      district: e.district, market: e.market, variety: e.variety, actual_price: e.actual,
      predicted_price: +best.predicted[i].toFixed(2), error_pct: +((best.predicted[i] / e.actual - 1) * 100).toFixed(3) }))
  };
}

function loadPrepared(file) {
  return parseCsv(fs.readFileSync(file, "utf8")).map(raw => ({
    date: raw.date, dateMs: parseDate(raw.date).getTime(), district: normalizeDistrict(raw.district), market: normalizeText(raw.market), variety: normalizeText(raw.variety),
    arrivals_tonnes: number(raw.arrivals_tonnes, 0), min_price: number(raw.min_price), max_price: number(raw.max_price), modal_price: number(raw.modal_price),
    actual_rain_mm: number(raw.actual_rain_mm, 0), source: raw.source, verified: raw.verified
  }));
}

function forecast(modelBundle, records, query) {
  const district = normalizeDistrict(query.district), market = normalizeText(query.market), variety = normalizeText(query.variety);
  const rows = groupSeries(records).get(`${district}\u001f${market}\u001f${variety}`);
  if (!rows || rows.length < 2) throw new Error("At least two verified observations are required for this market and variety.");
  const asOfMs = query.as_of ? parseDate(query.as_of).getTime() : rows[rows.length - 1].dateMs;
  let index = rows.length - 1; while (index >= 0 && rows[index].dateMs > asOfMs) index--;
  if (index < 1) throw new Error("Not enough history at the requested as-of date.");
  const current = rows[index], ageDays = daysBetween(new Date(current.dateMs), new Date(asOfMs));
  if (ageDays > 30) throw new Error(`Latest verified price is ${ageDays} days old. A market-specific forecast requires an observation from the last 30 days.`);
  return modelBundle.models.map(h => {
    const x = featureVector(rows, index, h.entity_stats), modelPrice = current.modal_price * Math.exp(predictReturn(h.model, x));
    const month = new Date(current.dateMs).getUTCMonth() + 1;
    let point = current.modal_price;
    if (h.prediction_strategy === "ridge_blend") point = current.modal_price * (1 - h.blend) + modelPrice * h.blend;
    else if (h.prediction_strategy !== "persistence") {
      const drift = h.prediction_strategy === "global_mean" ? h.drift.overall.mean
        : h.prediction_strategy === "global_median" ? h.drift.overall.median
        : h.prediction_strategy === "seasonal_mean" ? h.drift.month[month].mean : h.drift.month[month].median;
      point = current.modal_price * Math.exp(drift);
    }
    // When today's observation is missing, extend the horizon from the latest
    // verified observation and widen the empirical range. This is deliberately
    // visible in the response so the UI can label the result as a fallback.
    const effectiveHorizonDays = h.horizon_days + ageDays;
    if (effectiveHorizonDays !== h.horizon_days && point > 0) {
      const horizonGrowth = Math.log(point / current.modal_price);
      point = current.modal_price * Math.exp(horizonGrowth * effectiveHorizonDays / h.horizon_days);
    }
    const uncertainty = Math.min(0.35,
      h.interval_80_pct * Math.sqrt(effectiveHorizonDays / h.horizon_days) + ageDays * 0.0025);
    return { horizon_days: h.horizon_days, target_date: isoDate(new Date(asOfMs + h.horizon_days * DAY_MS)),
      predicted_price: +point.toFixed(2), range_80_low: +(point * (1 - uncertainty)).toFixed(2), range_80_high: +(point * (1 + uncertainty)).toFixed(2),
      latest_price: current.modal_price, latest_price_date: current.date, data_age_days: ageDays,
      input_status: ageDays === 0 ? "current" : "stale_fallback", confidence: ageDays === 0 ? "normal" : ageDays <= 3 ? "reduced" : "low",
      validation_mape: h.validation.model.mape,
      warning: ageDays === 0 ? null : `No verified price for ${isoDate(new Date(asOfMs))}; forecast uses ${current.date} data.` };
  });
}

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

module.exports = { FEATURE_NAMES, parseCsv, writeCsv, parseDate, isoDate, number, normalizeDistrict, normalizeText,
  prepareSourceRows, aggregateDaily, loadPrepared, trainHorizon, forecast, metrics, sha256 };
