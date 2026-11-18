import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cottonCatalog, predictCotton, type CottonPrediction, type CottonSeries } from '@/services/cottonForecast';
import { supabase } from '@/services/supabase';

const SELECTION_KEY = 'shetkarihit.cotton-series';

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<CottonPrediction | null>(null);
  const [selection, setSelection] = useState<CottonSeries | null>(null);
  const [schemes, setSchemes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [{ series }, schemeResult] = await Promise.all([
          cottonCatalog(),
          supabase.from('government_schemes').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ]);
        if (cancelled) return;
        setSchemes(schemeResult.count ?? 0);
        const stored = readStoredSelection();
        const chosen = (stored && series.find((item) => id(item) === id(stored)))
          || series.find((item) => item.district.toLowerCase() === profile?.district?.toLowerCase())
          || series[0];
        if (chosen) {
          setSelection(chosen);
          const values = await predictCotton(chosen);
          if (!cancelled) setPrediction(values.find((item) => item.horizon_days === 7) ?? values[0]);
        }
      } catch {
        // The full forecast screen explains stale or unavailable series in detail.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [profile?.district]);

  const firstName = profile?.first_name?.trim() || 'Farmer';
  const change = prediction ? ((prediction.predicted_price / prediction.latest_price) - 1) * 100 : 0;

  return (
    <div className="page-shell dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">ShetkariHit</p>
          <h1>Namaskar, {firstName}</h1>
          <p>{profile?.district ? `${profile.district}, Maharashtra` : 'Your farm market companion'}</p>
        </div>
        <button className="profile-button" onClick={() => navigate('/account')} aria-label="Open profile">
          {profile?.profile_image_url
            ? <img src={profile.profile_image_url} alt="" />
            : <span>{firstName.charAt(0).toUpperCase()}</span>}
        </button>
      </header>

      <section className="welcome-strip">
        <div>
          <p>Today’s focus</p>
          <h2>Make a better cotton selling decision</h2>
          <span>Check the estimate, its price range and data freshness before you choose a market.</span>
        </div>
        <button onClick={() => navigate('/prices')}>Open forecast <ArrowIcon /></button>
      </section>

      <div className="dashboard-section-title">
        <div><p>Price intelligence</p><h2>Your crops</h2></div>
        <button onClick={() => navigate('/prices')}>View all</button>
      </div>

      <div className="crop-overview-grid">
        <button className="crop-overview cotton-card" onClick={() => navigate('/prices')}>
          <div className="outline-icon"><CottonIcon /></div>
          <div><strong>Cotton</strong><span>Forecast available</span></div>
          <ArrowIcon />
        </button>
        <button className="crop-overview soybean-card" onClick={() => navigate('/prices')}>
          <div className="outline-icon"><BeanIcon /></div>
          <div><strong>Soybean</strong><span>Coming soon</span></div>
          <ArrowIcon />
        </button>
      </div>

      {loading ? <div className="dashboard-forecast loading-card" /> : prediction ? (
        <section className="dashboard-forecast" onClick={() => navigate('/prices')}>
          <div className="dashboard-forecast-top">
            <div>
              <p>7-day cotton estimate</p>
              <h2>{money(prediction.predicted_price)} <span>/ quintal</span></h2>
            </div>
            <span className={change >= 0 ? 'forecast-change up' : 'forecast-change down'}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
          <div className="mini-range"><span /></div>
          <div className="dashboard-range"><span>{money(prediction.range_80_low)}</span><em>Typical range</em><span>{money(prediction.range_80_high)}</span></div>
          <div className="dashboard-forecast-footer">
            <span>{selection?.market} · {selection?.variety}</span>
            <strong>{prediction.data_age_days === 0 ? 'Current data' : `${prediction.data_age_days} days old`}</strong>
          </div>
        </section>
      ) : (
        <section className="dashboard-unavailable">
          <strong>Choose a market to start</strong>
          <p>Open Prices and select a market with recent verified observations.</p>
          <button onClick={() => navigate('/prices')}>Select market</button>
        </section>
      )}

      <div className="dashboard-section-title">
        <div><p>Benefits for you</p><h2>Government schemes</h2></div>
        <button onClick={() => navigate('/schemes')}>View schemes</button>
      </div>

      <button className="scheme-summary" onClick={() => navigate('/schemes')}>
        <div className="outline-icon"><DocumentIcon /></div>
        <div>
          <strong>{schemes ? `${schemes} verified schemes available` : 'Scheme matching is ready'}</strong>
          <span>Review eligibility, required documents and official application links.</span>
        </div>
        <ArrowIcon />
      </button>

      <section className="trust-note">
        <ShieldIcon />
        <p><strong>Clear about uncertainty</strong><span>Predictions are estimates. ShetkariHit always shows the data date, expected range and model error.</span></p>
      </section>
    </div>
  );
}

function readStoredSelection(): CottonSeries | null {
  try { return JSON.parse(localStorage.getItem(SELECTION_KEY) || 'null') as CottonSeries | null; } catch { return null; }
}
function id(item: Pick<CottonSeries, 'district' | 'market' | 'variety'>): string { return `${item.district}|${item.market}|${item.variety}`; }
function money(value: number): string { return `₹${Math.round(value).toLocaleString('en-IN')}`; }

function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>; }
function CottonIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-8M12 15l-4-3M12 16l4-3"/><path d="M12 12c-3 0-5-2-5-4a3 3 0 0 1 3-3c.5-2 3.5-2 4 0a3 3 0 0 1 3 3c0 2-2 4-5 4Z"/></svg>; }
function BeanIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19c-4-3-3-9 1-12 3-2 7-1 9-4 3 5 2 11-2 14-2 2-5 3-8 2Z"/><path d="M7 19c2-4 5-7 10-10"/></svg>; }
function DocumentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>; }
