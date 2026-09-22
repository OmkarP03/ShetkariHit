import { useEffect, useState } from 'react';
import { useI18n, localized } from '@/i18n';
import { supabase } from '@/services/supabase';
import { Badge, EmptyState, Screen, Skeleton, Tabs } from '@/components/ui';
import type { Tables } from '@/types/database';

type Scheme = Tables<'government_schemes'>;

const TABS = ['Recommended', 'All Schemes', 'My Schemes'];

/**
 * §37: never invent a government scheme. Everything here is read from
 * `government_schemes`, which is currently empty — so the screen shows an
 * honest empty state rather than plausible-looking cards for schemes whose
 * eligibility and benefit amounts would be made up.
 */
export default function Schemes() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState(TABS[0]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('government_schemes').select('*').eq('is_active', true)
      .order('scheme_name').limit(60)
      .then(({ data }) => { setSchemes(data ?? []); setLoading(false); });
  }, []);

  return (
    <Screen
      title={t('nav.schemes')}
      action={
        <button aria-label="Search" className="flex h-10 w-10 items-center justify-center rounded-pill text-ink-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      }
    >
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4 space-y-4">
        {loading && <><Skeleton className="h-32" /><Skeleton className="h-32" /></>}

        {!loading && schemes.length === 0 && (
          <EmptyState
            title="No schemes loaded yet."
            hint="Scheme data must come from a verified government source before anything appears here. Nothing on this screen is invented."
          />
        )}

        {!loading && schemes.map((s) => (
          <article key={s.id} className="card">
            <div className="mb-2 flex items-start justify-between gap-2">
              {s.benefit_type && <Badge tone="leaf">{s.benefit_type}</Badge>}
              {s.category && <Badge tone="muted">{s.category}</Badge>}
            </div>

            <h2 className="text-lead font-semibold">{localized(s, 'scheme_name', lang)}</h2>

            {s.short_description && (
              <p className="mt-1.5 text-body text-ink-muted">{s.short_description}</p>
            )}

            {s.benefit_amount !== null && (
              <p className="mt-2 text-body">
                <span className="text-ink-faint">Benefit: </span>
                <span className="font-medium text-gold">
                  ₹{s.benefit_amount.toLocaleString('en-IN')}
                </span>
              </p>
            )}

            {/* §38: "why this matches you" needs scheme_eligibility_rules
                evaluated against the farmer's profile. Until the matcher
                exists, we do not claim eligibility. */}
            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
              <span className="text-body text-ink-faint">Eligibility not checked yet</span>
              {s.official_website && (
                <a href={s.official_website} target="_blank" rel="noreferrer"
                   className="text-body font-medium text-leaf">
                  View details →
                </a>
              )}
            </div>

            {s.source_name && (
              <p className="mt-2 text-sm text-ink-faint">Source: {s.source_name}</p>
            )}
          </article>
        ))}
      </div>

      <div className="h-6" />
    </Screen>
  );
}
