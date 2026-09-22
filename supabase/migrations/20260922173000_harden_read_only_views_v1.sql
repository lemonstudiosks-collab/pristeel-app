-- Keep read-only projections under the caller's RLS context.
-- Later CREATE OR REPLACE VIEW migrations reset this option on two views.
alter view public.pppp_home_current_actions_v1
  set (security_invoker = true);

alter view public.pppp_tender_price_dataset_v1
  set (security_invoker = true);

-- These projections are API read surfaces, not write surfaces.
revoke insert, update, delete, truncate, references, trigger
  on table public.pppp_home_current_actions_v1,
           public.pppp_tender_price_dataset_v1,
           public.pppp_tender_price_work_queue_v1
  from anon, authenticated;

