import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { localized, useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

type Scheme = Tables<'government_schemes'>;
type Recommendation = Tables<'farmer_scheme_recommendations'>;
type Tab = 'Recommended' | 'All schemes' | 'My schemes';

export default function Schemes() {
  const { user, profile } = useAuth();
  const { lang } = useI18n();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tab, setTab] = useState<Tab>('Recommended');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const schemePromise = supabase.from('government_schemes').select('*').eq('is_active', true).order('scheme_name').limit(100);
      const recommendationPromise = user
        ? supabase.from('farmer_scheme_recommendations').select('*').eq('farmer_id', user.id)
        : Promise.resolve({ data: [] as Recommendation[] });
      const [schemeResult, recommendationResult] = await Promise.all([schemePromise, recommendationPromise]);
      if (!cancelled) {
        setSchemes(schemeResult.data ?? []);
        setRecommendations(recommendationResult.data ?? []);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const recommendationMap = useMemo(
    () => new Map(recommendations.map((item) => [item.scheme_id, item])),
    [recommendations],
  );
  const visible = useMemo(() => schemes.filter((scheme) => {
    const recommendation = recommendationMap.get(scheme.id);
    if (tab === 'Recommended' && recommendations.length && !recommendation) return false;
    if (tab === 'My schemes' && (!recommendation || recommendation.status === 'DISMISSED')) return false;
    const haystack = `${scheme.scheme_name} ${scheme.short_description ?? ''} ${scheme.department ?? ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase().trim());
  }).sort((a, b) => {
    const aScore = recommendationMap.get(a.id)?.match_score ?? locationScore(a, profile?.state, profile?.district);
    const bScore = recommendationMap.get(b.id)?.match_score ?? locationScore(b, profile?.state, profile?.district);
    return bScore - aScore;
  }), [schemes, recommendations.length, recommendationMap, tab, query, profile?.state, profile?.district]);

  return (
    <div className="page-shell schemes-page">
      <header className="page-header">
        <div><p className="eyebrow">Benefits matched to you</p><h1>Farmer schemes</h1><p>Verified scheme information, profile relevance and official application links in one place.</p></div>
      </header>

      <label className="scheme-search">
        <SearchIcon />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scheme or department" />
      </label>

      <div className="scheme-tabs" role="tablist">
        {(['Recommended', 'All schemes', 'My schemes'] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {!recommendations.length && tab === 'Recommended' && !loading && (
        <section className="matching-note">
          <InfoIcon />
          <p><strong>Basic profile matching</strong><span>Results are ranked using your state and district. Full eligibility will appear after verified eligibility rules and your landholding details are available.</span></p>
        </section>
      )}

      <div className="scheme-list">
        {loading && <><div className="scheme-loading"/><div className="scheme-loading"/></>}
        {!loading && visible.length === 0 && (
          <section className="empty-panel">
            <div className="line-icon"><DocumentIcon /></div>
            <h2>{schemes.length ? 'No schemes match this view' : 'No verified schemes loaded yet'}</h2>
            <p>{schemes.length ? 'Try another tab or search term.' : 'Schemes will appear only after they are loaded from a verified government source.'}</p>
          </section>
        )}
        {!loading && visible.map((scheme) => {
          const recommendation = recommendationMap.get(scheme.id);
          const relevance = recommendation?.match_score ?? locationScore(scheme, profile?.state, profile?.district);
          const reason = recommendation?.recommendation_reason || matchReason(scheme, profile?.state, profile?.district);
          const link = scheme.application_url || scheme.official_website || scheme.source_url;
          return (
            <article className="scheme-card" key={scheme.id}>
              <div className="scheme-card-head">
                <div className="scheme-mark"><DocumentIcon /></div>
                <div>
                  <p>{scheme.department || 'Government scheme'}</p>
                  <h2>{localized(scheme, 'scheme_name', lang)}</h2>
                </div>
                {relevance > 0 && <span>{Math.round(relevance)}% match</span>}
              </div>
              {scheme.short_description && <p className="scheme-description">{scheme.short_description}</p>}
              <div className="scheme-facts">
                <div><small>Benefit</small><strong>{scheme.benefit_amount ? `₹${scheme.benefit_amount.toLocaleString('en-IN')}` : scheme.benefit_type || 'See details'}</strong></div>
                <div><small>Application</small><strong>{scheme.application_mode || 'Check official source'}</strong></div>
                <div><small>Last verified</small><strong>{formatDate(scheme.last_synced_at || scheme.updated_at)}</strong></div>
              </div>
              <div className="match-reason"><CheckIcon /><span><strong>Why it may match</strong>{reason}</span></div>
              <footer>
                <span>Source: {scheme.source_name || 'Official website'}</span>
                {link && <a href={link} target="_blank" rel="noreferrer">View official details <ExternalIcon /></a>}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function locationScore(scheme: Scheme, state?: string | null, district?: string | null): number {
  let score = 40;
  if (state && (!scheme.eligible_states?.length || includes(scheme.eligible_states, state))) score += 25;
  if (district && (!scheme.eligible_districts?.length || includes(scheme.eligible_districts, district))) score += 25;
  return Math.min(score, 90);
}
function matchReason(scheme: Scheme, state?: string | null, district?: string | null): string {
  const reasons: string[] = [];
  if (state && (!scheme.eligible_states?.length || includes(scheme.eligible_states, state))) reasons.push(`available in ${state}`);
  if (district && (!scheme.eligible_districts?.length || includes(scheme.eligible_districts, district))) reasons.push(`covers ${district} district`);
  return reasons.length ? `Your profile ${reasons.join(' and ')}. Final eligibility depends on the official rules.` : 'Add complete farmer and land details to improve matching. Final eligibility depends on the official rules.';
}
function includes(values: string[], expected: string): boolean { return values.some((value) => value.toLowerCase() === expected.toLowerCase()); }
function formatDate(value: string | null): string { return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not provided'; }

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
function DocumentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>; }
function ExternalIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/></svg>; }
function InfoIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>; }
