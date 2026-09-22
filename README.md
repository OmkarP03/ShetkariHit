# ShetkariHit

> One decision for a better crop.

A farmer decision platform for Maharashtra — weather, soil, crop health, market
and government schemes resolved into a single clear action per plot, per day,
in Marathi.

**This is a work in progress, not a finished product.** What runs today is
listed below, honestly. See `docs/architecture.md` for the full design.

---

## Status

| Phase | What | State |
|---|---|---|
| 0 | RLS policies + security hardening | **written, not applied** |
| 1 | Scaffold, dark design system, i18n (mr/en), PWA | done |
| 2 | Auth, profile, farm, multi-plot, crop cycle | done |
| 3 | Reference + demo seed data | not started |
| 4 | Weather / soil ingestion | not started |
| 5 | Advisory engine, Today screen wiring | UI done, engine not started |
| 6 | What-if simulation | not started |
| 7 | Market intelligence, net return | needs a `markets` table |
| 8 | Crop Doctor (photo + voice) | not started |
| 9 | Ask (grounded LLM) | mic wired, answers not connected |
| 10 | Schemes matching | reads real rows; table is empty |
| 11 | Offline sync, analytics, harvest → sale → profit | not started |

The Today screen renders advisories correctly but **there are none in the
database yet**, so it shows its empty state. That is the engine's absence, not
a bug.

---

## Setup

### 1. Apply the database migration

```bash
# Supabase SQL Editor → paste and run:
supabase/migrations/001_rls_and_security.sql
```

**Nothing works before this.** 31 tables currently have RLS enabled with zero
policies, which means queries against them return an empty array rather than an
error — the app will look like it is working and show you nothing.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local     # fill in VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:5173
```

Get the anon key from Supabase → Project Settings → API. It is safe in the
client; RLS is what protects the data.

**Never put the service_role key in `/frontend`.** It bypasses RLS entirely.
It belongs only in Edge Function secrets.

### 3. Build

```bash
npm run build     # → dist/, ~125 KB gzipped
npm run preview
```

---

## Environment

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend `.env.local` | public |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env.local` | public; RLS enforces access |
| `WEATHER_API_KEY` | Edge Function secret | absent → mock provider, labelled "Demo data" |
| `MARKET_API_KEY` | Edge Function secret | absent → mock provider |
| `LLM_API_KEY` | Edge Function secret | absent → Ask returns nothing rather than inventing |

The app runs without any of the optional keys. Every mocked value is labelled
in the interface; nothing is passed off as a real reading.

---

## What is real and what is not

**Real:** the database schema (40 tables, inspected live), auth and the signup
trigger, the ownership hierarchy, crop categories and languages (8 and 3 rows),
all RLS policies in migration 001, the type definitions (generated from the
live schema).

**Not built yet:** every advisory. There is no engine, so there is no advice.
The UI that displays advice is finished and typed against the real table.

**Deliberately not faked:** the Ask screen does not answer. Schemes shows an
empty state. Neither invents content — for irrigation timing, pesticide dosage
or government benefits, a plausible wrong answer is worse than none.

---

## Architecture in one paragraph

React + TypeScript PWA talking straight to Supabase with the anon key, with
row-level security doing the access control. No API server: the database
already provides what a FastAPI layer would have to re-implement, and putting
a service-role key behind an API would move every security decision out of the
database and into hand-written code. Engines that need server-side execution
(advisory generation, ingestion, LLM calls) run as Edge Functions with the
service role. The client reads advisories; it never writes them.

---

## Things worth knowing before you continue

1. **`rls_auto_enable()` is an event trigger** that enables RLS on every new
   table in `public`. Ship policies in the same migration as any new table, or
   it will silently return nothing.

2. **`farmer_advisories` has no CHECK constraints.** `status`, `priority` and
   `advisory_type` accept any string. The vocabulary lives in
   `frontend/src/types/advisory.ts` and the engine must mirror it exactly.

3. **Confidence is 0–100, not 0–1.** Both `confidence_score` and `ai_confidence`
   are range-checked in the database. Scale model probabilities before storing.

4. **`farms` has `primary_water_source`, not `water_source`.** (`farm_plots`
   does have `water_source`.) This already caused one compile error.

5. **The database is in `ap-southeast-2` (Sydney).** Every query from
   Maharashtra crosses the Indian Ocean. Supabase cannot move a project's
   region in place — worth fixing before real farmers use it.

6. **Marathi voice support is inconsistent** across browsers. The voice service
   is abstracted so a better provider drops in, and the UI falls back to typing
   with a visible message rather than failing silently.

---

## Layout

```
shetkarihit/
  docs/architecture.md          design, schema mapping, decision loop
  supabase/migrations/          001_rls_and_security.sql
  frontend/
    src/
      components/               AdvisoryCard, PlotSelector, LanguageToggle
      context/                  AuthContext, FarmContext
      i18n/                     mr.json, en.json, provider
      pages/                    Welcome, Login, Signup, SetupFarm, AddPlot,
                                Today, Ask, Schemes, Account
      services/                 supabase, advisories, voice
      types/                    database.ts (generated), advisory.ts
```
