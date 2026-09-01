-- PPPP supplier-offer precision v1
-- Remove obvious non-offer documents from the review queue without approving or
-- creating any commercial offer automatically.

create or replace function public.pppp_supplier_offer_precision_reconcile_v1(
  p_apply boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_candidates integer := 0;
  v_superseded integer := 0;
  v_closed_tasks integer := 0;
begin
  select count(*) into v_candidates
  from public.supplier_offer_candidates c
  where c.status='review'
    and c.matched_rfq_id is null
    and lower(
      coalesce(c.subject,'')||' '||
      coalesce(c.raw_text,'')||' '||
      coalesce(c.extracted->'source_attachment_names','[]'::jsonb)::text
    ) ~ '(werkvertrag|bankgarantie|bank guarantee|bankverbindung|\bcontract\b|\bkontrat|agreement|guarantee|garanci)';

  if not p_apply then
    return jsonb_build_object(
      'mode','preview',
      'obvious_non_offer_candidates',v_candidates,
      'superseded',0,
      'closed_tasks',0,
      'generated_at',now()
    );
  end if;

  with changed as (
    update public.supplier_offer_candidates c
       set status='superseded',
           reviewed_at=coalesce(c.reviewed_at,now()),
           updated_at=now(),
           extracted=jsonb_set(
             coalesce(c.extracted,'{}'::jsonb),
             '{classification}',
             to_jsonb('non_offer_document'::text),
             true
           )
     where c.status='review'
       and c.matched_rfq_id is null
       and lower(
         coalesce(c.subject,'')||' '||
         coalesce(c.raw_text,'')||' '||
         coalesce(c.extracted->'source_attachment_names','[]'::jsonb)::text
       ) ~ '(werkvertrag|bankgarantie|bank guarantee|bankverbindung|\bcontract\b|\bkontrat|agreement|guarantee|garanci)'
    returning c.id
  )
  select count(*) into v_superseded from changed;

  with closed as (
    update public.tasks t
       set status='mbyllur',
           done_at=coalesce(t.done_at,now()),
           detail=concat_ws(E'\n',nullif(t.detail,''),'PPPP: commercial intake review auto-closed because no supplier-offer candidates remain in review for this project.')
     where t.source='commercial_intake_review'
       and t.status='hapur'
       and t.project_id is not null
       and not exists (
         select 1
         from public.supplier_offer_candidates c
         where c.project_id=t.project_id and c.status='review'
       )
    returning t.id
  )
  select count(*) into v_closed_tasks from closed;

  return jsonb_build_object(
    'mode','apply',
    'obvious_non_offer_candidates',v_candidates,
    'superseded',v_superseded,
    'closed_tasks',v_closed_tasks,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_supplier_offer_precision_reconcile_v1(boolean) from public, anon, authenticated;
grant execute on function public.pppp_supplier_offer_precision_reconcile_v1(boolean) to service_role;

do $do$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname='supplier-offer-precision-10m'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end
$do$;

select cron.schedule(
  'supplier-offer-precision-10m',
  '7-57/10 * * * *',
  $$select public.pppp_supplier_offer_precision_reconcile_v1(true);$$
);
