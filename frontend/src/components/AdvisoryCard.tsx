import { useState } from 'react';
import { useI18n } from '@/i18n';
import type { ResolvedAdvisory } from '@/types/advisory';
import { speak } from '@/services/voice';

interface Props {
  advisory: ResolvedAdvisory;
  next: ResolvedAdvisory[];
  showPlotName: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * The heart of the Today screen: ONE action, then WHY, then NEXT.
 *
 * The farmer should be able to act on this card without reading past the
 * headline — everything below it is there for the farmer who wants to check
 * the reasoning, not the farmer who is already walking to the field.
 */
export default function AdvisoryCard({
  advisory, next, showPlotName, onComplete, onDismiss,
}: Props) {
  const { t, lang } = useI18n();
  const [showWhy, setShowWhy] = useState(false);

  const degraded = advisory.dataInputs?.degraded_inputs ?? [];
  const reasons = buildReasons(advisory, t);

  return (
    <article className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`pill ${priorityStyle(advisory.priority)}`}>
            {advisory.type.replace('_', ' ')}
          </span>
          {showPlotName && advisory.plotName && (
            <span className="text-sm text-ink-muted">
              {advisory.plotName} · {advisory.cropName}
            </span>
          )}
        </div>
        <ConfidencePill band={advisory.band} score={advisory.confidence} />
      </div>

      <p className="text-sm font-medium uppercase tracking-wide text-ink-faint">
        {t('today.todayAction')}
      </p>

      {/* The one thing to do. Deliberately the largest text on the screen. */}
      <h2 className="mt-1 text-display leading-tight">{advisory.title}</h2>

      {advisory.message && (
        <p className="mt-2 text-lead text-ink-muted">{advisory.message}</p>
      )}

      {/* Speaking the advice is not a nicety here — it is how a farmer who
          does not read comfortably uses this product at all. */}
      <button
        onClick={() => speak(`${advisory.title}. ${advisory.message}`, lang)}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-pill bg-leaf-soft px-4 text-body font-medium text-leaf"
      >
        <SpeakerIcon /> {t('common.listen')}
      </button>

      {/* §42: never hide a degraded input. An estimate that looks like a
          reading is worse than no reading. */}
      {degraded.length > 0 && (
        <div className="mt-4 rounded-card border border-warn/40 bg-warn/10 p-3">
          <p className="text-body text-warn">{t('today.sensorOffline')}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {degraded.join(', ')}
          </p>
        </div>
      )}

      {/* WHY */}
      {(reasons.length > 0 || advisory.reason) && (
        <div className="mt-4 border-t border-hairline pt-4">
          <button
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="flex h-11 w-full items-center justify-between text-lead font-semibold text-leaf"
          >
            {showWhy ? t('today.whyHide') : t('today.why')}
            <Chevron open={showWhy} />
          </button>

          {showWhy && (
            <div className="mt-2 space-y-2">
              {advisory.reason && <p className="text-body text-ink-muted">{advisory.reason}</p>}
              <ul className="space-y-1.5">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-body text-ink-muted">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
                    {r}
                  </li>
                ))}
              </ul>
              <Provenance advisory={advisory} />
            </div>
          )}
        </div>
      )}

      {/* NEXT */}
      {next.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-4">
          <p className="text-sm font-medium uppercase tracking-wide text-ink-faint">
            {t('today.next')}
          </p>
          <ol className="mt-2 space-y-2">
            {next.map((n, i) => (
              <li key={n.id} className="flex gap-3 text-body">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-raised text-sm text-ink-muted">
                  {i + 1}
                </span>
                <span className="text-ink-muted">{n.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button onClick={onComplete} className="btn-primary flex-1">
          {t('today.markDone')}
        </button>
        <button
          onClick={onDismiss}
          aria-label={t('common.cancel')}
          className="flex h-tap w-tap shrink-0 items-center justify-center rounded-card border border-hairline text-ink-muted"
        >
          ✕
        </button>
      </div>
    </article>
  );
}

/**
 * Turn the data_inputs snapshot into sentences a farmer can check against what
 * they can see out the window. This is what makes the advice auditable rather
 * than oracular.
 */
function buildReasons(a: ResolvedAdvisory, t: (k: string, v?: Record<string, string | number>) => string): string[] {
  const d = a.dataInputs;
  if (!d) return [];
  const out: string[] = [];

  if (d.weather?.rain_probability_pct !== undefined) {
    out.push(`${t('weather.rainfall')}: ${d.weather.rain_probability_pct}%`);
  }
  if (d.soil?.moisture_pct !== undefined) {
    out.push(
      `${d.soil.estimated ? '~' : ''}${d.soil.moisture_pct}% soil moisture`
      + (d.soil.estimated ? ' (estimated)' : ''),
    );
  }
  if (d.crop?.stage) out.push(`Stage: ${d.crop.stage}`);
  if (d.crop?.days_since_last_irrigation !== undefined) {
    out.push(`${d.crop.days_since_last_irrigation} days since last irrigation`);
  }
  if (d.pest?.risk) out.push(`Pest risk: ${d.pest.risk}`);
  if (d.market?.modal_price !== undefined) {
    out.push(`₹${d.market.modal_price}${t('market.perQuintal')} at ${d.market.market_name ?? '—'}`);
  }
  return out;
}

function Provenance({ advisory }: { advisory: ResolvedAdvisory }) {
  const { t } = useI18n();
  const sources = advisory.dataInputs?.sources_used ?? [];
  if (!sources.length) return null;
  const isDemo = sources.some((s) => s.type === 'MANUAL');
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {isDemo && (
        <span className="pill bg-gold/15 text-gold">{t('common.demoData')}</span>
      )}
      <span className="text-sm text-ink-faint">
        {sources.map((s) => s.name).join(' · ')}
      </span>
    </div>
  );
}

function ConfidencePill({ band, score }: { band: 'HIGH' | 'MEDIUM' | 'LOW'; score: number | null }) {
  const { t } = useI18n();
  const style =
    band === 'HIGH' ? 'bg-leaf-soft text-leaf'
    : band === 'MEDIUM' ? 'bg-warn/15 text-warn'
    : 'bg-raised text-ink-muted';
  const label =
    band === 'HIGH' ? t('today.confidenceHigh')
    : band === 'MEDIUM' ? t('today.confidenceMedium')
    : t('today.confidenceLow');
  return (
    <span className={`pill ${style}`} title={score !== null ? `${score}/100` : undefined}>
      {label}
    </span>
  );
}

function priorityStyle(p: string) {
  switch (p) {
    case 'CRITICAL': return 'bg-danger/15 text-danger';
    case 'HIGH':     return 'bg-warn/15 text-warn';
    case 'LOW':      return 'bg-raised text-ink-faint';
    default:         return 'bg-leaf-soft text-leaf';
  }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
