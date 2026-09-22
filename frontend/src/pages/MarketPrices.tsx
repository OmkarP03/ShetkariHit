import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { Delta, EmptyState, Screen, Skeleton, Tabs, formatAgo } from '@/components/ui';
import type { Tables } from '@/types/database';

type Price = Tables<'market_prices'>;

const TABS = ['Crops', 'Trending', 'Favourites'];

export default function MarketPrices() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { farm, plots } = useFarm();
  const navigate = useNavigate();

  const [tab, setTab] = useState(TABS[0]);
  const [rows, setRows] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  const district = profile?.district ?? farm?.district ?? null;
  const myCrops = useMemo(
    () => plots.map((p) => p.crop?.crop_name).filter(Boolean) as string[],
    [plots],
  );

  useEffect(() => {
    let q = supabase.from('market_prices').select('*');
    if (district) q = q.eq('district', district);
    q.order('price_date', { ascending: false }).limit(60)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [district]);

  // One row per crop: the most recent price we hold.
  const latest = useMemo(() => {
    const byCrop = new Map<string, Price>();
    for (const r of rows) {
      const key = r.crop_name ?? '';
      if (!byCrop.has(key)) byCrop.set(key, r);
    }
    let list = [...byCrop.values()];
    if (tab === 'Favourites') list = list.filter((r) => myCrops.includes(r.crop_name ?? ''));
    return list;
  }, [rows, tab, myCrops]);

  /** 7-day change for a crop, computed from rows we actually have.
   *  Returns null when there is no earlier observation to compare against —
   *  an unknown delta shows as an em dash, never as zero. */
  function delta(crop: string | null): number | null {
    const series = rows.filter((r) => r.crop_name === crop && r.modal_price !== null);
    if (series.length < 2) return null;
    const newest = series[0].modal_price!;
    const prior = series[series.length - 1].modal_price!;
    return Math.round(newest - prior);
  }

  return (
    <Screen title={t('market.title')} back={() => navigate(-1)}>
      <p className="-mt-3 mb-4 flex items-center gap-1.5 text-body text-ink-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {district ? `${district} Mandi` : 'Location not set'}
      </p>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {loading && <Skeleton className="h-64" />}

        {!loading && latest.length === 0 && (
          <EmptyState
            title="No market prices yet."
            hint={
              tab === 'Favourites'
                ? 'No prices for your crops yet.'
                : 'Prices appear once a market data source is connected. Nothing here is estimated.'
            }
          />
        )}

        {!loading && latest.length > 0 && (
          <div className="card divide-y divide-hairline p-0">
            {latest.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <span className="text-2xl" aria-hidden="true">{cropEmoji(p.crop_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{p.crop_name}</span>
                  <span className="block text-body text-ink-muted">
                    ₹{p.modal_price?.toLocaleString('en-IN') ?? '—'}
                    <span className="text-ink-faint"> {t('market.perQuintal')}</span>
                  </span>
                </span>
                <span className="text-right">
                  <Delta value={delta(p.crop_name)} />
                  <span className="mt-0.5 block text-sm text-ink-faint">
                    {p.price_date
                      ? new Date(p.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {rows[0] && (
        <p className="mt-4 text-center text-sm text-ink-faint">
          {formatAgo(rows[0].fetched_at, t)}
        </p>
      )}

      {/* §29: the highest price is not the best market. Net return needs
          transport and commission, and there is no markets/transport_costs
          table yet — so this screen does not pretend to rank markets. */}
      <div className="card mt-6 border-dashed">
        <p className="text-body text-ink-muted">
          Market comparison and net return need transport and commission costs,
          which have no table in the database yet. Until then this screen shows
          observed prices only — it will not tell you which mandi pays best.
        </p>
      </div>

      <div className="h-6" />
    </Screen>
  );
}

function cropEmoji(name: string | null): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('onion')) return '🧅';
  if (n.includes('cotton')) return '🌿';
  if (n.includes('soy')) return '🫘';
  if (n.includes('wheat')) return '🌾';
  if (n.includes('tur') || n.includes('arhar')) return '🫛';
  if (n.includes('pomegranate')) return '🍎';
  if (n.includes('orange')) return '🍊';
  if (n.includes('grape')) return '🍇';
  if (n.includes('tomato')) return '🍅';
  return '🌱';
}
