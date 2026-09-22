import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useFarm, type PlotWithCrop } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { EmptyState, ProgressBar, Screen, StatRow } from '@/components/ui';
/**
 * Leaflet plus its CSS is ~150 KB. Most visits to this screen never open the
 * map, and this app is built for patchy rural connections — so it is fetched
 * on demand rather than shipped in the main bundle.
 */
const PlotMap = lazy(() => import('@/components/PlotMap'));
import {
  centroid, fromGeoJson, sqMToAcres, toGeoJson, type LatLng,
} from '@/services/geo';

function MapLoading() {
  return (
    <div className="flex h-72 w-full items-center justify-center rounded-card border border-hairline bg-raised">
      <span className="text-body text-ink-muted">Loading map…</span>
    </div>
  );
}

/**
 * "My Field" — the plot router.
 *
 * This outer component exists to answer one question: WHICH plot are we
 * looking at? Getting that wrong was the bug where every field showed the
 * same boundary — the screen was reached at bare `/field`, so `plotId` was
 * undefined and it always fell back to the first plot in the list.
 *
 * Two rules keep that fixed:
 *   1. The plot id always ends up in the URL. Arriving at `/field` redirects
 *      to `/field/<id>`, so the address bar, the back button and a shared
 *      link all agree on which field is on screen.
 *   2. The detail view is keyed by plot id. React reuses a component instance
 *      when only its props change, which would have carried one plot's traced
 *      corners over to the next. The key forces a fresh mount instead, so the
 *      map, the draft boundary and the edit mode all reset with the plot.
 */
export default function MyField() {
  const { plotId } = useParams();
  const { plots, selected, select, loading } = useFarm();
  const navigate = useNavigate();

  const found = plots.find((p) => p.plot.id === plotId) ?? null;
  // No id in the URL (or an id that no longer exists): fall back to whatever
  // plot is selected app-wide, then to the first one.
  const entry = found
    ?? plots.find((p) => p.plot.id === selected)
    ?? plots[0]
    ?? null;

  // Put the resolved id into the URL and into the app-wide selection, so the
  // rest of the app (Home, Ask, the crop context) follows this screen.
  useEffect(() => {
    if (!entry) return;
    if (plotId !== entry.plot.id) {
      navigate(`/field/${entry.plot.id}`, { replace: true });
    }
    if (selected !== entry.plot.id) select(entry.plot.id);
  }, [entry, plotId, selected, select, navigate]);

  if (!entry) {
    return (
      <Screen title="My Field" back={() => navigate(-1)}>
        {loading
          ? <p className="text-body text-ink-muted">Loading…</p>
          : (
            <EmptyState
              title="No plots yet."
              hint="Add a plot and you can trace its boundary on the satellite view."
              action={
                <button onClick={() => navigate('/setup/plot')} className="btn-primary">
                  Add a plot
                </button>
              }
            />
          )}
      </Screen>
    );
  }

  return (
    <FieldDetail
      key={entry.plot.id}
      entry={entry}
      plots={plots}
      onSwitch={(id) => navigate(`/field/${id}`)}
    />
  );
}

/**
 * One plot in detail, with its boundary traced on satellite imagery and the
 * area measured from the corners.
 *
 * Every piece of state here belongs to ONE plot. That is safe only because the
 * parent keys this component by plot id — see the note above.
 */
function FieldDetail({ entry, plots, onSwitch }: {
  entry: PlotWithCrop;
  plots: PlotWithCrop[];
  onSwitch: (plotId: string) => void;
}) {
  const { t } = useI18n();
  const { reload } = useFarm();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ points: LatLng[]; areaSqM: number }>({ points: [], areaSqM: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable identity: PlotMap reports on every drag, and a new function each
  // render would restart its effect mid-drag.
  const onMapChange = useCallback((points: LatLng[], areaSqM: number) => {
    setDraft({ points, areaSqM });
  }, []);

  const { plot, crop } = entry;
  const saved = fromGeoJson(plot.boundary_geojson);
  const mapped = saved.length >= 3;

  async function save() {
    if (draft.points.length < 3 || draft.areaSqM <= 0) {
      setError('Place at least three corners around your field.');
      return;
    }
    setSaving(true);
    setError(null);

    const acres = Number(sqMToAcres(draft.areaSqM).toFixed(4));
    const mid = centroid(draft.points);

    // area_acres is CHECK-constrained to > 0 in the database; a degenerate
    // polygon would be rejected there with a message no farmer could read.
    if (!(acres > 0)) {
      setSaving(false);
      setError('That shape has no area. Spread the corners out.');
      return;
    }

    const { error: err } = await supabase.from('farm_plots').update({
      boundary_geojson: toGeoJson(draft.points) as unknown as never,
      area_acres: acres,
      latitude: mid ? Number(mid.lat.toFixed(6)) : null,
      longitude: mid ? Number(mid.lng.toFixed(6)) : null,
    }).eq('id', plot.id);

    setSaving(false);
    if (err) { setError(err.message); return; }

    await reload();
    setEditing(false);
  }

  const plotLabel = plot.plot_name?.trim() || `Plot ${plot.plot_number ?? ''}`.trim();

  return (
    <Screen
      title="My Field"
      back={() => navigate(-1)}
      action={
        <button
          aria-label={editing ? 'Cancel' : 'Edit boundary'}
          onClick={() => { setEditing((v) => !v); setError(null); }}
          className="flex h-10 w-10 items-center justify-center rounded-pill text-ink-muted"
        >
          {editing ? '✕' : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"
                stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      }
    >
      {/* ---- Which plot ------------------------------------------------- */}
      {plots.length > 1 ? (
        <div className="-mx-4 mb-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {plots.map(({ plot: p, crop: c }) => {
              const active = p.id === plot.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { if (!active) onSwitch(p.id); }}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    'flex h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-body transition-colors',
                    active
                      ? 'border-leaf bg-leaf text-canvas font-semibold'
                      : 'border-hairline bg-surface text-ink-muted',
                  ].join(' ')}
                >
                  <span>{p.plot_name?.trim() || `Plot ${p.plot_number ?? ''}`.trim()}</span>
                  <span className={active ? 'text-canvas/70' : 'text-ink-faint'}>
                    {c?.crop_name ? `· ${c.crop_name}` : `· ${p.area_acres ?? '—'} ac`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-3">
        <h2 className="text-lead font-semibold text-ink">{plotLabel}</h2>
        <p className="text-body text-ink-muted">
          {plot.area_acres ?? '—'} {t('common.acres')}
          {mapped ? ' · boundary mapped' : ' · not mapped yet'}
        </p>
      </div>

      {editing ? (
        <>
          <Suspense fallback={<MapLoading />}>
          <PlotMap
            initial={saved}
            centre={plot.latitude && plot.longitude
              ? { lat: Number(plot.latitude), lng: Number(plot.longitude) }
              : null}
            hintAcres={plot.area_acres ? Number(plot.area_acres) : null}
            onChange={onMapChange}
          />
          </Suspense>

          {error && (
            <p role="alert" className="mt-3 rounded-card border border-danger/40 bg-danger/10 p-3 text-body text-danger">
              {error}
            </p>
          )}

          {draft.points.length >= 3 && draft.areaSqM > 0 && (
            <div className="mt-3 rounded-card border border-hairline bg-surface p-3">
              <p className="text-body text-ink-muted">
                Saving will change <span className="text-ink">{plotLabel}</span>&apos;s area from{' '}
                <span className="text-ink">{plot.area_acres ?? '—'}</span> to{' '}
                <span className="font-medium text-leaf">
                  {sqMToAcres(draft.areaSqM).toFixed(2)}
                </span>{' '}
                acres.
              </p>
            </div>
          )}

          <button onClick={save} disabled={saving || draft.points.length < 3}
            className="btn-primary mt-3">
            {saving ? t('common.loading') : 'Save boundary'}
          </button>
        </>
      ) : mapped ? (
        <Suspense fallback={<MapLoading />}>
          {/* Keyed by the saved shape so the view refreshes after a save,
              rather than showing the boundary this plot had a moment ago. */}
          <PlotMap key={`ro-${saved.length}-${plot.area_acres}`}
            initial={saved} centre={null} hintAcres={null} readOnly onChange={() => {}} />
        </Suspense>
      ) : (
        <div className="overflow-hidden rounded-card border border-dashed border-hairline bg-surface p-6 text-center">
          <p className="text-[38px] font-bold leading-none text-ink">
            {plot.area_acres ?? '—'}
          </p>
          <p className="mt-1 text-body text-ink-muted">{t('common.acres')} (as entered)</p>
          <p className="mt-4 text-body text-ink-muted">
            This field has not been mapped yet. Trace it on the satellite view
            and the area is measured from the corners.
          </p>
          <button onClick={() => setEditing(true)} className="btn-primary mt-4">
            Measure my field
          </button>
        </div>
      )}

      <h2 className="mb-1 mt-6 text-lead font-semibold">Field Overview</h2>
      <div className="card">
        <StatRow label="Plot" value={plotLabel} />
        <StatRow label="Crop" value={crop?.crop_name ?? '—'} />
        <StatRow label="Variety" value={crop?.variety ?? '—'} />
        <StatRow
          label="Sowing Date"
          value={crop?.actual_sowing_date
            ? new Date(crop.actual_sowing_date).toLocaleDateString('en-IN',
                { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        />
        <StatRow label="Irrigation" value={plot.irrigation_type ?? '—'} />
        <StatRow label="Soil Type" value={plot.soil_type ?? '—'} />
        <StatRow label="Water Source" value={plot.water_source ?? '—'} />
        <StatRow label="Stage" value={crop?.current_stage ?? '—'} />
        <StatRow
          label="Boundary"
          value={mapped ? `Mapped · ${saved.length} corners` : 'Not mapped'}
          muted={!mapped}
        />
      </div>

      <h2 className="mb-1 mt-6 text-lead font-semibold">Field Health</h2>
      <div className="card">
        <p className="text-body text-ink-muted">
          No health score yet. This needs crop health observations or a
          satellite vegetation index, and neither is connected — so there is no
          number to show here rather than an invented one.
        </p>
        <div className="mt-3 opacity-40"><ProgressBar value={0} /></div>
      </div>

      <div className="h-6" />
    </Screen>
  );
}
