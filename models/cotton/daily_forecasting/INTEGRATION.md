# Integration contract

ShetkariHit should keep farmer submissions separate from verified training observations. A submission becomes eligible for training only after date, market, variety and price checks pass and the source is approved.

## Daily workflow

1. Accept a farmer or market report into the application database as `pending`.
2. Match the district, market and variety to controlled names.
3. Confirm `min_price <= modal_price <= max_price`, reject duplicates and review large changes.
4. Export approved observations to `data/daily_market_prices.csv` using the documented columns.
5. After the market reporting window closes, run `npm.cmd run train` followed by `npm.cmd run verify`.
6. Promote the new JSON artifact only when verification passes. Retain the previous artifact for rollback.

Do not run `prepare` during the daily workflow because that command intentionally rebuilds the file from the original historical dataset. Use it only for a full historical reset.

## Prediction request

The forecasting service needs the exact canonical identity:

```json
{
  "district": "Buldhana",
  "market": "Acf Agro Marketing, Malkapur, Dist Buldhana",
  "variety": "Other",
  "as_of": "2026-10-02"
}
```

The model returns direct forecasts for 1, 7 and 30 days, an 80% empirical range, the latest input used and the matching validation MAPE. If today's price is missing, it uses the latest verified observation from the previous 30 days and returns `input_status: stale_fallback`, `data_age_days`, a reduced confidence label and a wider range. The UI must display that freshness information beside the prediction.

## Product display

Show the estimate and range together, for example `₹7,778 (typical range ₹7,220–₹8,335)`. Also show the latest observed price and date. Avoid labels such as “correct price” or “guaranteed price”; the result is a statistical estimate.

## Monitoring

When actual prices arrive, store the prior prediction with its model version and calculate absolute percentage error. Monitor each horizon by market and variety. Stop promotion and investigate when rolling MAPE exceeds 3% for one day, 4% for seven days or 8% for 30 days, or when data coverage falls sharply.
