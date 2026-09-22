import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { resolve, recordAction } from '@/services/advisories';
import type { ResolvedAdvisory } from '@/types/advisory';
import { Badge, EmptyState, ProgressBar, Screen, Skeleton } from '@/components/ui';
import { speak } from '@/services/voice';

/**
 * One advisory in full: the alert, the recommended action, the why, the
 * confidence, the sources, and the feedback control.
 *
 * Everything on this screen comes from the advisory row. Nothing is composed
 * here — if the engine did not write a reason, this screen says so rather
 * than generating one.
 */
export default function AIRecommendation() {
  const { t, lang } = useI18n();
  const { advisoryId } = useParams();
  const { user } = useAuth();
  const { plots } = useFarm();
  const navigate = useNavigate();

  const [advisory, setAdvisory] = useState<ResolvedAdvisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!advisoryId) { setLoading(false); return; }
    const names = new Map(plots.map(({ plot, crop }) => [
      plot.id,
      { plotName: plot.plot_name ?? '', cropName: crop?.crop_name ?? '' },
    ]));
    supabase.from('farmer_advisories').select('*').eq('id', advisoryId).maybeSingle()
      .then(({ data }) => {
        setAdvisory(data ? resolve(data, lang, names) : null);
        setLoading(false);
      });
  }, [advisoryId, lang, plots]);

  async function sendFeedback(helpful: boolean) {
    if (!user || !advisory) return;
    setFeedback(helpful ? 'up' : 'down');
    await supabase.from('advisory_feedback').insert({
      advisory_id: advisory.id,
      farmer_id: user.id,
      is_helpful: helpful,
    });
  }

  if (loading) {
    return <Screen title="AI Recommendation" back={() => navigate(-1)}><Skeleton className="h-64" /></Screen>;
  }

  if (!advisory) {
    return (
      <Screen title="AI Recommendation" back={() => navigate(-1)}>
        <EmptyState title="Advisory not found." hint="It may have expired or been superseded." />
      </Screen>
    );
  }

  const d = advisory.dataInputs;
  const sources = d?.sources_used ?? [];
  const degraded = d?.degraded_inputs ?? [];
  const urgent = advisory.priority === 'CRITICAL' || advisory.priority === 'HIGH';

  return (
    <Screen title="AI Recommendation" back={() => navigate(-1)}>
      {/* Alert banner — red for urgent, as in the reference's Pest Alert */}
      <div className={[
        'rounded-card p-4',
        urgent ? 'bg-danger/15 border border-danger/40' : 'bg-leaf-soft border border-leaf/30',
      ].join(' ')}>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-lead font-semibold ${urgent ? 'text-danger' : 'text-leaf'}`}>
            {advisory.title}
          </p>
          <Badge tone={urgent ? 'danger' : 'leaf'}>
            {advisory.priority === 'CRITICAL' ? 'Critical'
              : advisory.priority === 'HIGH' ? 'High Priority'
              : advisory.priority === 'MEDIUM' ? 'Medium' : 'Low'}
          </Badge>
        </div>
        {advisory.message && (
          <p className="mt-2 text-body text-ink">{advisory.message}</p>
        )}
      </div>

      {advisory.recommendedAction && (
        <section className="card mt-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">
            Recommended Action
          </h2>
          <p className="mt-2 text-lead">{advisory.recommendedAction}</p>
          <button
            onClick={() => speak(
              `${advisory.title}. ${advisory.recommendedAction ?? ''}`, lang)}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-pill bg-leaf-soft px-4 text-body font-medium text-leaf"
          >
            🔊 {t('common.listen')}
          </button>
        </section>
      )}

      <section className="card mt-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">Why?</h2>
        {advisory.reason ? (
          <p className="mt-2 text-body text-ink-muted">{advisory.reason}</p>
        ) : (
          <p className="mt-2 text-body text-ink-faint">
            No reason was recorded for this advisory.
          </p>
        )}

        {d && (
          <ul className="mt-3 space-y-1.5">
            {d.weather?.rain_probability_pct !== undefined && (
              <Reason>Rain probability {d.weather.rain_probability_pct}%</Reason>
            )}
            {d.soil?.moisture_pct !== undefined && (
              <Reason>
                Soil moisture {d.soil.estimated ? '≈' : ''}{d.soil.moisture_pct}%
                {d.soil.estimated ? ' (estimated)' : ''}
              </Reason>
            )}
            {d.crop?.stage && <Reason>Stage: {d.crop.stage}</Reason>}
            {d.pest?.risk && <Reason>Pest risk: {d.pest.risk}</Reason>}
          </ul>
        )}
      </section>

      {degraded.length > 0 && (
        <div className="mt-4 rounded-card border border-warn/40 bg-warn/10 p-4">
          <p className="text-body text-warn">{t('today.sensorOffline')}</p>
          <p className="mt-1 text-sm text-ink-muted">Missing: {degraded.join(', ')}</p>
        </div>
      )}

      <section className="card mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">Confidence</h2>
          <span className="text-body font-semibold text-leaf">
            {advisory.confidence !== null ? `${Math.round(advisory.confidence)}%` : '—'}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={advisory.confidence ?? 0} />
        </div>
      </section>

      {sources.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">Sources</h2>
          <p className="mt-2 text-body text-ink-muted">
            {sources.map((s) => s.name).join(' · ')}
          </p>
          {sources.some((s) => s.type === 'MANUAL') && (
            <p className="mt-2"><Badge tone="gold">{t('common.demoData')}</Badge></p>
          )}
        </section>
      )}

      {/* Feedback closes the loop: advisory_feedback is what tells the engine
          whether its reasoning landed. */}
      <div className="mt-6 flex items-center justify-between rounded-card border border-hairline p-4">
        <span className="text-body text-ink-muted">Was this helpful?</span>
        <span className="flex gap-2">
          <button
            onClick={() => void sendFeedback(true)}
            aria-pressed={feedback === 'up'}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-card border',
              feedback === 'up' ? 'border-leaf bg-leaf-soft text-leaf' : 'border-hairline text-ink-muted',
            ].join(' ')}
          >👍</button>
          <button
            onClick={() => void sendFeedback(false)}
            aria-pressed={feedback === 'down'}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-card border',
              feedback === 'down' ? 'border-danger bg-danger/15 text-danger' : 'border-hairline text-ink-muted',
            ].join(' ')}
          >👎</button>
        </span>
      </div>

      <button
        onClick={async () => {
          if (!user) return;
          await recordAction(advisory.id, user.id, 'COMPLETED');
          navigate('/today');
        }}
        className="btn-primary mt-4"
      >
        {t('today.markDone')}
      </button>

      <div className="h-6" />
    </Screen>
  );
}

function Reason({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-body text-ink-muted">
      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
      {children}
    </li>
  );
}
