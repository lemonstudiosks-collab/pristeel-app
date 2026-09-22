
create or replace function public.pppp_ted_outreach_readiness_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  r public.pppp_opportunity_outreach_registry_v1%rowtype;
  a public.pppp_opportunity_actions%rowtype;
  t public.kek_tender_watch%rowtype;
  ready jsonb;
  winner_type text;
  angle text;
  recipient_domain text;
  verified_domain text;
  local_part text;
  self_risk text;
  contact_quality text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;
  if q.source <> 'TED' then return jsonb_build_object('ok',false,'reason','not_ted'); end if;
  if q.source_record_id is null then return jsonb_build_object('ok',false,'reason','ted_registry_identity_missing'); end if;

  select * into r from public.pppp_opportunity_outreach_registry_v1 where id=q.source_record_id;
  if not found then return jsonb_build_object('ok',false,'reason','ted_registry_missing'); end if;

  select * into a from public.pppp_opportunity_actions where id=r.action_id;
  if not found then return jsonb_build_object('ok',false,'reason','ted_action_missing'); end if;

  select * into t from public.kek_tender_watch where id=coalesce(r.tender_watch_id,a.tender_watch_id,q.tender_watch_id);
  if not found then return jsonb_build_object('ok',false,'reason','ted_tender_missing'); end if;

  winner_type:=lower(coalesce(nullif(t.payload #>> '{winner,company_type}',''),nullif(t.payload #>> '{winner,company_classification,company_type}',''),''));
  angle:=lower(coalesce(nullif(t.payload->>'cooperation_angle',''),''));

  if winner_type='' or winner_type='unknown' then return jsonb_build_object('ok',false,'reason','ted_winner_role_unverified','winner_company_type',winner_type); end if;
  if angle in ('verify_company_role','verify_supply_or_fabrication_role') then return jsonb_build_object('ok',false,'reason','ted_cooperation_role_requires_verification','cooperation_angle',angle); end if;

  ready:=coalesce(r.payload->'outreach_readiness_v1',a.payload->'outreach_readiness_v1',t.payload->'outreach_readiness_v1');
  if ready is null or jsonb_typeof(ready)<>'object' then return jsonb_build_object('ok',false,'reason','ted_readiness_evidence_missing'); end if;

  if coalesce((ready->>'winner_role_verified')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_winner_role_not_verified'); end if;
  if coalesce((ready->>'exact_lot_match')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_exact_lot_not_verified'); end if;
  if coalesce((ready->>'pristeel_scope_fit')::boolean,false) is not true or nullif(trim(coalesce(ready->>'pristeel_scope','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_pristeel_scope_not_concrete'); end if;
  if nullif(trim(coalesce(ready->>'scope_evidence','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_scope_evidence_missing'); end if;
  if coalesce((ready->>'contact_identity_verified')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_contact_identity_not_verified'); end if;
  if nullif(trim(coalesce(ready->>'buyer_function','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_buyer_function_missing'); end if;
  if nullif(trim(coalesce(ready->>'concrete_question','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_concrete_question_missing'); end if;
  if coalesce((ready->>'timing_fit')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_timing_not_fit'); end if;
  if coalesce((ready->>'previous_contact_guard')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_previous_contact_guard_missing'); end if;
  if coalesce((ready->>'bounce_suppression_guard')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_bounce_guard_missing'); end if;

  self_risk:=lower(coalesce(ready->>'self_perform_risk','unknown'));
  if self_risk='high' and coalesce((ready->>'outsourcing_evidence')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_self_perform_risk_high'); end if;
  if coalesce((ready->>'qualification_required')::boolean,false) and coalesce((ready->>'qualification_fit')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_qualification_not_verified'); end if;

  recipient_domain:=lower(split_part(coalesce(q.recipient_email,''),'@',2));
  verified_domain:=lower(regexp_replace(coalesce(ready->>'verified_company_domain',''),'^www\.','','i'));
  if verified_domain='' then return jsonb_build_object('ok',false,'reason','ted_verified_company_domain_missing'); end if;
  if recipient_domain<>verified_domain and recipient_domain not like '%.'||verified_domain and verified_domain not like '%.'||recipient_domain then
    return jsonb_build_object('ok',false,'reason','ted_contact_domain_company_mismatch','recipient_domain',recipient_domain,'verified_company_domain',verified_domain);
  end if;

  local_part:=lower(split_part(coalesce(q.recipient_email,''),'@',1));
  contact_quality:=lower(coalesce(ready->>'contact_quality',''));
  if local_part in ('info','office','contact','kontakt','mail','hello','post','service','sales') and contact_quality<>'generic_fallback_reviewed' then
    return jsonb_build_object('ok',false,'reason','ted_generic_contact_not_reviewed');
  end if;

  return jsonb_build_object(
    'ok',true,'reason','ted_manual_readiness_verified',
    'winner_company_type',winner_type,'cooperation_angle',angle,
    'pristeel_scope',ready->>'pristeel_scope','scope_evidence',ready->>'scope_evidence',
    'buyer_function',ready->>'buyer_function','contact_quality',contact_quality,
    'verified_company_domain',verified_domain,'self_perform_risk',self_risk,'readiness',ready
  );
end;
$$;

revoke all on function public.pppp_ted_outreach_readiness_v1(uuid) from public,anon;
grant execute on function public.pppp_ted_outreach_readiness_v1(uuid) to authenticated,service_role;

