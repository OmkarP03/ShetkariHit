import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { predictCotton } from './cottonForecast';

describe('cotton forecast browser integration', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', async (url: string) => {
      const file = url.endsWith('.json') ? 'cotton_daily_forecast_model.json' : 'daily_market_prices.csv';
      const body = readFileSync(resolve('public/models/cotton', file), 'utf8');
      return new Response(body, { status: 200 });
    });
  });

  it('matches the verified model output for a known market series', async () => {
    const predictions = await predictCotton({
      district: 'Buldhana',
      market: 'Acf Agro Marketing, Malkapur, Dist Buldhana',
      variety: 'Other',
    }, '2026-10-21');

    expect(predictions).toHaveLength(3);
    expect(predictions.map((item) => item.horizon_days)).toEqual([1, 7, 30]);
    expect(predictions[0].predicted_price).toBe(7868.77);
    expect(predictions[1].predicted_price).toBe(7692);
    expect(predictions[2].predicted_price).toBe(7832.84);
    expect(predictions[0].input_status).toBe('stale_fallback');
    expect(predictions[0].data_age_days).toBe(19);
  });
});

