import { useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n';

/* ---------------------------------------------------------------------------
 * Shared primitives, matched to the reference screens.
 *
 * One rule runs through all of them: a component never invents a value. When
 * data is missing it renders an em dash or an empty state, and anything shown
 * from sample data carries a visible "Demo data" chip. A farmer must always be
 * able to tell a reading from a placeholder.
 * ------------------------------------------------------------------------- */

export function Screen({ title, back, action, children }: {
  title?: string; back?: () => void; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      {(title || back) && (
        <header className="mb-5 flex items-center gap-3">
          {back && (
            <button onClick={back} aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-ink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {title && <h1 className="flex-1 text-[26px] font-bold leading-tight">{title}</h1>}
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <div className="mb-3 mt-6 flex items-baseline justify-between">
      <h2 className="text-lead font-semibold">{title}</h2>
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-body font-medium text-leaf">See All</button>
      )}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void;
}) {
  return (
    <div role="tablist" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            onClick={() => onChange(tab)}
            className={[
              'h-10 whitespace-nowrap rounded-pill px-4 text-body font-medium transition-colors',
              active === tab ? 'bg-leaf text-canvas' : 'bg-raised text-ink-muted',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'leaf' }: {
  children: ReactNode; tone?: 'leaf' | 'gold' | 'danger' | 'muted' | 'info';
}) {
  const tones = {
    leaf:   'bg-leaf-soft text-leaf',
    gold:   'bg-gold/15 text-gold',
    danger: 'bg-danger/15 text-danger',
    muted:  'bg-raised text-ink-muted',
    info:   'bg-sky/15 text-sky',
  } as const;
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}

/** Shown on anything rendered from sample rather than fetched data. */
export function DemoChip() {
  const { t } = useI18n();
  return <Badge tone="gold">{t('common.demoData')}</Badge>;
}

export function ProgressBar({ value, max = 100, tone = 'leaf' }: {
  value: number; max?: number; tone?: 'leaf' | 'gold' | 'danger';
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = { leaf: 'bg-leaf', gold: 'bg-gold', danger: 'bg-danger' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-pill bg-raised"
         role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-pill ${bar} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Label / value row, as used in Field Overview and Account. */
export function StatRow({ icon, label, value, muted }: {
  icon?: ReactNode; label: string; value: ReactNode; muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3 last:border-0">
      <span className="flex items-center gap-2.5 text-body text-ink-muted">
        {icon && <span className="text-leaf">{icon}</span>}
        {label}
      </span>
      <span className={muted ? 'text-body text-ink-muted' : 'text-body font-medium text-ink'}>
        {value}
      </span>
    </div>
  );
}

/**
 * Photo slot. Real images go in /public and are passed as `src`; without one
 * this renders a labelled gradient of the right size so layout is correct and
 * nobody mistakes it for a real photograph.
 */
export function Photo({ src, alt, className = '', label }: {
  src?: string; alt: string; className?: string; label?: string;
}) {
  const [failed, setFailed] = useState(false);

  // A missing file must fall back to the placeholder, not render as a broken
  // image with alt text showing. `src` pointing at a file nobody has added yet
  // is the normal case here, not an exception.
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${alt} (image not set)`}
      className={`flex items-center justify-center bg-gradient-to-br from-leaf-soft via-raised to-surface ${className}`}
    >
      {label && <span className="px-3 text-center text-sm text-ink-faint">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: {
  title: string; hint?: string; action?: ReactNode;
}) {
  return (
    <div className="card text-center">
      <p className="text-lead text-ink">{title}</p>
      {hint && <p className="mt-2 text-body text-ink-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-raised ${className}`} aria-hidden="true" />;
}

/** Trend arrow + delta, as on the Market Prices rows. */
export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-body text-ink-faint">—</span>;
  const up = value >= 0;
  return (
    <span className={`text-body font-medium ${up ? 'text-leaf' : 'text-danger'}`}>
      {up ? '↑' : '↓'} ₹{Math.abs(value).toLocaleString('en-IN')}
    </span>
  );
}

export function formatAgo(iso: string | null | undefined, t: (k: string, v?: Record<string, string | number>) => string): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;
  const rel = mins < 1 ? 'just now'
    : mins < 60 ? `${mins} min ago`
    : mins < 1440 ? `${Math.round(mins / 60)} h ago`
    : `${Math.round(mins / 1440)} d ago`;
  return t('common.updated', { time: rel });
}
