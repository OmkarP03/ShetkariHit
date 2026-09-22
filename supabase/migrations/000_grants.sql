-- ShetkariHit — Migration 000 (APPLIED 2026-09-21)
--
-- Restores table-level privileges for the PostgREST roles.
--
-- WHY THIS EXISTS
-- The anon/authenticated roles held only REFERENCES, TRIGGER and TRUNCATE on
-- the public tables — no SELECT/INSERT/UPDATE/DELETE. Supabase normally grants
-- DML to these roles and lets RLS filter rows; here the grants had been
-- stripped. Every client request therefore failed with
--   "permission denied for table <x>"
-- before RLS was ever consulted, including on the nine tables whose policies
-- were already correct.
--
-- Grants decide WHICH TABLES a role may touch. RLS decides WHICH ROWS.
-- Both are required; neither substitutes for the other. Granting DML broadly
-- is safe here precisely because RLS is enabled on all 40 tables — a table
-- with no policy still denies every row.
--
-- This migration is additive only: no policy, table or row was modified.

grant usage on schema public to anon, authenticated;

do $$
declare t text;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      -- backend-only: provider URLs, API key references, ingestion traces.
      -- Left ungranted so no client can reach them even by accident.
      and c.relname not in ('data_sources','data_fetch_logs','scheme_sync_logs')
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Signed-out readers need only the lists that drive the language picker and
-- crop dropdown before login.
grant select on public.supported_languages  to anon;
grant select on public.crop_categories      to anon;
grant select on public.advisory_categories  to anon;
grant select on public.crop_health_issues   to anon;
grant select on public.crop_treatments      to anon;
grant select on public.government_schemes   to anon;

-- All primary keys are UUID, so there are no sequences to grant.
