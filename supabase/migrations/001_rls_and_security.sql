-- ShetkariHit — Migration 001
-- RLS policies for the farmer decision loop + security hardening.
--
-- Design rules applied here:
--   1. Ownership is always resolved back to profiles.id = auth.uid().
--   2. auth.uid() is wrapped in (select ...) so Postgres evaluates it ONCE
--      per query instead of once per row (fixes 22 auth_rls_initplan warnings).
--   3. Tables written only by the decision engine / ingestion jobs get NO
--      client policies on purpose — the service role bypasses RLS entirely.
--      "Zero policies" is the correct end state for those, not a gap.
--   4. Reference data is readable by anon + authenticated, filtered on is_active.
--
-- Reversible: every statement is CREATE OR DROP POLICY / GRANT. No data touched.

begin;

-- ---------------------------------------------------------------------------
-- 0. SECURITY: stop exposing SECURITY DEFINER functions on the REST API
-- ---------------------------------------------------------------------------
-- handle_new_user() is the signup trigger; rls_auto_enable() is an event
-- trigger that enables RLS on newly created tables. Neither should ever be
-- callable from a client at /rest/v1/rpc/.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- Pin search_path on the two timestamp trigger functions (advisor WARN).
alter function public.handle_updated_at() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;

-- ---------------------------------------------------------------------------
-- 1. Remove the duplicated catch-all policies
-- ---------------------------------------------------------------------------
-- These four tables each carry a granular per-command set for `authenticated`
-- PLUS a `FOR ALL TO public` policy. Policies OR together, so the catch-all is
-- what actually decides — and it grants to `public` (incl. anon). We drop the
-- catch-alls and make the granular sets complete instead.
drop policy if exists "users own profile" on public.profiles;
drop policy if exists "users own farms"   on public.farms;
drop policy if exists "users own plots"   on public.farm_plots;
drop policy if exists "users own crops"   on public.crop_cycles;

-- ---------------------------------------------------------------------------
-- 2. Rewrite the existing 9 tables' policies with (select auth.uid())
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Farmers can view own farms"   on public.farms;
drop policy if exists "Farmers can create own farms" on public.farms;
drop policy if exists "Farmers can update own farms" on public.farms;

create policy "farms_select_own" on public.farms
  for select to authenticated using ((select auth.uid()) = farmer_id);
create policy "farms_insert_own" on public.farms
  for insert to authenticated with check ((select auth.uid()) = farmer_id);
create policy "farms_update_own" on public.farms
  for update to authenticated using ((select auth.uid()) = farmer_id)
  with check ((select auth.uid()) = farmer_id);
create policy "farms_delete_own" on public.farms
  for delete to authenticated using ((select auth.uid()) = farmer_id);

drop policy if exists "Farmers can view own plots"   on public.farm_plots;
drop policy if exists "Farmers can create own plots" on public.farm_plots;
drop policy if exists "Farmers can update own plots" on public.farm_plots;

create policy "farm_plots_select_own" on public.farm_plots
  for select to authenticated using (
    exists (select 1 from public.farms f
            where f.id = farm_plots.farm_id and f.farmer_id = (select auth.uid())));
create policy "farm_plots_insert_own" on public.farm_plots
  for insert to authenticated with check (
    exists (select 1 from public.farms f
            where f.id = farm_plots.farm_id and f.farmer_id = (select auth.uid())));
create policy "farm_plots_update_own" on public.farm_plots
  for update to authenticated using (
    exists (select 1 from public.farms f
            where f.id = farm_plots.farm_id and f.farmer_id = (select auth.uid())));
create policy "farm_plots_delete_own" on public.farm_plots
  for delete to authenticated using (
    exists (select 1 from public.farms f
            where f.id = farm_plots.farm_id and f.farmer_id = (select auth.uid())));

drop policy if exists "Farmers can view own crop cycles"   on public.crop_cycles;
drop policy if exists "Farmers can create own crop cycles" on public.crop_cycles;
drop policy if exists "Farmers can update own crop cycles" on public.crop_cycles;

create policy "crop_cycles_select_own" on public.crop_cycles
  for select to authenticated using (
    exists (select 1 from public.farm_plots p join public.farms f on f.id = p.farm_id
            where p.id = crop_cycles.plot_id and f.farmer_id = (select auth.uid())));
create policy "crop_cycles_insert_own" on public.crop_cycles
  for insert to authenticated with check (
    exists (select 1 from public.farm_plots p join public.farms f on f.id = p.farm_id
            where p.id = crop_cycles.plot_id and f.farmer_id = (select auth.uid())));
create policy "crop_cycles_update_own" on public.crop_cycles
  for update to authenticated using (
    exists (select 1 from public.farm_plots p join public.farms f on f.id = p.farm_id
            where p.id = crop_cycles.plot_id and f.farmer_id = (select auth.uid())));
create policy "crop_cycles_delete_own" on public.crop_cycles
  for delete to authenticated using (
    exists (select 1 from public.farm_plots p join public.farms f on f.id = p.farm_id
            where p.id = crop_cycles.plot_id and f.farmer_id = (select auth.uid())));

-- crop_activities / crop_expenses / crop_stage_history had SELECT+INSERT only,
-- so a farmer could log an action but never correct or remove it. Fixed.
do $$
declare t text;
begin
  foreach t in array array['crop_activities','crop_expenses','crop_stage_history']
  loop
    execute format('drop policy if exists %I on public.%I',
                   'Farmers can view own ' || case t
                     when 'crop_activities' then 'activities'
                     when 'crop_expenses' then 'expenses'
                     else 'stage history' end, t);
    execute format('drop policy if exists %I on public.%I',
                   'Farmers can create own ' || case t
                     when 'crop_activities' then 'activities'
                     when 'crop_expenses' then 'expenses'
                     else 'stage history' end, t);

    execute format($f$
      create policy %I on public.%I for select to authenticated using (
        exists (select 1 from public.crop_cycles cc
                join public.farm_plots p on p.id = cc.plot_id
                join public.farms f on f.id = p.farm_id
                where cc.id = %I.crop_cycle_id and f.farmer_id = (select auth.uid())))
    $f$, t || '_select_own', t, t);

    execute format($f$
      create policy %I on public.%I for insert to authenticated with check (
        exists (select 1 from public.crop_cycles cc
                join public.farm_plots p on p.id = cc.plot_id
                join public.farms f on f.id = p.farm_id
                where cc.id = %I.crop_cycle_id and f.farmer_id = (select auth.uid())))
    $f$, t || '_insert_own', t, t);

    execute format($f$
      create policy %I on public.%I for update to authenticated using (
        exists (select 1 from public.crop_cycles cc
                join public.farm_plots p on p.id = cc.plot_id
                join public.farms f on f.id = p.farm_id
                where cc.id = %I.crop_cycle_id and f.farmer_id = (select auth.uid())))
    $f$, t || '_update_own', t, t);

    execute format($f$
      create policy %I on public.%I for delete to authenticated using (
        exists (select 1 from public.crop_cycles cc
                join public.farm_plots p on p.id = cc.plot_id
                join public.farms f on f.id = p.farm_id
                where cc.id = %I.crop_cycle_id and f.farmer_id = (select auth.uid())))
    $f$, t || '_delete_own', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. The decision loop — farmer-owned, keyed directly on farmer_id
-- ---------------------------------------------------------------------------
-- SELECT + UPDATE for the farmer (mark read, change status, record action).
-- INSERT stays engine-only for advisories: the farmer must not be able to
-- author their own advisory, or "why did the advice change?" becomes meaningless.
do $$
declare t text;
begin
  foreach t in array array[
    'farmer_advisories','farmer_notifications','farmer_scheme_recommendations',
    'alert_events','farmer_analytics_snapshots','advisory_generation_logs',
    'notification_delivery_logs'
  ] loop
    execute format($f$
      create policy %I on public.%I for select to authenticated
        using (farmer_id = (select auth.uid()))
    $f$, t || '_select_own', t);
  end loop;

  -- farmer may mutate read/dismiss state on these
  foreach t in array array[
    'farmer_advisories','farmer_notifications','farmer_scheme_recommendations','alert_events'
  ] loop
    execute format($f$
      create policy %I on public.%I for update to authenticated
        using (farmer_id = (select auth.uid()))
        with check (farmer_id = (select auth.uid()))
    $f$, t || '_update_own', t);
  end loop;

  -- farmer authors these outright: actions, feedback, decisions, activity, sales,
  -- listings, scheme applications, price snapshots
  foreach t in array array[
    'advisory_actions','advisory_feedback','farmer_decision_records',
    'farmer_activity_logs','farmer_sales','produce_listings',
    'produce_price_snapshots','scheme_applications'
  ] loop
    execute format($f$
      create policy %I on public.%I for select to authenticated
        using (farmer_id = (select auth.uid()))
    $f$, t || '_select_own', t);
    execute format($f$
      create policy %I on public.%I for insert to authenticated
        with check (farmer_id = (select auth.uid()))
    $f$, t || '_insert_own', t);
    execute format($f$
      create policy %I on public.%I for update to authenticated
        using (farmer_id = (select auth.uid()))
        with check (farmer_id = (select auth.uid()))
    $f$, t || '_update_own', t);
    execute format($f$
      create policy %I on public.%I for delete to authenticated
        using (farmer_id = (select auth.uid()))
    $f$, t || '_delete_own', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Crop Doctor — ownership resolved through crop_cycle
-- ---------------------------------------------------------------------------
create policy "crop_health_observations_select_own" on public.crop_health_observations
  for select to authenticated using (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_health_observations.crop_cycle_id
              and f.farmer_id = (select auth.uid())));
create policy "crop_health_observations_insert_own" on public.crop_health_observations
  for insert to authenticated with check (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_health_observations.crop_cycle_id
              and f.farmer_id = (select auth.uid())));
create policy "crop_health_observations_update_own" on public.crop_health_observations
  for update to authenticated using (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_health_observations.crop_cycle_id
              and f.farmer_id = (select auth.uid())));

create policy "crop_treatment_history_select_own" on public.crop_treatment_history
  for select to authenticated using (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_treatment_history.crop_cycle_id
              and f.farmer_id = (select auth.uid())));
create policy "crop_treatment_history_insert_own" on public.crop_treatment_history
  for insert to authenticated with check (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_treatment_history.crop_cycle_id
              and f.farmer_id = (select auth.uid())));
create policy "crop_treatment_history_update_own" on public.crop_treatment_history
  for update to authenticated using (
    exists (select 1 from public.crop_cycles cc
            join public.farm_plots p on p.id = cc.plot_id
            join public.farms f on f.id = p.farm_id
            where cc.id = crop_treatment_history.crop_cycle_id
              and f.farmer_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- 5. Marketplace — two-sided, so buyer needs read access too
-- ---------------------------------------------------------------------------
-- Any signed-in farmer may browse OPEN listings (that is the point of a market).
create policy "produce_listings_select_open" on public.produce_listings
  for select to authenticated using (status = 'OPEN' or farmer_id = (select auth.uid()));

create policy "produce_orders_select_party" on public.produce_orders
  for select to authenticated
  using (farmer_id = (select auth.uid()) or buyer_id = (select auth.uid()));
create policy "produce_orders_insert_buyer" on public.produce_orders
  for insert to authenticated with check (buyer_id = (select auth.uid()));
create policy "produce_orders_update_party" on public.produce_orders
  for update to authenticated
  using (farmer_id = (select auth.uid()) or buyer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Reference / knowledge data — read-only to everyone, writes stay backend
-- ---------------------------------------------------------------------------
create policy "advisory_categories_read" on public.advisory_categories
  for select to anon, authenticated using (is_active = true);
create policy "crop_health_issues_read" on public.crop_health_issues
  for select to anon, authenticated using (is_active = true);
create policy "crop_treatments_read" on public.crop_treatments
  for select to anon, authenticated using (is_active = true);
create policy "health_issue_crop_rules_read" on public.health_issue_crop_rules
  for select to anon, authenticated using (is_active = true);
create policy "health_treatment_recommendations_read" on public.health_treatment_recommendations
  for select to anon, authenticated using (is_active = true);
create policy "government_schemes_read" on public.government_schemes
  for select to anon, authenticated using (is_active = true);
create policy "scheme_eligibility_rules_read" on public.scheme_eligibility_rules
  for select to authenticated using (is_active = true);

-- ---------------------------------------------------------------------------
-- 7. Environmental / market observations — location-keyed, not farmer-keyed
-- ---------------------------------------------------------------------------
-- Readable by any signed-in farmer; written only by ingestion (service role).
create policy "weather_data_read"  on public.weather_data  for select to authenticated using (true);
create policy "soil_data_read"     on public.soil_data     for select to authenticated using (true);
create policy "market_prices_read" on public.market_prices for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 8. Deliberately policy-free (service role only)
-- ---------------------------------------------------------------------------
-- data_sources, data_fetch_logs, scheme_sync_logs hold provider URLs, API key
-- references and ingestion traces. No client should read them. They keep RLS
-- enabled with zero policies ON PURPOSE — Supabase's linter will still list
-- them as INFO; that is expected, not an outstanding gap.
comment on table public.data_sources is
  'Backend-only. RLS enabled with no policies by design; service role access only.';
comment on table public.data_fetch_logs is
  'Backend-only. RLS enabled with no policies by design; service role access only.';
comment on table public.scheme_sync_logs is
  'Backend-only. RLS enabled with no policies by design; service role access only.';

commit;
