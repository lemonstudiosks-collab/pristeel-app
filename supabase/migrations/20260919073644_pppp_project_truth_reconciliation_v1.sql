-- PPPP project truth reconciliation v1.
-- Keeps current operator context and sent-offer evidence aligned across
-- project state, memory summary, Situation Intelligence and Project Detail.
-- No protected action is executed.

create or replace function public.pppp_project_memory_fingerprint_v2(p_project_id uuid)
returns text
language sql
stable
set search_path to 'pg_catalog','public'
as $fn$
select case
  when public.pppp_project_memory_fingerprint_v1(p_project_id) is null then null
  else md5(
    'project-memory-v2.1|primary-analysis-v1|commercial-context-counts-v1|' ||
    public.pppp_project_memory_fingerprint_v1(p_project_id)
  )
end;
$fn$;

create or replace function public.pppp_project_memory_payload_v2(p_project_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog','public'
as $fn$
with base as (
  select public.pppp_project_memory_payload_v1(p_project_id) as payload
),
primary_analysis as (
  select public.pppp_project_primary_analysis_v1(p_project_id) as analysis
),
context_evidence as (
  select
    count(*) filter (
      where fact_status='observed'
        and category='supplier_pricing'
    )::int as supplier_quote_facts,
    count(*) filter (
      where fact_status='observed'
        and category='commercial_offer'
        and lower(coalesce(value->>'status','')) in ('sent','derguar','dërguar')
    )::int as sent_client_offer_facts
  from public.pppp_project_context_current_v
  where project_id=p_project_id
),
shaped as (
  select
    b.payload,
    pa.analysis,
    coalesce((b.payload->'communication'->>'total_emails')::int,0) as email_total,
    coalesce((b.payload->'communication'->>'incoming')::int,0) as email_incoming,
    coalesce((b.payload->'communication'->>'outgoing')::int,0) as email_outgoing,
    jsonb_array_length(coalesce(b.payload->'contacts','[]'::jsonb)) as contact_total,
    greatest(
      jsonb_array_length(coalesce(b.payload->'supplier_offers','[]'::jsonb)),
      coalesce(ce.supplier_quote_facts,0)
    ) as supplier_offer_total,
    greatest(
      jsonb_array_length(coalesce(b.payload->'client_offers','[]'::jsonb)),
      coalesce(ce.sent_client_offer_facts,0)
    ) as client_offer_total,
    jsonb_array_length(coalesce(b.payload->'supplier_offers','[]'::jsonb)) as legacy_supplier_offer_total,
    jsonb_array_length(coalesce(b.payload->'client_offers','[]'::jsonb)) as legacy_client_offer_total,
    coalesce(ce.supplier_quote_facts,0) as supplier_quote_fact_total,
    coalesce(ce.sent_client_offer_facts,0) as sent_client_offer_fact_total,
    coalesce(b.payload->'project'->>'operational_state','pa gjendje') as operational_state,
    coalesce(b.payload->'project'->>'pipeline_stage','pa fazë') as pipeline_stage
  from base b
  cross join primary_analysis pa
  cross join context_evidence ce
)
select
  (s.payload - 'version' - 'source_fingerprint' - 'summary' - 'latest_analysis')
  || jsonb_build_object(
    'version',2,
    'memory_only',true,
    'action_required',false,
    'home_visible',false,
    'source_fingerprint',public.pppp_project_memory_fingerprint_v2(p_project_id),
    'primary_analysis_policy','summarized_and_not_older_than_operational_state_v1',
    'commercial_evidence',jsonb_build_object(
      'supplier_quote_evidence_count',s.supplier_offer_total,
      'client_offer_sent_evidence_count',s.client_offer_total,
      'legacy_supplier_offer_rows',s.legacy_supplier_offer_total,
      'legacy_client_offer_rows',s.legacy_client_offer_total,
      'supplier_pricing_context_facts',s.supplier_quote_fact_total,
      'sent_client_offer_context_facts',s.sent_client_offer_fact_total
    ),
    'summary',concat(
      'Memoria bazë e projektit: ',s.email_total,' email-e (',s.email_incoming,' hyrëse / ',s.email_outgoing,' dalëse), ',
      s.contact_total,' kontakte, ',s.supplier_offer_total,' oferta furnitorësh, ',s.client_offer_total,' oferta klienti. ',
      'Gjendja kanonike: ',s.operational_state,' / ',s.pipeline_stage,'.',
      case
        when nullif(coalesce(s.analysis->>'executive_summary',''),'') is not null
          then ' Analiza primare: '||left(s.analysis->>'executive_summary',900)
        else ''
      end
    ),
    'latest_analysis',s.analysis
  )
from shaped s;
$fn$;

create or replace function public.pppp_context_fact_project_truth_reconcile_v1()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $fn$
declare
  v_event_at timestamptz := coalesce(new.updated_at,new.created_at,clock_timestamp());
  v_current_state text;
  v_state_at timestamptz;
  v_status text;
  v_workflow_state text := lower(coalesce(new.value->>'workflow_state',''));
  v_action_text text := lower(coalesce(new.value->>'action_required',''));
begin
  if new.project_id is null or coalesce(new.fact_status,'')<>'observed' then
    return new;
  end if;

  select lower(coalesce(status,'')),lower(coalesce(operational_state,'')),operational_state_at
    into v_status,v_current_state,v_state_at
  from public.projects
  where id=new.project_id;

  if not found
     or v_status in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled','archived')
     or v_current_state in ('closed','execution')
  then
    return new;
  end if;

  if coalesce(new.value->>'source_sent_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then
    begin
      v_event_at := (new.value->>'source_sent_at')::timestamptz;
    exception when others then
      v_event_at := coalesce(new.updated_at,new.created_at,clock_timestamp());
    end;
  end if;

  if new.category='commercial_offer'
     and lower(coalesce(new.value->>'status','')) in ('sent','derguar','dërguar')
  then
    update public.projects
       set pipeline_stage=case
         when pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing','commercial')
           then 'client_offer'
         else pipeline_stage
       end,
       updated_at=clock_timestamp()
     where id=new.project_id;
  end if;

  if new.category='operator_update'
     and (v_state_at is null or v_event_at>=v_state_at)
  then
    if v_action_text in ('false','0','no') then
      update public.projects
         set operational_state=case
               when v_workflow_state in ('wait_for_client','waiting_for_client') then 'wait_for_client'
               else 'active_work'
             end,
             operational_state_at=v_event_at,
             operational_state_source='operator-update-context-v1',
             updated_at=clock_timestamp()
       where id=new.project_id;
    elsif v_action_text in ('true','1','yes') then
      update public.projects
         set operational_state='action_required',
             operational_state_at=v_event_at,
             operational_state_source='operator-update-context-v1',
             updated_at=clock_timestamp()
       where id=new.project_id;
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_pppp_context_fact_project_truth_reconcile_v1
  on public.pppp_project_context_facts;
create trigger trg_pppp_context_fact_project_truth_reconcile_v1
after insert or update of fact_status,value,category,updated_at
on public.pppp_project_context_facts
for each row
execute function public.pppp_context_fact_project_truth_reconcile_v1();

with sent_offer_projects as (
  select distinct project_id
  from public.pppp_project_context_current_v
  where fact_status='observed'
    and category='commercial_offer'
    and lower(coalesce(value->>'status','')) in ('sent','derguar','dërguar')
)
update public.projects p
set pipeline_stage='client_offer',
    updated_at=clock_timestamp()
from sent_offer_projects s
where p.id=s.project_id
  and p.pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing','commercial')
  and lower(coalesce(p.status,'')) not in
    ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled','archived');

with ranked as (
  select f.project_id,f.value,f.updated_at,
         row_number() over(partition by f.project_id order by f.updated_at desc,f.id desc) rn
  from public.pppp_project_context_current_v f
  where f.fact_status='observed' and f.category='operator_update'
),
latest as (
  select project_id,value,updated_at,
         case
           when coalesce(value->>'source_sent_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
             then (value->>'source_sent_at')::timestamptz
           else updated_at
         end event_at
  from ranked where rn=1
)
update public.projects p
set operational_state=case
      when lower(coalesce(l.value->>'action_required','')) in ('true','1','yes') then 'action_required'
      when lower(coalesce(l.value->>'workflow_state','')) in ('wait_for_client','waiting_for_client') then 'wait_for_client'
      else 'active_work'
    end,
    operational_state_at=l.event_at,
    operational_state_source='operator-update-context-v1',
    updated_at=clock_timestamp()
from latest l
where p.id=l.project_id
  and lower(coalesce(l.value->>'action_required','')) in ('true','1','yes','false','0','no')
  and lower(coalesce(p.status,'')) not in
    ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled','archived')
  and coalesce(p.operational_state,'') not in ('closed','execution')
  and (p.operational_state_at is null or l.event_at>=p.operational_state_at);

do $patch$
declare
  v_def text;
  v_new text;
  v_sig regprocedure := 'public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer)'::regprocedure;
begin
  v_def := pg_get_functiondef(v_sig);
  v_new := v_def;

  if strpos(v_new,'  v_summary text;')=0 then
    raise exception 'situation_patch_anchor_declaration_missing';
  end if;
  v_new := replace(v_new,
    '  v_summary text;',
    '  v_summary text;'||E'\n'||
    '  v_operator_fact jsonb := ''{}''::jsonb;'||E'\n'||
    '  v_operator_value jsonb := ''{}''::jsonb;'||E'\n'||
    '  v_operator_at timestamptz;'||E'\n'||
    '  v_operator_applies boolean := false;'||E'\n'||
    '  v_operator_no_action boolean := false;'||E'\n'||
    '  v_operator_requires_action boolean := false;'
  );

  if strpos(v_new,'  v_tasks := coalesce(v_snapshot->''workflow_tasks'',''[]''::jsonb);')=0 then
    raise exception 'situation_patch_anchor_tasks_missing';
  end if;
  v_new := replace(v_new,
    '  v_tasks := coalesce(v_snapshot->''workflow_tasks'',''[]''::jsonb);',
    '  v_tasks := coalesce(v_snapshot->''workflow_tasks'',''[]''::jsonb);'||E'\n\n'||
    '  select to_jsonb(q) into v_operator_fact'||E'\n'||
    '  from ('||E'\n'||
    '    select fact_key,value,updated_at,source_ref,evidence_status'||E'\n'||
    '    from public.pppp_project_context_current_v'||E'\n'||
    '    where project_id=p_project_id and category=''operator_update'' and fact_status=''observed'''||E'\n'||
    '    order by updated_at desc limit 1'||E'\n'||
    '  ) q;'||E'\n'||
    '  v_operator_fact := coalesce(v_operator_fact,''{}''::jsonb);'||E'\n'||
    '  v_operator_value := coalesce(v_operator_fact->''value'',''{}''::jsonb);'||E'\n'||
    '  v_operator_at := nullif(v_operator_fact->>''updated_at'','''')::timestamptz;'||E'\n'||
    '  if coalesce(v_operator_value->>''source_sent_at'','''') ~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}T'' then'||E'\n'||
    '    begin v_operator_at := (v_operator_value->>''source_sent_at'')::timestamptz; exception when others then null; end;'||E'\n'||
    '  end if;'
  );

  if strpos(v_new,'  v_status := lower(coalesce(v_project->>''status'',''''));')=0 then
    raise exception 'situation_patch_anchor_state_missing';
  end if;
  v_new := replace(v_new,
    '  v_status := lower(coalesce(v_project->>''status'',''''));',
    '  v_status := lower(coalesce(v_project->>''status'',''''));'||E'\n'||
    '  v_operator_applies := v_operator_fact<>''{}''::jsonb'||E'\n'||
    '    and v_project_state not in (''closed'',''mbyllur'',''execution'')'||E'\n'||
    '    and v_status not in (''humbur'',''mbyllur'',''closed'',''realizuar'',''lost'',''cancelled'',''canceled'',''archived'')'||E'\n'||
    '    and (nullif(v_project->>''operational_state_at'','''') is null'||E'\n'||
    '         or v_operator_at is null'||E'\n'||
    '         or v_operator_at>=nullif(v_project->>''operational_state_at'','''')::timestamptz);'||E'\n'||
    '  v_operator_no_action := v_operator_applies and lower(coalesce(v_operator_value->>''action_required'','''')) in (''false'',''0'',''no'');'||E'\n'||
    '  v_operator_requires_action := v_operator_applies and lower(coalesce(v_operator_value->>''action_required'','''')) in (''true'',''1'',''yes'');'
  );

  if strpos(v_new,'  if not v_suppressed_by_state then')=0 then
    raise exception 'situation_patch_anchor_risk_missing';
  end if;
  v_new := replace(v_new,
    '  if not v_suppressed_by_state then',
    '  if not v_suppressed_by_state and not v_operator_no_action then'
  );

  if strpos(v_new,'    + case when v_project_state=''action_required'' then 3 else 0 end;')=0 then
    raise exception 'situation_patch_anchor_state_risk_missing';
  end if;
  v_new := replace(v_new,
    '    + case when v_project_state=''action_required'' then 3 else 0 end;',
    '    + case when v_project_state=''action_required'' and not v_operator_no_action then 3 else 0 end;'
  );

  if strpos(v_new,'  if v_decision=''review_and_send_offer'' then')=0 then
    raise exception 'situation_patch_anchor_override_missing';
  end if;
  v_new := replace(v_new,
    '  if v_decision=''review_and_send_offer'' then',
    '  if v_operator_applies then'||E'\n'||
    '    if v_operator_no_action then'||E'\n'||
    '      v_situation_state := case when coalesce(v_operator_value->>''waiting_on'','''')<>'''' or lower(coalesce(v_operator_value->>''workflow_state'','''')) like ''wait%'' then ''waiting_external'' else ''active_work'' end;'||E'\n'||
    '      v_attention_required := false;'||E'\n'||
    '    elsif v_operator_requires_action then'||E'\n'||
    '      v_situation_state := ''action_required'';'||E'\n'||
    '      v_attention_required := true;'||E'\n'||
    '    end if;'||E'\n'||
    '  end if;'||E'\n\n'||
    '  if v_decision=''review_and_send_offer'' then'
  );

  if strpos(v_new,'  v_summary := coalesce(')=0 then
    raise exception 'situation_patch_anchor_summary_missing';
  end if;
  v_new := replace(v_new,
    '  v_summary := coalesce(',
    '  v_summary := coalesce('||E'\n'||
    '    case when v_operator_applies then nullif(coalesce(v_operator_value->>''summary'',v_operator_value->>''text''),'''') end,'
  );

  if strpos(v_new,'''recommendation'',case'||E'\n'||'      when v_recommendation<>''{}''::jsonb then v_recommendation')=0 then
    raise exception 'situation_patch_anchor_recommendation_missing';
  end if;
  v_new := replace(v_new,
    '''recommendation'',case'||E'\n'||'      when v_recommendation<>''{}''::jsonb then v_recommendation',
    '''recommendation'',case'||E'\n'||
    '      when v_operator_applies then jsonb_build_object('||E'\n'||
    '        ''decision'',case when v_operator_no_action then ''wait_for_external'' when v_operator_requires_action then ''review_current_action'' else ''review_operator_context'' end,'||E'\n'||
    '        ''label'',coalesce(nullif(v_operator_value->>''current_action'',''''),nullif(v_operator_value->>''next_action'',''''),''Rishiko kontekstin aktual''),'||E'\n'||
    '        ''reason'',coalesce(nullif(v_operator_value->>''summary'',''''),nullif(v_operator_value->>''text'',''''),''Operator update aktual në PPPP.''),'||E'\n'||
    '        ''source'',''operator_update'','||E'\n'||
    '        ''waiting_on'',nullif(v_operator_value->>''waiting_on'','''')'||E'\n'||
    '      )'||E'\n'||
    '      when v_recommendation<>''{}''::jsonb then v_recommendation'
  );

  if strpos(v_new,'''canonical_operational_state_at'',v_project->>''operational_state_at''')=0 then
    raise exception 'situation_patch_anchor_evidence_missing';
  end if;
  v_new := replace(v_new,
    '''canonical_operational_state_at'',v_project->>''operational_state_at''',
    '''canonical_operational_state_at'',v_project->>''operational_state_at'','||E'\n'||
    '      ''operator_update_applied'',v_operator_applies,'||E'\n'||
    '      ''operator_update_fact_key'',v_operator_fact->>''fact_key'','||E'\n'||
    '      ''operator_update_at'',v_operator_at'
  );

  execute v_new;
end
$patch$;

select public.pppp_project_memory_baseline_reconcile_v1(true,100);
select public.pppp_intelligence_snapshot_capture_v1('project_truth_reconciliation_v1');
