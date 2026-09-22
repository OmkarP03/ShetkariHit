import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { fetchToday } from '@/services/advisories';
import type { ResolvedAdvisory } from '@/types/advisory';
import { confidenceBand } from '@/types/advisory';
import {
  Badge, DemoChip, Delta, EmptyState, Photo, SectionHeader, Skeleton, formatAgo,
} from '@/components/ui';
import PlotSelector from '@/components/PlotSelector';
import type { Tables } from '@/types/database';

type Weather = Tables<'weather_data'>;
type Price = Tables<'market_prices'>;

export default function Home() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { farm, plots, selected } = useFarm();
  const navigate = useNavigate();

  const [advisories, setAdvisories] = useState<ResolvedAdvisory[]>([]);
  const [current, setCurrent] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Weather[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  const plotNames = useMemo(() => {
    const m = new Map<string, { plotName: string; cropName: string }>();
    for (const { plot, crop } of plots) {
      m.set(plot.id, {
        plotName: plot.plot_name ?? `Plot ${plot.plot_number ?? ''}`.trim(),
        cropName: crop?.crop_name ?? '—',
      });
    }
    return m;
  }, [plots]);

  const load = useCallback(async () => {
    setLoading(true);
    const district = profile?.district ?? farm?.district ?? null;

    const [adv, cur, fc, pr] = await Promise.all([
      fetchToday(lang, plotNames, selected).catch(() => []),
      supabase.from('weather_data').select('*')
        .eq('is_forecast', false)
        .order('observation_time', { ascending: false }).limit(1)
        .then(({ data }) => data?.[0] ?? null),
      supabase.from('weather_data').select('*')
        .eq('is_forecast', true)
        .gte('observation_date', new Date().toISOString().slice(0, 10))
        .order('observation_date', { ascending: true }).limit(3)
        .then(({ data }) => data ?? []),
      (district
        ? supabase.from('market_prices').select('*').eq('district', district)
        : supabase.from('market_prices').select('*')
      ).order('price_date', { ascending: false }).limit(5)
        .then(({ data }) => data ?? []),
    ]);

    setAdvisories(adv);
    setCurrent(cur);
    setForecast(fc);
    setPrices(pr);
    setLoading(false);
  }, [lang, plotNames, selected, profile?.district, farm?.district]);

  useEffect(() => { void load(); }, [load]);

  const firstName = profile?.first_name ?? 'Farmer';
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : 'Good evening!';

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      {/* Greeting row */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[22px] font-bold leading-tight">
            {t('today.greeting', { name: firstName })}
          </p>
          <p className="mt-0.5 text-body text-ink-muted">{partOfDay}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-pill bg-surface text-ink-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-2 8-2 8h16s-2-1-2-8M13.7 21a2 2 0 0 1-3.4 0"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => navigate('/account')} aria-label={t('nav.account')}>
            <Photo
              src={profile?.profile_image_url ?? undefined}
              alt="Profile photo"
              label=""
              className="h-11 w-11 rounded-pill"
            />
          </button>
        </div>
      </header>

      <WeatherCard weather={current} district={profile?.district ?? farm?.district ?? null} />

      <PlotSelectorRow />

      {/* Today's Decisions */}
      <SectionHeader title="Today's Decisions"
        onSeeAll={advisories.length ? () => navigate('/advisory') : undefined} />

      {loading && <Skeleton className="h-28" />}

      {!loading && advisories.length === 0 && (
        <EmptyState
          title={t('today.noAdvisory')}
          hint={t('today.noAdvisoryHint')}
        />
      )}

      {!loading && advisories.map((a) => (
        <button
          key={a.id}
          onClick={() => navigate(`/advisory/${a.id}`)}
          className="card mb-3 flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-leaf-soft text-leaf">
            <DropIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-body font-semibold">{a.type.replace('_', ' ')}</span>
              <ConfidenceTag score={a.confidence} />
            </span>
            <span className="mt-0.5 block truncate text-body text-ink-muted">{a.title}</span>
          </span>
          <ChevronRight />
        </button>
      ))}

      {/* 3 Day Forecast */}
      <SectionHeader title={t('weather.forecast')} />
      {forecast.length === 0 ? (
        <EmptyState title="No forecast data yet."
          hint="Forecast rows arrive once weather ingestion runs." />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {forecast.map((d, i) => (
            <div key={d.id} className="card items-center p-3 text-center">
              <p className="text-sm text-ink-muted">
                {i === 0 ? 'Today' : new Date(d.observation_date ?? '').toLocaleDateString('en-IN', { weekday: 'short' })}
              </p>
              <p className="my-2 text-2xl" aria-hidden="true">{conditionEmoji(d.weather_condition)}</p>
              <p className="text-body font-semibold">
                {d.temperature_celsius !== null ? `${Math.round(d.temperature_celsius)}°` : '—'}
              </p>
              <p className="mt-1 text-sm text-sky">
                {d.rainfall_mm !== null ? `${d.rainfall_mm} mm` : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Market Prices */}
      <SectionHeader title={t('market.title')} onSeeAll={() => navigate('/market')} />
      {prices.length === 0 ? (
        <EmptyState title="No market prices yet."
          hint="Prices appear once a market data source is connected." />
      ) : (
        <div className="card divide-y divide-hairline p-0">
          {prices.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl" aria-hidden="true">{cropEmoji(p.crop_name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">{p.crop_name}</span>
                <span className="block text-body text-ink-muted">
                  ₹{p.modal_price?.toLocaleString('en-IN') ?? '—'}
                  <span className="text-ink-faint"> {t('market.perQuintal')}</span>
                </span>
              </span>
              <Delta value={null} />
            </div>
          ))}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}

function PlotSelectorRow() {
  return <div className="mt-5"><PlotSelector /></div>;
}

function WeatherCard({ weather, district }: { weather: Weather | null; district: string | null }) {
  const { t } = useI18n();
  const ago = formatAgo(weather?.fetched_at ?? weather?.observation_time, t);

  if (!weather) {
    return (
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-body text-ink-muted">{district ?? '—'}</p>
            <p className="mt-2 text-[40px] font-bold leading-none text-ink-faint">—</p>
            <p className="mt-2 text-body text-ink-muted">No weather data yet</p>
          </div>
          <span className="text-4xl opacity-40" aria-hidden="true">🌤</span>
        </div>
        <p className="mt-4 border-t border-hairline pt-3 text-sm text-ink-faint">
          Weather appears once the ingestion job runs. Nothing is estimated here.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body text-ink-muted">
            {[weather.village, weather.district, weather.state].filter(Boolean).join(', ') || district}
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-[40px] font-bold leading-none">
              {weather.temperature_celsius !== null ? Math.round(weather.temperature_celsius) : '—'}
            </span>
            <span className="text-lead text-ink-muted">°C</span>
          </p>
          <p className="mt-1 text-body text-ink-muted">{weather.weather_condition ?? '—'}</p>
        </div>
        <div className="text-right">
          <span className="text-4xl" aria-hidden="true">{conditionEmoji(weather.weather_condition)}</span>
          {ago && <p className="mt-2 text-sm text-ink-faint">{ago}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
        <Metric label={t('weather.humidity')} value={weather.humidity_percent !== null ? `${weather.humidity_percent}%` : '—'} />
        <Metric label={t('weather.rainfall')} value={weather.rainfall_mm !== null ? `${weather.rainfall_mm} mm` : '—'} />
        <Metric label={t('weather.wind')} value={weather.wind_speed_kmh !== null ? `${weather.wind_speed_kmh} km/h` : '—'} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-ink-faint">{label}</p>
      <p className="mt-0.5 text-body font-semibold">{value}</p>
    </div>
  );
}

function ConfidenceTag({ score }: { score: number | null }) {
  const { t } = useI18n();
  const band = confidenceBand(score);
  if (band === 'HIGH') return <Badge tone="leaf">{t('today.confidenceHigh')}</Badge>;
  if (band === 'MEDIUM') return <Badge tone="gold">{t('today.confidenceMedium')}</Badge>;
  return <Badge tone="muted">{t('today.confidenceLow')}</Badge>;
}

/** Emoji stand in for the reference's photographic crop icons. Swap for real
 *  artwork by dropping files in /public and mapping them here. */
function cropEmoji(name: string | null): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('onion') || n.includes('कांदा')) return '🧅';
  if (n.includes('cotton') || n.includes('कापूस')) return '🌿';
  if (n.includes('soy')) return '🫘';
  if (n.includes('wheat') || n.includes('गहू')) return '🌾';
  if (n.includes('tur') || n.includes('arhar') || n.includes('तूर')) return '🫛';
  if (n.includes('pomegranate') || n.includes('डाळिंब')) return '🍎';
  if (n.includes('orange') || n.includes('संत्र')) return '🍊';
  if (n.includes('grape')) return '🍇';
  if (n.includes('sugar')) return '🎋';
  if (n.includes('tomato')) return '🍅';
  return '🌱';
}

function conditionEmoji(condition: string | null): string {
  const c = (condition ?? '').toLowerCase();
  if (c.includes('thunder')) return '⛈';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧';
  if (c.includes('cloud')) return '⛅';
  if (c.includes('clear') || c.includes('sun')) return '☀️';
  if (c.includes('haze') || c.includes('mist') || c.includes('fog')) return '🌫';
  return '🌤';
}

function DropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-ink-faint">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
