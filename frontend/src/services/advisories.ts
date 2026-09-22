import { supabase } from '@/services/supabase';
import { localized } from '@/i18n';
import {
  confidenceBand, PRIORITY,
  type AdvisoryType, type DataInputs, type Priority, type ResolvedAdvisory,
} from '@/types/advisory';
import type { Tables } from '@/types/database';

type AdvisoryRow = Tables<'farmer_advisories'>;

/**
 * Turn a database row into what the UI renders, resolving language here so no
 * component ever has to know about the _marathi / _hindi column suffixes.
 */
export function resolve(
  row: AdvisoryRow,
  lang: string,
  plotNames: Map<string, { plotName: string; cropName: string }>,
): ResolvedAdvisory {
  const meta = row.plot_id ? plotNames.get(row.plot_id) : undefined;
  return {
    id: row.id,
    cropCycleId: row.crop_cycle_id,
    plotId: row.plot_id,
    plotName: meta?.plotName,
    cropName: meta?.cropName,
    type: (row.advisory_type ?? 'WEATHER') as AdvisoryType,
    priority: (row.priority ?? 'MEDIUM') as Priority,
    title: localized(row, 'title', lang) ?? '',
    message: localized(row, 'message', lang) ?? '',
    recommendedAction: localized(row, 'recommended_action', lang),
    reason: row.reason,
    dataInputs: (row.data_inputs as DataInputs | null) ?? null,
    confidence: row.confidence_score,
    band: confidenceBand(row.confidence_score),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    isRead: row.is_read ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function rank(a: ResolvedAdvisory, b: ResolvedAdvisory): number {
  const byPriority = PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority);
  if (byPriority !== 0) return byPriority;
  return (b.confidence ?? 0) - (a.confidence ?? 0);
}

/**
 * TODAY — advisories currently in their validity window.
 *
 * Passing plotId scopes to one plot; omitting it returns every plot's advisory
 * so the "All farm" view can show them side by side. It deliberately does NOT
 * merge or average across crops: §56 is explicit that two crops needing two
 * different actions must be shown as two different actions.
 */
export async function fetchToday(
  lang: string,
  plotNames: Map<string, { plotName: string; cropName: string }>,
  plotId?: string | null,
): Promise<ResolvedAdvisory[]> {
  const now = new Date().toISOString();
  let q = supabase
    .from('farmer_advisories')
    .select('*')
    .eq('status', 'ACTIVE')
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`);

  if (plotId) q = q.eq('plot_id', plotId);

  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;

  const all = (data ?? []).map((r) => resolve(r, lang, plotNames));

  // One headline per plot — the most urgent. The rest become "Next".
  const best = new Map<string, ResolvedAdvisory>();
  for (const a of all.sort(rank)) {
    const key = a.plotId ?? 'farm';
    if (!best.has(key)) best.set(key, a);
  }
  return [...best.values()].sort(rank);
}

/** NEXT — upcoming advisories for the same crop cycle, after the current one. */
export async function fetchNext(
  cropCycleId: string,
  lang: string,
  plotNames: Map<string, { plotName: string; cropName: string }>,
  limit = 3,
): Promise<ResolvedAdvisory[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('farmer_advisories')
    .select('*')
    .eq('crop_cycle_id', cropCycleId)
    .gt('valid_from', now)
    .order('valid_from', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => resolve(r, lang, plotNames));
}

/**
 * Record what the farmer actually did. This is the half of the loop that makes
 * the next advisory better — without it the engine is guessing at outcomes.
 *
 * action_type is CHECK-constrained in the database to exactly these four
 * values; anything else is rejected at insert.
 */
export async function recordAction(
  advisoryId: string,
  farmerId: string,
  actionType: 'VIEWED' | 'ACCEPTED' | 'COMPLETED' | 'DISMISSED',
  notes?: string,
): Promise<void> {
  const { error } = await supabase.from('advisory_actions').insert({
    advisory_id: advisoryId,
    farmer_id: farmerId,
    action_type: actionType,
    action_notes: notes ?? null,
    action_date: new Date().toISOString(),
  });
  if (error) throw error;

  if (actionType === 'COMPLETED' || actionType === 'DISMISSED') {
    await supabase.from('farmer_advisories')
      .update({ status: 'ACTED_ON', is_read: true, read_at: new Date().toISOString() })
      .eq('id', advisoryId);
  }
}

/** Mark as read without claiming the farmer acted on it. */
export async function markRead(advisoryId: string, farmerId: string): Promise<void> {
  await supabase.from('farmer_advisories')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', advisoryId);
  // Best-effort audit trail; a failure here must not break the screen.
  await supabase.from('advisory_actions').insert({
    advisory_id: advisoryId, farmer_id: farmerId,
    action_type: 'VIEWED', action_date: new Date().toISOString(),
  });
}
