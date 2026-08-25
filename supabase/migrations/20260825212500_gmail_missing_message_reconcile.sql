-- PPPP Gmail missing-message reconciler v1
-- Gmail can return 404 for historical message ids that remain useful as project history.
-- Preserve the project/email record, but stop body/attachment hydration from retrying forever.

create or replace function public.pppp_reconcile_gmail_missing_http_v1(p_lookback_minutes integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'net', 'pg_temp'
as $function$
declare
  v_minutes integer := greatest(5, least(coalesce(p_lookback_minutes,30), 240));
  v_missing_ids text[] := '{}'::text[];
  v_body_marked integer := 0;
  v_scan_marked integer := 0;
begin
  select coalesce(array_agg(distinct gmail_message_id), '{}'::text[])
    into v_missing_ids
  from (
    select substring(r.content::text from 'messages/([0-9a-f]+)') as gmail_message_id
    from net._http_response r
    where r.created >= now() - make_interval(mins => v_minutes)
      and coalesce(r.status_code,0) >= 400
      and r.content::text like '%Gmail /messages/%-> 404%'
  ) q
  where gmail_message_id is not null;

  if coalesce(array_length(v_missing_ids,1),0)=0 then
    return jsonb_build_object('missing_ids',0,'body_marked',0,'scan_marked',0);
  end if;

  update public.project_emails pe
     set body_hydrated_at = coalesce(pe.body_hydrated_at, now()),
         body_hydration_method = case
           when pe.body_hydrated_at is null then 'server-full-mime-gmail-missing-v1'
           else pe.body_hydration_method
         end,
         updated_at = now()
   where pe.gmail_message_id = any(v_missing_ids)
     and pe.body_hydrated_at is null;
  get diagnostics v_body_marked = row_count;

  with linked as (
    select distinct pe.project_id::text as project_id,
           pe.gmail_message_id::text as gmail_message_id,
           nullif(pe.gmail_thread_id::text,'') as gmail_thread_id
      from public.project_emails pe
     where pe.gmail_message_id = any(v_missing_ids)
       and pe.has_attachments is true
       and pe.project_id is not null
    union
    select distinct pel.project_id::text,
           pel.gmail_message_id::text,
           nullif(coalesce(pel.gmail_thread_id,pe.gmail_thread_id)::text,'')
      from public.project_email_links pel
      join public.project_emails pe on pe.gmail_message_id=pel.gmail_message_id
     where pel.gmail_message_id = any(v_missing_ids)
       and pe.has_attachments is true
       and pel.project_id is not null
  ), upserted as (
    insert into public.project_attachment_scan_state(
      project_id,gmail_message_id,gmail_thread_id,outcome,attachment_count,scan_method,scanned_at
    )
    select project_id::uuid,gmail_message_id,gmail_thread_id,'no_downloadable',0,'server-metadata-gmail-missing-v1',now()
      from linked
    on conflict (project_id,gmail_message_id) do update
      set gmail_thread_id=coalesce(excluded.gmail_thread_id,public.project_attachment_scan_state.gmail_thread_id),
          outcome='no_downloadable',
          attachment_count=0,
          scan_method='server-metadata-gmail-missing-v1',
          scanned_at=excluded.scanned_at
    returning 1
  )
  select count(*) into v_scan_marked from upserted;

  return jsonb_build_object(
    'missing_ids',coalesce(array_length(v_missing_ids,1),0),
    'message_ids',to_jsonb(v_missing_ids),
    'body_marked',v_body_marked,
    'scan_marked',v_scan_marked
  );
end;
$function$;

revoke all on function public.pppp_reconcile_gmail_missing_http_v1(integer) from public, anon, authenticated;
grant execute on function public.pppp_reconcile_gmail_missing_http_v1(integer) to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname='gmail-missing-message-reconcile-5m';

select cron.schedule(
  'gmail-missing-message-reconcile-5m',
  '8-58/5 * * * *',
  $$select public.pppp_reconcile_gmail_missing_http_v1(30);$$
);
