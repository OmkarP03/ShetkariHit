const DAY_MS = 86_400_000;
const MODEL_URL = '/models/cotton/cotton_daily_forecast_model.json';
const DATA_URL = '/models/cotton/daily_market_prices.csv';

export interface CottonSeries {
  district: string;
  market: string;
  variety: string;
  latestDate: string;
  observations: number;
}

export interface CottonPrediction {
  horizon_days: number;
  target_date: string;
  predicted_price: number;
  range_80_low: number;
  range_80_high: number;
  latest_price: number;
  latest_price_date: string;
  data_age_days: number;
  input_status: 'current' | 'stale_fallback';
  confidence: 'normal' | 'reduced' | 'low';
  validation_mape: number;
  warning: string | null;
}

interface PriceRecord {
  date: string;
  dateMs: number;
  district: string;
  market: string;
  variety: string;
  arrivals_tonnes: number;
  modal_price: number;
  actual_rain_mm: number;
}

interface RidgeModel {
  means: number[];
  scales: number[];
  coefficients: number[];
}

interface Stats {
  overall: number;
  market: Record<string, number>;
  district: Record<string, number>;
  variety: Record<string, number>;
  month: Record<string, number>;
}

interface Drift {
  overall: { mean: number; median: number };
  month: Record<string, { mean: number; median: number }>;
}

interface HorizonModel {
  horizon_days: number;
  prediction_strategy: string;
  blend: number;
  interval_80_pct: number;
  validation: { model: { mape: number } };
  model: RidgeModel;
  drift: Drift;
  entity_stats: Stats;
}

interface ModelBundle {
  trained_at: string;
  trained_through: string;
  models: HorizonModel[];
}

interface Runtime {
  model: ModelBundle;
  records: PriceRecord[];
  groups: Map<string, PriceRecord[]>;
  series: CottonSeries[];
}

let runtimePromise: Promise<Runtime> | null = null;

export function loadCottonRuntime(): Promise<Runtime> {
  if (!runtimePromise) runtimePromise = loadRuntime();
  return runtimePromise;
}

async function loadRuntime(): Promise<Runtime> {
  const [modelResponse, dataResponse] = await Promise.all([fetch(MODEL_URL), fetch(DATA_URL)]);
  if (!modelResponse.ok || !dataResponse.ok) throw new Error('Cotton prediction files could not be loaded.');
  const model = await modelResponse.json() as ModelBundle;
  const records = parseCsv(await dataResponse.text()).map((row) => ({
    date: row.date,
    dateMs: parseDate(row.date).getTime(),
    district: normalizeDistrict(row.district),
    market: normalizeText(row.market),
    variety: normalizeText(row.variety),
    arrivals_tonnes: number(row.arrivals_tonnes, 0),
    modal_price: number(row.modal_price),
    actual_rain_mm: number(row.actual_rain_mm, 0),
  })).filter((row) => Number.isFinite(row.modal_price));
  const groups = groupSeries(records);
  const series = [...groups.values()].map((rows) => ({
    district: rows[0].district,
    market: rows[0].market,
    variety: rows[0].variety,
    latestDate: rows[rows.length - 1].date,
    observations: rows.length,
  })).sort((a, b) => b.latestDate.localeCompare(a.latestDate) || a.market.localeCompare(b.market));
  return { model, records, groups, series };
}

export async function cottonCatalog(): Promise<{ series: CottonSeries[]; trainedThrough: string }> {
  const runtime = await loadCottonRuntime();
  return { series: runtime.series, trainedThrough: runtime.model.trained_through };
}

export async function predictCotton(
  selection: Pick<CottonSeries, 'district' | 'market' | 'variety'>,
  asOf = localIsoDate(new Date()),
): Promise<CottonPrediction[]> {
  const runtime = await loadCottonRuntime();
  const key = seriesKey(selection);
  const rows = runtime.groups.get(key);
  if (!rows || rows.length < 2) throw new Error('This market and variety do not have enough verified observations.');

  const asOfMs = parseDate(asOf).getTime();
  let index = rows.length - 1;
  while (index >= 0 && rows[index].dateMs > asOfMs) index -= 1;
  if (index < 1) throw new Error('There is not enough history for the selected date.');
  const current = rows[index];
  const ageDays = daysBetween(new Date(current.dateMs), new Date(asOfMs));
  if (ageDays > 30) {
    throw new Error(`The latest verified price for this market is ${ageDays} days old. Choose a market with newer data.`);
  }

  return runtime.model.models.map((h) => {
    const x = featureVector(rows, index, h.entity_stats);
    const modelPrice = current.modal_price * Math.exp(predictReturn(h.model, x));
    const month = new Date(current.dateMs).getUTCMonth() + 1;
    let point = current.modal_price;
    if (h.prediction_strategy === 'ridge_blend') {
      point = current.modal_price * (1 - h.blend) + modelPrice * h.blend;
    } else if (h.prediction_strategy !== 'persistence') {
      const monthly = h.drift.month[String(month)];
      const drift = h.prediction_strategy === 'global_mean' ? h.drift.overall.mean
        : h.prediction_strategy === 'global_median' ? h.drift.overall.median
        : h.prediction_strategy === 'seasonal_mean' ? monthly.mean : monthly.median;
      point = current.modal_price * Math.exp(drift);
    }
    const effectiveHorizon = h.horizon_days + ageDays;
    if (effectiveHorizon !== h.horizon_days && point > 0) {
      const growth = Math.log(point / current.modal_price);
      point = current.modal_price * Math.exp(growth * effectiveHorizon / h.horizon_days);
    }
    const uncertainty = Math.min(0.35,
      h.interval_80_pct * Math.sqrt(effectiveHorizon / h.horizon_days) + ageDays * 0.0025);
    return {
      horizon_days: h.horizon_days,
      target_date: isoDate(new Date(asOfMs + h.horizon_days * DAY_MS)),
      predicted_price: round(point),
      range_80_low: round(point * (1 - uncertainty)),
      range_80_high: round(point * (1 + uncertainty)),
      latest_price: current.modal_price,
      latest_price_date: current.date,
      data_age_days: ageDays,
      input_status: ageDays === 0 ? 'current' : 'stale_fallback',
      confidence: ageDays === 0 ? 'normal' : ageDays <= 3 ? 'reduced' : 'low',
      validation_mape: h.validation.model.mape,
      warning: ageDays === 0 ? null : `Prediction uses the latest verified price from ${current.date}.`,
    };
  });
}

function featureVector(rows: PriceRecord[], index: number, stats: Stats): number[] {
  const current = rows[index];
  const price = current.modal_price;
  const previous = rows[Math.max(0, index - 1)];
  const windows = [7, 30, 90].map((days) => withinDays(rows, index, days));
  const means = windows.map((window) => mean(window.map((row) => row.modal_price)) || price);
  const vols = windows.map((window) => std(window.map((row) => Math.log(row.modal_price))) || 0);
  const arrivals30 = mean(windows[1].map((row) => row.arrivals_tonnes)) || Math.max(current.arrivals_tonnes, 1);
  const date = new Date(current.dateMs);
  const day = Math.floor((current.dateMs - Date.UTC(date.getUTCFullYear(), 0, 0)) / DAY_MS);
  const month = date.getUTCMonth() + 1;
  const safeReturn = (old: number) => Math.log(price / Math.max(old, 1));
  return [
    safeReturn(previous.modal_price), safeReturn(priceAtOrBefore(rows, index, 7)),
    safeReturn(priceAtOrBefore(rows, index, 30)), safeReturn(priceAtOrBefore(rows, index, 90)),
    Math.log(price / means[0]), Math.log(price / means[1]), Math.log(price / means[2]),
    vols[0], vols[1], vols[2], Math.log1p(current.arrivals_tonnes),
    Math.log((current.arrivals_tonnes + 1) / (arrivals30 + 1)),
    Math.min(daysBetween(new Date(previous.dateMs), new Date(current.dateMs)), 30),
    Math.log1p(Math.max(current.actual_rain_mm, 0)),
    Math.sin(2 * Math.PI * day / 365.25), Math.cos(2 * Math.PI * day / 365.25),
    Math.sin(2 * Math.PI * month / 12), Math.cos(2 * Math.PI * month / 12),
    Math.log((stats.market[current.market] || stats.overall) / stats.overall),
    Math.log((stats.district[current.district] || stats.overall) / stats.overall),
    Math.log((stats.variety[current.variety] || stats.overall) / stats.overall),
    Math.log((stats.month[String(month)] || stats.overall) / stats.overall),
  ];
}

function predictReturn(model: RidgeModel, x: number[]): number {
  let value = model.coefficients[0];
  for (let i = 0; i < x.length; i += 1) {
    value += model.coefficients[i + 1] * ((x[i] - model.means[i]) / model.scales[i]);
  }
  return Math.max(-0.7, Math.min(0.7, value));
}

function withinDays(rows: PriceRecord[], index: number, days: number): PriceRecord[] {
  const cutoff = rows[index].dateMs - days * DAY_MS;
  const values: PriceRecord[] = [];
  for (let i = index; i >= 0 && rows[i].dateMs >= cutoff; i -= 1) values.push(rows[i]);
  return values;
}

function priceAtOrBefore(rows: PriceRecord[], index: number, daysAgo: number): number {
  const target = rows[index].dateMs - daysAgo * DAY_MS;
  for (let i = index; i >= 0; i -= 1) if (rows[i].dateMs <= target) return rows[i].modal_price;
  return rows[0].modal_price;
}

function groupSeries(records: PriceRecord[]): Map<string, PriceRecord[]> {
  const groups = new Map<string, PriceRecord[]>();
  records.forEach((record) => {
    const key = seriesKey(record);
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  });
  groups.forEach((rows) => rows.sort((a, b) => a.dateMs - b.dateMs));
  return groups;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

function seriesKey(value: Pick<PriceRecord, 'district' | 'market' | 'variety'>): string {
  return `${normalizeDistrict(value.district)}\u001f${normalizeText(value.market)}\u001f${normalizeText(value.variety)}`;
}
function normalizeDistrict(value: string): string { return normalizeText(value).replace(/^Ahmednagar$/i, 'Ahilyanagar').replace(/^Aurangabad$/i, 'Chhatrapati Sambhajinagar'); }
function normalizeText(value: string): string { return String(value || '').trim().replace(/\s+/g, ' '); }
function number(value: string, fallback = Number.NaN): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function parseDate(value: string): Date { return new Date(`${value}T00:00:00Z`); }
function isoDate(value: Date): string { return value.toISOString().slice(0, 10); }
function localIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }
function mean(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN; }
function std(values: number[]): number { const avg = mean(values); return values.length > 1 ? Math.sqrt(mean(values.map((value) => (value - avg) ** 2))) : 0; }
function round(value: number): number { return Math.round(value * 100) / 100; }

