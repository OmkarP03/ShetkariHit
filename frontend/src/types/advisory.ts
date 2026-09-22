/**
 * The advisory vocabulary.
 *
 * `farmer_advisories` carries NO check constraints in the database — status,
 * priority and advisory_type accept any string. So this file is the only place
 * these values are defined, and the Edge Function engine mirrors it exactly.
 * If these two ever drift, advisories silently stop matching their filters.
 *
 * Values that ARE constrained in the database are marked; those must not be
 * changed here without a migration.
 */

/** Constrained in DB: advisory_actions.action_type */
export const ACTION_TYPE = ['VIEWED', 'ACCEPTED', 'COMPLETED', 'DISMISSED'] as const;
export type ActionType = (typeof ACTION_TYPE)[number];

/** Constrained in DB: advisory_generation_logs.generation_method */
export const GENERATION_METHOD = ['RULE_ENGINE', 'AI', 'HYBRID', 'MANUAL'] as const;
export type GenerationMethod = (typeof GENERATION_METHOD)[number];

/** Constrained in DB: crop_cycles.status */
export const CROP_STATUS = [
  'PLANNED', 'SOWN', 'GROWING', 'HARVEST_READY',
  'HARVESTED', 'STORED', 'SOLD', 'COMPLETED', 'CANCELLED',
] as const;
export type CropStatus = (typeof CROP_STATUS)[number];

/** App-owned — NOT enforced by the database. */
export const ADVISORY_TYPE = [
  'IRRIGATION', 'PEST', 'DISEASE', 'NUTRITION', 'WEATHER',
  'CROP_STAGE', 'MARKET', 'HARVEST', 'SCHEME',
] as const;
export type AdvisoryType = (typeof ADVISORY_TYPE)[number];

/** App-owned. Ordered: index 0 is most urgent. Drives Today-screen ranking. */
export const PRIORITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export type Priority = (typeof PRIORITY)[number];

/** App-owned. */
export const ADVISORY_STATUS = ['ACTIVE', 'SUPERSEDED', 'EXPIRED', 'ACTED_ON'] as const;
export type AdvisoryStatus = (typeof ADVISORY_STATUS)[number];

/** The irrigation engine's decision set. */
export const IRRIGATION_DECISION = [
  'IRRIGATE_NOW', 'IRRIGATE_TODAY', 'DO_NOT_IRRIGATE', 'MONITOR',
] as const;
export type IrrigationDecision = (typeof IRRIGATION_DECISION)[number];

/** Pest risk levels, per §20. */
export const PEST_RISK = ['LOW', 'MODERATE', 'RISING', 'HIGH'] as const;
export type PestRisk = (typeof PEST_RISK)[number];

/** Market decision, per §32. */
export const MARKET_DECISION = ['SELL_NOW', 'HOLD', 'PARTIAL_SELL'] as const;
export type MarketDecision = (typeof MARKET_DECISION)[number];

/**
 * Confidence.
 *
 * NOTE: the database stores confidence_score as NUMERIC constrained to 0..100,
 * not 0..1. A model returning a probability MUST be scaled before storage or
 * the insert is rejected by the check constraint.
 */
export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export function confidenceBand(score: number | null): ConfidenceBand {
  if (score === null) return 'LOW';
  if (score >= 75) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

/**
 * The jsonb blob stored in farmer_advisories.data_inputs.
 * This is what the "Why?" section renders, and what makes
 * "why did my advice change?" answerable — it is the full snapshot of
 * everything the decision was made from.
 */
export interface DataInputs {
  weather?: {
    rain_probability_pct?: number;
    rainfall_mm_24h?: number;
    temperature_c?: number;
    humidity_pct?: number;
    wind_speed_kmh?: number;
    observed_at?: string;
  };
  soil?: {
    moisture_pct?: number;
    groundwater_level_m?: number;
    observed_at?: string;
    /** true when this came from the fallback estimator, not a sensor */
    estimated?: boolean;
  };
  crop?: {
    crop_name?: string;
    stage?: string;
    days_since_sowing?: number;
    days_since_last_irrigation?: number;
  };
  pest?: { risk?: PestRisk; driver?: string };
  market?: { modal_price?: number; trend_pct_7d?: number; market_name?: string };

  /** Sources that were unavailable. Drives the "sensor offline" banner and
   *  lowers confidence. Never fabricate a reading to keep this empty. */
  degraded_inputs: string[];

  /** Which data_sources rows fed this decision, for provenance display. */
  sources_used: { name: string; type: string; fetched_at?: string }[];
}

/** One advisory as the UI consumes it, language already resolved. */
export interface ResolvedAdvisory {
  id: string;
  cropCycleId: string | null;
  plotId: string | null;
  plotName?: string;
  cropName?: string;
  type: AdvisoryType;
  priority: Priority;
  /** TODAY — the single headline action */
  title: string;
  message: string;
  recommendedAction: string | null;
  /** WHY — prose reason plus the evidence blob */
  reason: string | null;
  dataInputs: DataInputs | null;
  confidence: number | null;
  band: ConfidenceBand;
  validFrom: string | null;
  validUntil: string | null;
  isRead: boolean;
  createdAt: string;
}
