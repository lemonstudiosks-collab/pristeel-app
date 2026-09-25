
begin;

alter table public.rfq_log
  add column if not exists tender_watch_id uuid references public.kek_tender_watch(id) on delete set null;

create index if not exists rfq_log_tender_supplier_idx
  on public.rfq_log (tender_watch_id, lower(supplier_name), created_at desc)
  where tender_watch_id is not null;

create or replace function public.pppp_supplier_rfq_gate_v2(
  p_project_id uuid,
  p_tender_watch_id uuid,
  p_supplier_name text,
  p_supplier_email text default null,
  p_rfq_mode text default 'firm'
)
returns jsonb
language plpgsql
stable
set search_path='public','pg_temp'
as $function$
declare
  v_project_gate jsonb;
  t public.kek_tender_watch%rowtype;
  pol public.pppp_procurement_source_policy%rowtype;
  h record;
  v_mode text:=lower(coalesce(nullif(trim(p_rfq_mode),''),'firm'));
  v_name text:=trim(coalesce(p_supplier_name,''));
  v_key text:=regexp_replace(lower(trim(coalesce(p_supplier_name,''))),'[^a-z0-9]+','','g');
  v_ready boolean:=false;
  v_allowed boolean:=false;
  v_reason text:='';
  v_warning text:=null;
  v_existing record;
begin
  if p_project_id is not null then
    v_project_gate:=public.pppp_supplier_rfq_gate_v1(p_project_id,p_supplier_name,p_supplier_email,p_rfq_mode);
    return v_project_gate || jsonb_build_object('context_type','project','tender_watch_id',p_tender_watch_id);
  end if;

  if p_tender_watch_id is null then
    return jsonb_build_object('allowed',false,'reason','qualified_project_or_direct_tender_required','human_send_required',true);
  end if;
  if v_name='' then return jsonb_build_object('allowed',false,'reason','supplier_required','human_send_required',true); end if;
  if v_mode not in ('budgetary','firm','requote') then
    return jsonb_build_object('allowed',false,'reason','invalid_rfq_mode','human_send_required',true);
  end if;

  select * into t from public.kek_tender_watch where id=p_tender_watch_id;
  if not found then return jsonb_build_object('allowed',false,'reason','tender_not_found','human_send_required',true); end if;

  select * into pol from public.pppp_procurement_source_policy where source=t.source_key;
  if not found or pol.participation_mode<>'bid' then
    return jsonb_build_object('allowed',false,'reason','source_not_direct_bid','source',t.source_key,
      'participation_mode',coalesce(pol.participation_mode,'unknown'),'human_send_required',true);
  end if;

  if lower(coalesce(t.status,'')) in ('ignored','rejected','closed','lost','awarded','archive','archived') then
    return jsonb_build_object('allowed',false,'reason','tender_not_active','status',t.status,'human_send_required',true);
  end if;
  if t.deadline is not null and t.deadline < current_date then
    return jsonb_build_object('allowed',false,'reason','tender_deadline_passed','deadline',t.deadline,'human_send_required',true);
  end if;
  if coalesce(t.relevance_score,0)<coalesce(pol.home_min_score,65) then
    return jsonb_build_object('allowed',false,'reason','tender_relevance_below_source_threshold',
      'relevance_score',t.relevance_score,'required_score',pol.home_min_score,'human_send_required',true);
  end if;

  v_ready :=
    lower(coalesce(t.payload->>'analysis_status',''))='ready'
    or coalesce((t.payload->>'dossier_complete')::boolean,false)
    or coalesce((t.payload#>>'{analysis,coverage,complete}')::boolean,false);

  if not v_ready then
    return jsonb_build_object('allowed',false,'reason','tender_dossier_not_ready','human_send_required',true);
  end if;

  select * into h
  from public.pppp_supplier_relationship_health_v1 x
  where regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')=v_key
     or (length(v_key)>=5 and regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g') like v_key||'%')
     or (length(regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g'))>=5
         and v_key like regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')||'%')
  order by case when regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')=v_key then 0 else 1 end
  limit 1;

  select r.id,r.created_at,r.sent_at,r.status into v_existing
  from public.rfq_log r
  where r.tender_watch_id=p_tender_watch_id
    and (regexp_replace(lower(coalesce(r.supplier_name,'')),'[^a-z0-9]+','','g')=v_key
      or (p_supplier_email is not null and lower(coalesce(r.supplier_email,''))=lower(p_supplier_email)))
    and lower(coalesce(r.status,'')) in ('planned','draft','draft_review','sent')
  order by coalesce(r.sent_at,r.created_at) desc limit 1;

  if v_existing.id is not null then
    return jsonb_build_object('allowed',false,'reason','supplier_rfq_already_registered_for_tender',
      'rfq_log_id',v_existing.id,'rfq_status',v_existing.status,'human_send_required',true);
  end if;

  if v_mode='budgetary' and coalesce(h.relationship_state,'')='fatigue_risk' then
    v_reason:='supplier_fatigue_blocks_budgetary_request';
  else
    v_allowed:=true;
    v_reason:=case when v_mode='budgetary' then 'qualified_direct_tender_budgetary_check'
                   when v_mode='requote' then 'qualified_direct_tender_requote'
                   else 'qualified_direct_tender_firm_rfq' end;
    if coalesce(h.relationship_state,'')='fatigue_risk' then
      v_warning:='supplier_fatigue_risk_use_only_if_scope_is_real_and_complete';
    elsif coalesce(h.relationship_state,'')='watch' then
      v_warning:='supplier_relationship_watch';
    end if;
  end if;

  return jsonb_build_object(
    'allowed',v_allowed,'reason',v_reason,'warning',v_warning,'context_type','direct_tender',
    'tender_watch_id',t.id,'source',t.source_key,'tender_title',t.title,'deadline',t.deadline,
    'relevance_score',t.relevance_score,'rfq_mode',v_mode,'supplier_name',v_name,
    'relationship_state',coalesce(h.relationship_state,'new_or_unmeasured'),
    'sent_rfqs',coalesce(h.sent_rfqs,0),'sent_rfqs_90d',coalesce(h.sent_rfqs_90d,0),
    'answered_rfqs',coalesce(h.answered_rfqs,0),'realized_orders',coalesce(h.realized_orders,0),
    'relationship_guidance',coalesce(h.relationship_guidance,'No measured sent-RFQ history.'),
    'human_send_required',true,'external_email_sent',false
  );
end;
$function$;

revoke all on function public.pppp_supplier_rfq_gate_v2(uuid,uuid,text,text,text) from public, anon;
grant execute on function public.pppp_supplier_rfq_gate_v2(uuid,uuid,text,text,text) to authenticated, service_role;

commit;
