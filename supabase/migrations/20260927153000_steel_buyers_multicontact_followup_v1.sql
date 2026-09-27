-- Steel Buyers complete-flow v1
-- Allows one reviewed first-touch per verified recipient, one human-created
-- follow-up after seven days, and keeps every external send human-gated.

drop index if exists public.pppp_outbound_queue_v1_source_touch_uq;
create unique index if not exists pppp_outbound_queue_v1_source_touch_uq
  on public.pppp_outbound_queue_v1(source,source_record_id,touch_no)
  where source_record_id is not null and source <> 'DACH_STEEL_BUYER';
create unique index if not exists pppp_outbound_queue_v1_source_touch_recipient_uq
  on public.pppp_outbound_queue_v1(source,source_record_id,touch_no,lower(recipient_email))
  where source_record_id is not null and source = 'DACH_STEEL_BUYER';

alter function public.pppp_outbound_source_guard_v1(uuid)
  rename to pppp_outbound_source_guard_legacy_v1;

create or replace function public.pppp_outbound_source_guard_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  d public.pppp_dach_steel_targets_v1%rowtype;
  first_touch public.pppp_outbound_queue_v1%rowtype;
  v_domain text;
  v_guard jsonb;
  v_mode text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;

  if q.source <> 'DACH_STEEL_BUYER' then
    return public.pppp_outbound_source_guard_legacy_v1(p_queue_id);
  end if;

  if q.source_record_id is null then
    return jsonb_build_object('ok',false,'reason','steel_buyer_source_identity_missing');
  end if;
  if q.touch_no not in (1,2) then
    return jsonb_build_object('ok',false,'reason','steel_buyer_touch_not_supported');
  end if;
  if q.source_key not like ('DACH_STEEL_BUYER:'||q.source_record_id::text||':'||q.touch_no::text||':%')
     and not (q.touch_no=1 and q.source_key=('DACH_STEEL_BUYER:'||q.source_record_id::text||':1')) then
    return jsonb_build_object('ok',false,'reason','steel_buyer_noncanonical_identity');
  end if;

  select * into d from public.pppp_dach_steel_targets_v1 where id=q.source_record_id;
  if not found then return jsonb_build_object('ok',false,'reason','steel_buyer_target_missing'); end if;
  if d.target_status in ('closed','rejected','project_promoted') then
    return jsonb_build_object('ok',false,'reason','steel_buyer_target_not_active');
  end if;
  if q.gmail_draft_id is null then return jsonb_build_object('ok',false,'reason','steel_buyer_draft_missing'); end if;
  v_domain:=lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));
  if d.company_domain is not null and public.pppp_normalize_company_domain_v1(d.company_domain) is distinct from public.pppp_normalize_company_domain_v1(v_domain) then
    return jsonb_build_object('ok',false,'reason','steel_buyer_recipient_domain_mismatch');
  end if;

  if q.touch_no=1 then
    v_guard:=public.pppp_global_communication_guard_v1(q.recipient_email,q.company_domain,q.source,q.source_record_id,q.id);
    if not coalesce((v_guard->>'ok')::boolean,false) then
      return jsonb_build_object('ok',false,'reason',coalesce(v_guard->>'reason','global_communication_guard_blocked'),'global_guard',v_guard);
    end if;
    if d.contact_status not in ('found','verified') then
      return jsonb_build_object('ok',false,'reason','steel_buyer_contact_not_ready');
    end if;
    v_mode:=lower(coalesce(q.payload->>'approach_mode',''));
    if v_mode not in ('material_buyer','external_production_capacity','future_supplier_qualification','direct_offer','rfq_request') then
      return jsonb_build_object('ok',false,'reason','steel_buyer_outreach_mode_invalid','approach_mode',v_mode);
    end if;
    return jsonb_build_object('ok',true,'reason','steel_buyer_contact_draft_ready','approach_mode',v_mode,'recipient',lower(q.recipient_email));
  end if;

  select * into first_touch
  from public.pppp_outbound_queue_v1
  where source='DACH_STEEL_BUYER'
    and source_record_id=q.source_record_id
    and touch_no=1
    and lower(recipient_email)=lower(q.recipient_email)
  order by updated_at desc
  limit 1;
  if not found or first_touch.sent_at is null then
    return jsonb_build_object('ok',false,'reason','steel_buyer_followup_missing_first_send');
  end if;
  if first_touch.replied_at is not null or first_touch.status='replied' then
    return jsonb_build_object('ok',false,'reason','steel_buyer_followup_reply_exists');
  end if;
  if first_touch.sent_at > now()-interval '7 days' then
    return jsonb_build_object('ok',false,'reason','steel_buyer_followup_not_due');
  end if;
  if lower(coalesce(q.payload->>'outreach_motion','human_reviewed_followup')) <> 'human_reviewed_followup'
     and lower(coalesce(q.outreach_motion,'')) <> 'human_reviewed_followup' then
    return jsonb_build_object('ok',false,'reason','steel_buyer_followup_mode_invalid');
  end if;
  return jsonb_build_object('ok',true,'reason','steel_buyer_followup_draft_ready','recipient',lower(q.recipient_email),'first_sent_at',first_touch.sent_at);
end;
$function$;

revoke all on function public.pppp_outbound_source_guard_v1(uuid) from public,anon;
grant execute on function public.pppp_outbound_source_guard_v1(uuid) to authenticated,service_role,supabase_read_only_user;

create or replace view public.pppp_material_trade_followup_due_v1
with (security_invoker = true)
as
select
  q.id as first_queue_id,
  q.source_record_id as target_id,
  q.recipient_email,
  q.recipient_name,
  q.contact_role,
  q.company_name,
  q.sent_at,
  q.sent_at + interval '7 days' as followup_due_at
from public.pppp_outbound_queue_v1 q
join public.pppp_dach_steel_targets_v1 t on t.id=q.source_record_id
where q.source='DACH_STEEL_BUYER'
  and q.touch_no=1
  and q.sent_at is not null
  and q.replied_at is null
  and q.sent_at <= now()-interval '7 days'
  and t.target_status not in ('closed','rejected','project_promoted')
  and not exists (
    select 1 from public.pppp_outbound_queue_v1 f
    where f.source='DACH_STEEL_BUYER'
      and f.source_record_id=q.source_record_id
      and f.touch_no=2
      and lower(f.recipient_email)=lower(q.recipient_email)
  );

revoke all on public.pppp_material_trade_followup_due_v1 from anon;
grant select on public.pppp_material_trade_followup_due_v1 to authenticated,service_role;

comment on view public.pppp_material_trade_followup_due_v1 is
  'Read-only Steel Buyers follow-up candidates. Draft creation and sending always require explicit human action.';
