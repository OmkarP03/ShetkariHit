import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  cottonCatalog, predictCotton, type CottonPrediction, type CottonSeries,
} from '@/services/cottonForecast';

const SELECTION_KEY = 'shetkarihit.cotton-series';

export default function PricePrediction() {
  const { profile } = useAuth();
  const [crop, setCrop] = useState<'cotton' | 'soybean'>('cotton');
  const [catalog, setCatalog] = useState<CottonSeries[]>([]);
  const [selection, setSelection] = useState<CottonSeries | null>(null);
  const [predictions, setPredictions] = useState<CottonPrediction[]>([]);
  const [activeHorizon, setActiveHorizon] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cottonCatalog().then(({ series }) => {
      setCatalog(series);
      const stored = readStoredSelection();
      const exact = stored && series.find((item) => seriesId(item) === seriesId(stored));
      const local = series.find((item) => item.district.toLowerCase() === profile?.district?.toLowerCase());
      setSelection(exact || local || series[0] || null);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Prediction data could not be loaded.');
      setLoading(false);
    });
  }, [profile?.district]);

  useEffect(() => {
    if (!selection || crop !== 'cotton') return;
    setLoading(true); setError(null);
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    predictCotton(selection).then(setPredictions).catch((reason: unknown) => {
      setPredictions([]);
      setError(reason instanceof Error ? reason.message : 'Prediction could not be calculated.');
    }).finally(() => setLoading(false));
  }, [selection, crop]);

  const districts = useMemo(() => [...new Set(catalog.map((item) => item.district))].sort(), [catalog]);
  const districtSeries = useMemo(
    () => catalog.filter((item) => item.district === selection?.district),
    [catalog, selection?.district],
  );
  const active = predictions.find((item) => item.horizon_days === activeHorizon) ?? predictions[0];

  function changeDistrict(district: string) {
    setSelection(catalog.find((item) => item.district === district) ?? null);
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Market intelligence</p>
          <h1>Cotton price forecast</h1>
          <p>Verified market history with an uncertainty range—not a guaranteed selling price.</p>
        </div>
      </header>

      <div className="crop-switch" role="tablist" aria-label="Select crop">
        <button className={crop === 'cotton' ? 'active' : ''} onClick={() => setCrop('cotton')}>
          <span>Cotton</span><small>Prediction available</small>
        </button>
        <button className={crop === 'soybean' ? 'active' : ''} onClick={() => setCrop('soybean')}>
          <span>Soybean</span><small>Coming soon</small>
        </button>
      </div>

      {crop === 'soybean' ? (
        <section className="empty-panel">
          <div className="line-icon"><BeanIcon /></div>
          <h2>Soybean prediction is coming soon</h2>
          <p>The crop is visible in the product plan, but no soybean estimate is shown until a separately trained and validated model is connected.</p>
          <button className="secondary-action" onClick={() => setCrop('cotton')}>View cotton forecast</button>
        </section>
      ) : (
        <>
          <section className="white-card selection-card">
            <div className="field-grid">
              <label>
                <span>District</span>
                <select value={selection?.district ?? ''} onChange={(event) => changeDistrict(event.target.value)}>
                  {districts.map((district) => <option key={district}>{district}</option>)}
                </select>
              </label>
              <label>
                <span>Market and variety</span>
                <select value={selection ? seriesId(selection) : ''} onChange={(event) => {
                  setSelection(catalog.find((item) => seriesId(item) === event.target.value) ?? null);
                }}>
                  {districtSeries.map((item) => (
                    <option key={seriesId(item)} value={seriesId(item)}>
                      {item.market} · {item.variety}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selection && (
              <p className="data-note">Latest available observation: {formatDate(selection.latestDate)} · {selection.observations.toLocaleString('en-IN')} historical observations</p>
            )}
          </section>

          {loading && <PredictionSkeleton />}
          {!loading && error && (
            <section className="notice-card error-notice">
              <strong>Forecast unavailable for this selection</strong>
              <p>{error}</p>
            </section>
          )}

          {!loading && active && (
            <>
              <section className="forecast-hero">
                <div className="forecast-heading">
                  <div>
                    <p className="forecast-label">{active.horizon_days}-day estimate</p>
                    <h2>{money(active.predicted_price)} <span>/ quintal</span></h2>
                  </div>
                  <Confidence confidence={active.confidence} />
                </div>
                <div className="range-track" aria-label={`Typical range ${money(active.range_80_low)} to ${money(active.range_80_high)}`}>
                  <span /><i />
                </div>
                <div className="range-values">
                  <span>{money(active.range_80_low)}</span>
                  <span>Typical 80% range</span>
                  <span>{money(active.range_80_high)}</span>
                </div>
                <div className="forecast-meta">
                  <div><small>Latest verified</small><strong>{money(active.latest_price)}</strong></div>
                  <div><small>Target date</small><strong>{formatDate(active.target_date)}</strong></div>
                  <div><small>Validation error</small><strong>{active.validation_mape.toFixed(1)}% MAPE</strong></div>
                </div>
              </section>

              <div className="horizon-grid">
                {predictions.map((prediction) => {
                  const change = ((prediction.predicted_price / prediction.latest_price) - 1) * 100;
                  return (
                    <button key={prediction.horizon_days}
                      className={activeHorizon === prediction.horizon_days ? 'horizon-card active' : 'horizon-card'}
                      onClick={() => setActiveHorizon(prediction.horizon_days)}>
                      <span>{prediction.horizon_days} day{prediction.horizon_days > 1 ? 's' : ''}</span>
                      <strong>{money(prediction.predicted_price)}</strong>
                      <small className={change >= 0 ? 'positive' : 'negative'}>{signed(change)} from latest</small>
                    </button>
                  );
                })}
              </div>

              <MarketSignal prediction={active} />

              <section className="white-card model-note">
                <h2>How to read this forecast</h2>
                <ul>
                  <li>The estimate is produced for the exact market and cotton variety selected above.</li>
                  <li>The range reflects historical model error; actual prices can move outside it.</li>
                  <li>Weather shocks, arrivals, policy changes and cotton quality can change the final price.</li>
                </ul>
                {active.warning && <p className="freshness-warning">{active.warning} Confidence is reduced because the input is not from today.</p>}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MarketSignal({ prediction }: { prediction: CottonPrediction }) {
  const change = ((prediction.predicted_price / prediction.latest_price) - 1) * 100;
  const signal = change > 1 ? {
    title: 'Watch before selling', text: `The model estimates a ${Math.abs(change).toFixed(1)}% increase over the latest verified price. Compare the range and your storage costs before waiting.`,
  } : change < -1 ? {
    title: 'Price pressure is possible', text: `The estimate is ${Math.abs(change).toFixed(1)}% below the latest verified price. If your cotton is ready, compare nearby buyers rather than relying on the forecast alone.`,
  } : {
    title: 'Price appears broadly stable', text: 'The predicted change is small. Quality deductions, transport and commission may matter more than the modelled movement.',
  };
  return (
    <section className="signal-card">
      <div className="line-icon"><TrendIcon /></div>
      <div><p>Market signal</p><h2>{signal.title}</h2><span>{signal.text}</span></div>
    </section>
  );
}

function Confidence({ confidence }: { confidence: CottonPrediction['confidence'] }) {
  const label = confidence === 'normal' ? 'Standard confidence' : confidence === 'reduced' ? 'Reduced confidence' : 'Low confidence';
  return <span className={`confidence confidence-${confidence}`}>{label}</span>;
}

function PredictionSkeleton() {
  return <div className="forecast-hero skeleton-block" aria-label="Loading forecast" />;
}

function readStoredSelection(): CottonSeries | null {
  try { return JSON.parse(localStorage.getItem(SELECTION_KEY) || 'null') as CottonSeries | null; } catch { return null; }
}
function seriesId(item: Pick<CottonSeries, 'district' | 'market' | 'variety'>): string { return `${item.district}|${item.market}|${item.variety}`; }
function money(value: number): string { return `₹${Math.round(value).toLocaleString('en-IN')}`; }
function signed(value: number): string { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }
function formatDate(value: string): string { return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

function BeanIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19c-4-3-3-9 1-12 3-2 7-1 9-4 3 5 2 11-2 14-2 2-5 3-8 2Z"/><path d="M7 19c2-4 5-7 10-10"/></svg>; }
function TrendIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 3 7-8"/><path d="M15 6h5v5"/></svg>; }

