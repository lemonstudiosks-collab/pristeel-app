-- Future-only policy approved 2026-09-07.
-- 1) Automatic Gmail draft creation is GC/GU/EPC-first. Producer award-holders remain
--    secondary review opportunities and are not auto-materialized as Gmail drafts.
-- 2) New KRPP notices for clear metal/steel structures (including canopy/carport/shelter
--    wording variants) receive strong steel-structure fit without changing older rows.

select cron.unschedule(jobid)
from cron.job
where jobname = 'opportunity-gmail-drafts-15m';

select cron.schedule(
  'opportunity-gmail-drafts-15m',
  '11,26,41,56 * * * *',
  $cron$
    select net.http_get(
      url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-opportunity-draft-generator?limit=1&action_id=' || q.id::text,
      headers := jsonb_build_object(
        'x-pppp-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1)
      ),
      timeout_milliseconds := 120000
    )
    from (
      select id
      from public.pppp_opportunity_action_queue_v2
      where status = 'draft_review'
        and action_type = 'gc_project_outreach_draft'
        and created_at >= timestamptz '2026-09-07 15:45:00+00'
      order by relevance_score desc nulls last, created_at asc, id asc
      limit 20
    ) q;
  $cron$
);

create or replace function public.pppp_future_krpp_structure_fit_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source text := upper(coalesce(new.payload->>'source','KRPP'));
  v_title text := lower(coalesce(new.title,''));
  v_cutoff constant timestamptz := timestamptz '2026-09-07 15:45:00+00';
  v_direct_structure boolean;
  v_reason constant text := 'strukturë direkte: konstruksion/mbulesë metalike';
begin
  if v_source <> 'KRPP' or coalesce(new.created_at,new.first_seen_at,now()) < v_cutoff then
    return new;
  end if;

  v_direct_structure :=
    (
      v_title ~ '(konstruksion|konstrukcion|struktur)'
      and v_title ~ '(metal|metali|metalik|çelik|celik|steel)'
    )
    or
    (
      v_title ~ '(mbuloje|mbulese|mbulesë|carport|canopy|shelter|strehe|strehë)'
      and v_title ~ '(metal|metali|metalik|çelik|celik|steel)'
    );

  if not v_direct_structure then
    return new;
  end if;

  new.category := 'steel_structure';
  new.relevance_score := greatest(coalesce(new.relevance_score,0),86);
  if not (v_reason = any(coalesce(new.match_reasons,'{}'::text[]))) then
    new.match_reasons := array_append(coalesce(new.match_reasons,'{}'::text[]),v_reason);
  end if;

  new.payload := coalesce(new.payload,'{}'::jsonb) || jsonb_build_object(
    'capability_fit','strong',
    'capability_direct_evidence',true,
    'capability_review_required',false,
    'future_krpp_structure_policy','gc-first-future-v1',
    'future_krpp_structure_policy_applied_at',now()
  );

  return new;
end;
$function$;

drop trigger if exists pppp_future_krpp_structure_fit_v1 on public.kek_tender_watch;
create trigger pppp_future_krpp_structure_fit_v1
before insert or update of title,relevance_score,category,payload,first_seen_at
on public.kek_tender_watch
for each row
execute function public.pppp_future_krpp_structure_fit_v1();
