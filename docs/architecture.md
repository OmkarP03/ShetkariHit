# ShetkariHit — Architecture

> One decision for a better crop.

This document is the contract between the product spec and the **existing**
Supabase database. Where the build prompt and the live schema disagreed, the
live schema won — per the project's own standing rule: *build on the existing
ShetkariHit database; do not recreate it.*

---

## 1. Shape of the system

```
                        Farmer (mobile, Marathi-first)
                                    |
                        React + TypeScript PWA
                                    |
                     supabase-js  (anon key, RLS enforced)
                                    |
        +---------------------------+---------------------------+
        |                                                       |
   Postgres (40 tables, RLS)                        Edge Functions (Deno)
        |                                                       |
   farmer-owned data                                  advisory-engine
   reference data                                     crop-doctor
   observations                                       ask (grounded LLM)
                                                      ingest-weather
                                                      ingest-market
```

There is **no separate API server.** The build prompt asked for FastAPI; we use
Supabase directly because the database already ships with the thing FastAPI
would have had to re-implement — authentication tied to row-level security. A
FastAPI layer would have to hold a service-role key, which bypasses RLS, moving
every security decision out of the database and into hand-written Python. The
engines that genuinely need server-side execution run as Edge Functions.

**Consequence to remember:** the client never writes an advisory. It reads them.
Advisories are authored only by the engine, which runs with the service role.
That is what makes "why did my advice change?" trustworthy — the farmer cannot
have written the previous answer.

---

## 2. Entity model (as it actually exists)

```
auth.users
    |  AFTER INSERT trigger → handle_new_user()
    v
profiles                      (id = auth.users.id; no FK, matched by UUID + RLS)
    |
    +-- farms                 (farmer_id → profiles.id)
    |     |
    |     +-- farm_plots      (farm_id → farms.id)
    |           |
    |           +-- crop_cycles        (plot_id → farm_plots.id)
    |                 |                 crop_category_id → crop_categories.id
    |                 +-- crop_activities
    |                 +-- crop_expenses
    |                 +-- crop_stage_history
    |                 +-- crop_health_observations → crop_health_issues
    |                 +-- crop_treatment_history   → crop_treatments
    |
    +-- farmer_advisories     ← the decision engine's only output table
    +-- farmer_decision_records
    +-- advisory_actions / advisory_feedback
    +-- farmer_notifications
    +-- produce_listings → produce_orders → farmer_sales
```

### Prompt's table names → real table names

The build prompt (§62) named tables that do not exist. This is the mapping used
throughout the code. **No table from §62 was created.**

| Prompt §62      | Actual table                                   |
|-----------------|------------------------------------------------|
| `users`         | `profiles`                                     |
| `plots`         | `farm_plots`                                   |
| `crop_journeys` | `crop_cycles`                                  |
| `crop_stages`   | `crop_stage_history`                           |
| `farm_actions`  | `crop_activities` + `farmer_activity_logs`     |
| `advisories`    | `farmer_advisories`                            |
| `advisory_history` | `advisory_generation_logs` + `farmer_decision_records` |
| `schemes`       | `government_schemes`                           |
| `scheme_matches`| `farmer_scheme_recommendations`                |
| `disease_detections` | `crop_health_observations`                |
| `pest_risk`     | `alert_events` (event_type = `PEST_RISK`)      |
| `profit_records`| `crop_expenses` + `farmer_sales` (derived)     |
| `voice_queries` | `farmer_activity_logs` (activity_type = `VOICE_QUERY`) |
| `soil_readings` / `groundwater_readings` | `soil_data` (holds `groundwater_level_m`) |
| `weather_forecasts` | `weather_data` (`is_forecast = true`)      |

Genuinely missing, to be added in a later migration: `markets` (with
`transport_costs`) for the net-return comparison in §29, and a satellite/NDVI
source — the architecture diagram names satellite data but no table holds it.

---

## 3. The decision loop

This is the product. Everything else is plumbing.

```
  farmer + farm + plot + crop_cycle + current_stage
            +  weather_data (forecast)
            +  soil_data (moisture, groundwater)
            +  alert_events (pest risk)
            +  market_prices
            +  crop_activities (what was actually done)
                        |
                        v
             advisory-engine (Edge Function)
                        |
            +-----------+-----------+
            |           |           |
      irrigation      pest       market
         rules        rules       rules
            |           |           |
            +-----------+-----------+
                        |
                 confidence scoring
                        |
                        v
              farmer_advisories  (one row per plot per day)
                 title / message / recommended_action   ← TODAY
                 reason + data_inputs (jsonb)           ← WHY
                 valid_from .. valid_until              ← NEXT
                 confidence_score (0-100)
                        |
                        v
                 farmer reads it, acts
                        |
              advisory_actions (VIEWED/ACCEPTED/COMPLETED/DISMISSED)
                        |
              farmer_decision_records (before / advisory / after / why changed)
                        |
                        v
                 new inputs arrive → recalculate
```

### TODAY / NEXT / WHY, concretely

The schema has no `next_action` column. Rather than add one, the three outputs
map onto what exists:

- **TODAY** — the advisory row whose `valid_from <= now() < valid_until`, ranked
  by `priority` then `confidence_score`, limited to one per plot.
- **NEXT** — subsequent rows for the same `crop_cycle_id` with a later
  `valid_from`. The engine writes them in the same pass.
- **WHY** — `reason` (prose, localized) plus `data_inputs` (the jsonb snapshot of
  every value the decision was made from). The UI renders `data_inputs` as the
  expandable evidence list.

`data_inputs` also carries `degraded_inputs: []`, which is how §42's
sensor-offline demo works without fabricating readings.

### Value vocabulary

`farmer_advisories` has **no CHECK constraints** — `status`, `priority` and
`advisory_type` accept any string. The application therefore owns this
vocabulary, defined once in `src/types/advisory.ts` and mirrored in the engine.
A later migration should push these into the database as CHECKs.

Where the database *does* constrain values, the app conforms exactly:

| Column | Allowed |
|---|---|
| `crop_cycles.status` | PLANNED, SOWN, GROWING, HARVEST_READY, HARVESTED, STORED, SOLD, COMPLETED, CANCELLED |
| `advisory_actions.action_type` | VIEWED, ACCEPTED, COMPLETED, DISMISSED |
| `advisory_generation_logs.generation_method` | RULE_ENGINE, AI, HYBRID, MANUAL |
| `advisory_generation_logs.generation_status` | SUCCESS, FAILED, PARTIAL |
| `crop_health_observations.detection_method` | FARMER, AI, EXPERT, API |
| `crop_health_observations.severity` | LOW, MEDIUM, HIGH, CRITICAL |
| `crop_health_issues.issue_type` | DISEASE, PEST, DEFICIENCY, OTHER |
| `crop_treatments.treatment_type` | BIOLOGICAL, CHEMICAL, ORGANIC, CULTURAL, OTHER |
| `data_sources.data_category` | WEATHER, SOIL, GROUNDWATER, MARKET, CROP, PEST_DISEASE, GOVERNMENT_SCHEME, OTHER |

**Confidence is 0–100, not 0–1.** Both `confidence_score` and `ai_confidence`
are range-checked in the database. A model returning a probability must be
scaled before it is stored.

---

## 4. Multi-crop, multi-plot

Non-negotiable per §9. Enforced structurally: an advisory is written against a
`crop_cycle_id`, never against a farmer. The engine loops over the farmer's
active crop cycles and runs independently for each.

```
Ravi's farm (10 acres)
  ├── Plot 1 · 5 acres · Pomegranate  → its own advisory, stage, market view
  └── Plot 2 · 5 acres · Orange       → its own advisory, stage, market view
```

The `All Farm` view is a **summary of distinct per-plot decisions**, never a
merged one. If pomegranate says "do not irrigate" and orange says "inspect for
pest", the farm view shows both, side by side, with the plot named. There is no
code path that averages two crops into one recommendation.

---

## 5. Security model

Three principals:

| Principal | Key | Reaches |
|---|---|---|
| Farmer (app) | anon key + user JWT | only their own rows, via RLS |
| Engine / ingestion | service role, Edge Functions only | everything, RLS bypassed |
| Public (signed out) | anon key | active reference data only |

Ownership always resolves to `profiles.id = auth.uid()`, either directly
(`farmer_id`) or by join (`crop_cycle → plot → farm → farmer`).

`auth.uid()` is always wrapped as `(select auth.uid())` so it is evaluated once
per query rather than once per row.

**Tables with no policies are not all oversights.** `data_sources`,
`data_fetch_logs` and `scheme_sync_logs` hold provider URLs and API key
references; they are backend-only by design and stay policy-free. Supabase's
linter will keep listing them — that is expected.

**The service-role key never enters the frontend.** It exists only as an Edge
Function secret.

### Event trigger to be aware of

`rls_auto_enable()` is an event trigger that enables RLS on every newly created
table in `public`. Any table added later starts locked. Ship its policies in the
same migration, or the app will read zeros and look broken rather than erroring.

---

## 6. Data sources and honesty

Every external domain goes through a provider interface with a real and a mock
implementation, selected by presence of an API key:

```
WeatherProvider  ← OpenWeatherProvider | MockWeatherProvider
MarketProvider   ← AgmarknetProvider   | MockMarketProvider
SoilProvider     ← SensorProvider      | EstimatedSoilProvider
```

Rows land in `weather_data`, `soil_data`, `market_prices`, each carrying
`data_source_id` and `fetched_at`. `data_sources.source_type` records whether a
row came from `API` or `MANUAL` (demo), so provenance survives into the UI.

Non-negotiable: **mocked data is labelled in the interface.** Any card fed by a
`MANUAL` source renders a "Demo data" chip, and every dynamic card shows its
`fetched_at` as "Updated 2 hours ago". Cached data says when it was cached. The
system never presents an estimate as a reading.

When a source is missing, the engine does not invent a value. It records the
absence in `degraded_inputs`, falls back (last known soil reading, days since
rain, irrigation history, crop stage) and lowers `confidence_score`. The UI then
shows: *"Sensor offline — recommendation uses estimated soil moisture."*

---

## 7. Language

Marathi is primary, English secondary. No string is hardcoded in a component;
all text comes from `src/i18n/{mr,en}.json`.

The database is already bilingual-plus: `farmer_advisories` carries
`title_marathi`/`title_hindi`, `message_marathi`/`message_hindi`,
`recommended_action_marathi`/`recommended_action_hindi`, and the reference tables
carry Marathi and Hindi name columns. **The engine writes all three languages at
generation time**, so switching language does not require regenerating an
advisory or calling a translation API at read time.

`profiles.preferred_language` → `supported_languages.language_code`
(`en`, `mr`, `hi` active). The selector reads from the database rather than a
hardcoded list, so adding Gujarati is a row, not a deploy.

---

## 8. Voice

Voice is a primary input, not an accessory. Service abstraction in
`src/services/voice/`:

```
SpeechToText  ← WebSpeechSTT  | (pluggable: Bhashini, Whisper)
TextToSpeech  ← WebSpeechTTS  | (pluggable)
```

Browser Web Speech API support for `mr-IN` is inconsistent. The abstraction
exists so a better provider drops in without touching screens, and the UI
degrades to typing with a clear message rather than failing silently.

Voice queries inherit **plot context**: if the farmer is viewing the pomegranate
plot and asks "पाणी द्यायचं का?", the query resolves against that crop cycle
without asking which crop.

---

## 9. Grounded answers

The Ask screen never sends a bare question to an LLM. It assembles context
first — current advisory, plot, crop, stage, weather, market — and passes that
as the only permitted source material. The system prompt forbids inventing
prices, schemes, pesticide dosages or diagnoses, and requires saying so when
data is unavailable.

Treatment advice is **never** LLM-generated. It is read from `crop_treatments`
and `health_treatment_recommendations`, which carry `active_ingredient`,
`dosage`, `waiting_period_days`, `safety_precautions`. If no verified treatment
row exists, the app says: *"Consult your local agriculture officer or KVK before
spraying."* It does not guess.

---

## 10. What-if / adaptation

§41 requires that toggling an input actually re-runs the engine, not swaps UI
text. The engine is therefore pure with respect to its inputs:

```
advisory = engine(context)
simulated = engine({ ...context, weather: { rain_probability: 5 } })
```

Simulation runs in-memory and writes nothing. Real advisories and simulated ones
never share a code path with persistence.

---

## 11. Build order

Follows §99, trimmed to what the existing schema already supports.

| Phase | Scope | Blocked by |
|---|---|---|
| 0 | RLS policies + security fixes (migration 001) | — |
| 1 | Scaffold, design system, i18n, Supabase client | 0 |
| 2 | Auth + onboarding → profile → farm → plot → crop | 1 |
| 3 | Reference + demo seed data | 0 |
| 4 | Weather + soil ingestion (mock first) | 3 |
| 5 | Advisory engine, Today screen, Why, Next | 4 |
| 6 | What-if simulation | 5 |
| 7 | Market intelligence, net return, sell/hold | needs `markets` table |
| 8 | Crop Doctor (photo + voice) | vision key |
| 9 | Ask (grounded) | LLM key |
| 10 | Schemes matching | verified scheme data |
| 11 | Offline/PWA, analytics, harvest → sale → profit | 5 |

Phase 0 gates everything: with 31 tables policy-free, the client reads empty
arrays rather than errors, which looks like a UI bug and is not.

---

## 12. Known limitations

- No `markets` or `transport_costs` table yet, so §29's net-return comparison
  needs a migration before it can be real.
- No satellite/NDVI table, though the source architecture diagram names one.
- `farmer_advisories` has no CHECK constraints; the value vocabulary is enforced
  in application code only.
- Marathi speech recognition depends on browser support and will not work
  everywhere.
- Price forecasting is explainable-simple (trend + moving average) and always
  returns a range, never a point estimate.
- The project database is hosted in `ap-southeast-2` (Sydney). Every query from
  Maharashtra crosses the Indian Ocean. Supabase cannot move a project's region
  in place; this is worth correcting before the database holds real farmers.
