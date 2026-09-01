-- Production follow-up for opportunity_fetch_queue_action_reconcile_v1.
-- `tasks` has no updated_at column; keep the trigger compatible with the canonical task schema.

create or replace function public.pppp_tender_fetch_queue_action_reconcile_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  update public.pppp_opportunity_actions
  set
    status = case
      when new.status = 'analyzed' then 'resolved'
      when new.status = 'failed' then 'review'
      else status
    end,
    priority = case when new.status = 'failed' then 'larte' else priority end,
    payload = coalesce(payload,'{}'::jsonb) || jsonb_build_object(
      'fetch_queue_status', new.status,
      'fetch_queue_updated_at', new.updated_at,
      'fetch_attempt_count', new.attempt_count,
      'fetch_last_error', new.last_error
    ),
    updated_at = now()
  where tender_watch_id = new.tender_watch_id
    and action_type = 'krpp_authenticated_fetch_required'
    and status not in ('closed','done');

  if new.status = 'analyzed' then
    update public.tasks
    set status='mbyllur', done_at=coalesce(done_at,now())
    where source='opportunity_engine_v2'
      and source_ref='OPPORTUNITY:'||new.tender_watch_id::text||':krpp_authenticated_fetch_required'
      and status not in ('mbyllur','kryer','arkivuar');
  elsif new.status = 'failed' then
    update public.tasks
    set status='hapur', done_at=null, priority='larte',
        detail=coalesce(detail,'')||E'\n\nKRPP authenticated fetch failed after retries: '||coalesce(new.last_error,'unknown error')
    where source='opportunity_engine_v2'
      and source_ref='OPPORTUNITY:'||new.tender_watch_id::text||':krpp_authenticated_fetch_required';
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_tender_fetch_queue_action_reconcile_v1() from public, anon, authenticated;
grant execute on function public.pppp_tender_fetch_queue_action_reconcile_v1() to service_role;
