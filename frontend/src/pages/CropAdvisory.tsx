import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { EmptyState, ProgressBar, Screen, Tabs } from '@/components/ui';
import type { Tables } from '@/types/database';

type Stage = Tables<'crop_stage_history'>;
type Activity = Tables<'crop_activities'>;

const TABS = ['Overview', 'Tasks', 'Season Guide'];

export default function CropAdvisory() {
  const { t } = useI18n();
  const { plots, selected, select, selectedPlot } = useFarm();
  const navigate = useNavigate();

  const [tab, setTab] = useState(TABS[0]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const entry = selectedPlot ?? plots[0];
  const crop = entry?.crop ?? null;

  useEffect(() => {
    if (!crop) { setStages([]); setActivities([]); return; }
    void supabase.from('crop_stage_history').select('*')
      .eq('crop_cycle_id', crop.id)
      .order('stage_number', { ascending: true })
      .then(({ data }) => setStages(data ?? []));
    void supabase.from('crop_activities').select('*')
      .eq('crop_cycle_id', crop.id)
      .gte('activity_date', new Date().toISOString().slice(0, 10))
      .order('activity_date', { ascending: true }).limit(10)
      .then(({ data }) => setActivities(data ?? []));
  }, [crop?.id]);

  if (!crop) {
    return (
      <Screen title="Crop Advisory" back={() => navigate(-1)}>
        <EmptyState title="No crop on this plot yet." hint="Add a crop to see its advisory." />
      </Screen>
    );
  }

  // Day X of Y, from real dates only. If either date is missing there is no
  // progress bar — a guessed position in the season is worse than none.
  const sown = crop.actual_sowing_date ?? crop.planned_sowing_date;
  const harvest = crop.expected_harvest_date;
  const dayOf = sown ? Math.max(0, Math.round((Date.now() - new Date(sown).getTime()) / 86400000)) : null;
  const totalDays = sown && harvest
    ? Math.max(1, Math.round((new Date(harvest).getTime() - new Date(sown).getTime()) / 86400000))
    : null;

  const current = stages.find((s) => s.is_current) ?? stages[stages.length - 1] ?? null;

  return (
    <Screen title="Crop Advisory" back={() => navigate(-1)}>
      {/* Crop switcher — the reference shows Onion / Bhima Super here */}
      <div className="-mt-3 mb-4">
        <select
          className="field appearance-none"
          value={selected ?? entry.plot.id}
          onChange={(e) => select(e.target.value)}
        >
          {plots.map(({ plot, crop: c }) => (
            <option key={plot.id} value={plot.id} className="bg-raised">
              {c?.crop_name ?? plot.plot_name} {c?.variety ? `· ${c.variety}` : ''}
            </option>
          ))}
        </select>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="mt-4 space-y-4">
          <div className="card">
            <p className="text-sm text-ink-faint">Current Stage</p>
            <p className="mt-1 text-[22px] font-bold">
              {current?.stage_name ?? crop.current_stage ?? '—'}
            </p>
            {dayOf !== null && totalDays !== null ? (
              <>
                <p className="mb-2 mt-3 text-body text-ink-muted">Day {dayOf} / {totalDays}</p>
                <ProgressBar value={dayOf} max={totalDays} />
              </>
            ) : (
              <p className="mt-3 text-body text-ink-muted">
                Sowing and expected harvest dates are needed to show season progress.
              </p>
            )}
          </div>

          <div className="card">
            <p className="text-sm text-ink-faint">Area</p>
            <p className="text-body font-medium">{crop.area_acres ?? '—'} {t('common.acres')}</p>
            <p className="mt-3 text-sm text-ink-faint">Status</p>
            <p className="text-body font-medium">{crop.status ?? '—'}</p>
          </div>
        </div>
      )}

      {tab === 'Tasks' && (
        <div className="mt-4">
          <h2 className="mb-3 text-lead font-semibold">Next 7 Days Tasks</h2>
          {activities.length === 0 ? (
            <EmptyState
              title="No scheduled tasks."
              hint="Tasks are written by the advisory engine, which is not built yet."
            />
          ) : (
            <div className="card divide-y divide-hairline p-0">
              {activities.map((a) => (
                <label key={a.id} className="flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium">{a.activity_type}</span>
                    <span className="block text-body text-ink-muted">
                      {a.product_name ?? a.description ?? '—'}
                    </span>
                  </span>
                  <span className="text-sm text-ink-faint">
                    {a.activity_date
                      ? new Date(a.activity_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                  <input type="checkbox" className="h-6 w-6 accent-[#7CBF4F]" readOnly checked={false} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Season Guide' && (
        <div className="mt-4">
          {stages.length === 0 ? (
            <EmptyState
              title="No stage history yet."
              hint="Stages are recorded as the crop progresses."
            />
          ) : (
            <ol className="card space-y-4">
              {stages.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className={[
                    'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                    s.is_current ? 'bg-leaf' : 'bg-hairline',
                  ].join(' ')} />
                  <span>
                    <span className="block text-body font-medium">{s.stage_name}</span>
                    <span className="block text-sm text-ink-faint">
                      {s.started_at ?? '—'}{s.ended_at ? ` → ${s.ended_at}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="h-6" />
    </Screen>
  );
}
