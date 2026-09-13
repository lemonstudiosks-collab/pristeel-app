create or replace function public.pppp_chatgpt_supplier_intelligence_v1(
  p_requirement jsonb default '{}'::jsonb,
  p_project_id uuid default null,
  p_min_qualified integer default 3,
  p_threshold integer default 70,
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_min integer := greatest(1,least(coalesce(p_min_qualified,3),20));
  v_threshold integer := greatest(0,least(coalesce(p_threshold,70),100));
  v_limit integer := greatest(3,least(coalesce(p_limit,12),50));
  v_req record;
  v_req_json jsonb;
  v_req_analysis jsonb;
  v_requirements jsonb := '[]'::jsonb;
  v_requirement_count integer := 0;
  v_all_covered boolean := true;
  v_any_discovery boolean := false;
  v_total_strict_ready integer := 0;
  v_total_review_ready integer := 0;
  v_total_conflicts integer := 0;
  v_total_evidence_gaps integer := 0;
  v_project jsonb := null;
  v_offer_comparison jsonb := null;
  v_input_mode text := 'requirement';
begin
  if p_project_id is not null then
    select to_jsonb(p) into v_project
    from (
      select id,name,client,ref,business_ref,status,pipeline_stage,operational_state
      from public.projects where id=p_project_id
    ) p;

    if v_project is null then
      return jsonb_build_object(
        'supplier_intelligence_version',1,
        'read_only',true,
        'status','project_not_found',
        'project_id',p_project_id,
        'supplier_selection_allowed',false,
        'supplier_commitment_allowed',false,
        'external_email_send_allowed',false,
        'executions_performed',0
      );
    end if;
  end if;

  if coalesce(p_requirement,'{}'::jsonb) <> '{}'::jsonb then
    v_input_mode := case when p_project_id is null then 'requirement' else 'project_requirement_override' end;
    for v_req in select coalesce(public.pppp_supplier_family_v1(coalesce(p_requirement->>'family',p_requirement->>'product_type',p_requirement->>'description')),'unspecified') as family,
                        p_requirement as requirement
    loop
      v_req_json := v_req.requirement;
      v_requirement_count := v_requirement_count + 1;

      with raw as (
        select m.*,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'grades') || public.pppp_jsonb_text_array_v1(v_req_json->'grade')) > 0 as asks_grade,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'standards') || public.pppp_jsonb_text_array_v1(v_req_json->'standard')) > 0 as asks_standard,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'certifications') || public.pppp_jsonb_text_array_v1(v_req_json->'cert')) > 0 as asks_cert,
          coalesce((m.match_reasons->>'family_score')::int,0) family_score,
          coalesce((m.match_reasons->>'grade_score')::int,0) grade_score,
          coalesce((m.match_reasons->>'standard_score')::int,0) standard_score,
          coalesce((m.match_reasons->>'certificate_score')::int,0) certificate_score
        from public.pppp_supplier_match_v1(v_req_json,100,v_threshold) m
      ), classified as (
        select r.*,
          (
            r.qualified and not r.dimension_conflict and r.family_score>=25
            and (not r.asks_grade or r.grade_score>=11)
            and (not r.asks_standard or r.standard_score>=15)
            and (not r.asks_cert or r.certificate_score>=5)
          ) as strict_fit,
          (
            r.qualified and not r.dimension_conflict and r.family_score>=25
            and not (r.asks_grade and r.grade_score<0)
            and not (r.asks_standard and r.standard_score<0)
            and not (r.asks_cert and r.certificate_score<0)
          ) as review_fit,
          (
            r.dimension_conflict
            or (r.asks_grade and r.grade_score<0)
            or (r.asks_standard and r.standard_score<0)
            or (r.asks_cert and r.certificate_score<0)
          ) as explicit_conflict,
          (
            (r.asks_grade and r.grade_score>=0 and r.grade_score<11)
            or (r.asks_standard and r.standard_score>=0 and r.standard_score<15)
            or (r.asks_cert and r.certificate_score>=0 and r.certificate_score<5)
          ) as evidence_gap
        from raw r
      ), enriched as (
        select c.*,
          a.profile_status,a.capability_count,a.evidence_count,a.gmail_evidence_count,a.max_confidence,a.last_evidence_at,
          coalesce(oh.offer_count,0)::int offer_count,
          coalesce(rh.rfq_count,0)::int rfq_count,
          coalesce(rh.reply_count,0)::int reply_count
        from classified c
        left join public.pppp_supplier_master_audit_v1 a on a.partner_id=c.partner_id
        left join lateral (
          select count(*)::int offer_count from public.offers o where lower(trim(o.supplier))=lower(trim(c.partner_name))
        ) oh on true
        left join lateral (
          select count(*)::int rfq_count,
                 count(*) filter(where r.replied_at is not null or lower(coalesce(r.status,''))='replied')::int reply_count
          from public.rfq_log r where lower(trim(r.supplier_name))=lower(trim(c.partner_name))
        ) rh on true
      ), counts as (
        select
          count(*)::int matched,
          count(*) filter(where strict_fit)::int strict_fit_count,
          count(*) filter(where strict_fit and primary_email is not null)::int strict_rfq_ready,
          count(*) filter(where review_fit and not strict_fit)::int review_fit_count,
          count(*) filter(where review_fit and not strict_fit and primary_email is not null)::int review_rfq_ready,
          count(*) filter(where explicit_conflict)::int conflict_count,
          count(*) filter(where evidence_gap)::int evidence_gap_count,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='local')::int strict_local,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='regional')::int strict_regional,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='turkey')::int strict_turkey,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='greece')::int strict_greece,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='eu')::int strict_eu
        from enriched
      ), candidates as (
        select coalesce(jsonb_agg(jsonb_build_object(
          'partner_id',e.partner_id,
          'name',e.partner_name,
          'country',e.country,
          'city',e.city,
          'website',e.website,
          'business_type',e.business_type,
          'email',e.primary_email,
          'contact_language',e.contact_language,
          'match_score',e.match_score,
          'source_tier',e.source_tier,
          'strict_fit',e.strict_fit,
          'review_fit',e.review_fit,
          'rfq_ready',(e.strict_fit and e.primary_email is not null),
          'base_matcher_qualified',e.qualified,
          'dimension_conflict',e.dimension_conflict,
          'explicit_conflict',e.explicit_conflict,
          'evidence_gap',e.evidence_gap,
          'match_reasons',e.match_reasons,
          'profile_status',e.profile_status,
          'capability_count',coalesce(e.capability_count,0),
          'evidence_count',coalesce(e.evidence_count,0),
          'gmail_evidence_count',coalesce(e.gmail_evidence_count,0),
          'max_evidence_confidence',e.max_confidence,
          'last_evidence_at',e.last_evidence_at,
          'offer_history_count',e.offer_count,
          'rfq_history_count',e.rfq_count,
          'rfq_reply_count',e.reply_count,
          'selection_status','candidate_only'
        ) order by e.strict_fit desc,(e.primary_email is not null) desc,e.match_score desc,e.partner_name)
        filter(where rn<=v_limit),'[]'::jsonb) j
        from (
          select e.*,row_number() over(order by e.strict_fit desc,(e.primary_email is not null) desc,e.match_score desc,e.partner_name) rn
          from enriched e
        ) e
      )
      select jsonb_build_object(
        'family',v_req.family,
        'requirement',v_req_json,
        'threshold',v_threshold,
        'minimum_rfq_ready',v_min,
        'matched_existing',c.matched,
        'strict_fit_existing',c.strict_fit_count,
        'strict_rfq_ready_existing',c.strict_rfq_ready,
        'review_fit_existing',c.review_fit_count,
        'review_rfq_ready_existing',c.review_rfq_ready,
        'explicit_conflicts',c.conflict_count,
        'evidence_gaps',c.evidence_gap_count,
        'coverage_sufficient',(c.strict_rfq_ready>=v_min),
        'discovery_needed',(c.strict_rfq_ready<v_min),
        'next_external_search_tier',case when c.strict_rfq_ready>=v_min then 'complete' else 'local' end,
        'external_search_order',jsonb_build_array('local','regional','turkey','greece','eu'),
        'strict_rfq_ready_by_tier',jsonb_build_object('local',c.strict_local,'regional',c.strict_regional,'turkey',c.strict_turkey,'greece',c.strict_greece,'eu',c.strict_eu),
        'candidates',cand.j,
        'interpretation',jsonb_build_object(
          'strict_fit','All requested grade/standard/certificate evidence that is present in the requirement must be positively matched, dimensions must not conflict, and base matcher threshold must pass.',
          'review_fit','Base matcher passes and there is no explicit contradiction, but at least one requested technical attribute lacks positive evidence.',
          'explicit_conflict','A requested grade/standard/certificate or dimensional constraint conflicts with stored supplier capability evidence.',
          'candidate_only','A candidate is never an automatic supplier selection or commitment.'
        )
      ) into v_req_analysis
      from counts c cross join candidates cand;

      v_requirements := v_requirements || jsonb_build_array(v_req_analysis);
      v_all_covered := v_all_covered and coalesce((v_req_analysis->>'coverage_sufficient')::boolean,false);
      v_any_discovery := v_any_discovery or coalesce((v_req_analysis->>'discovery_needed')::boolean,false);
      v_total_strict_ready := v_total_strict_ready + coalesce((v_req_analysis->>'strict_rfq_ready_existing')::int,0);
      v_total_review_ready := v_total_review_ready + coalesce((v_req_analysis->>'review_rfq_ready_existing')::int,0);
      v_total_conflicts := v_total_conflicts + coalesce((v_req_analysis->>'explicit_conflicts')::int,0);
      v_total_evidence_gaps := v_total_evidence_gaps + coalesce((v_req_analysis->>'evidence_gaps')::int,0);
    end loop;
  elsif p_project_id is not null then
    v_input_mode := 'project_bom';
    for v_req in select family,requirement from public.pppp_project_procurement_requirements_v1(p_project_id)
    loop
      v_req_json := v_req.requirement;
      v_requirement_count := v_requirement_count + 1;

      with raw as (
        select m.*,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'grades') || public.pppp_jsonb_text_array_v1(v_req_json->'grade')) > 0 as asks_grade,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'standards') || public.pppp_jsonb_text_array_v1(v_req_json->'standard')) > 0 as asks_standard,
          cardinality(public.pppp_jsonb_text_array_v1(v_req_json->'certifications') || public.pppp_jsonb_text_array_v1(v_req_json->'cert')) > 0 as asks_cert,
          coalesce((m.match_reasons->>'family_score')::int,0) family_score,
          coalesce((m.match_reasons->>'grade_score')::int,0) grade_score,
          coalesce((m.match_reasons->>'standard_score')::int,0) standard_score,
          coalesce((m.match_reasons->>'certificate_score')::int,0) certificate_score
        from public.pppp_supplier_match_v1(v_req_json,100,v_threshold) m
      ), classified as (
        select r.*,
          (r.qualified and not r.dimension_conflict and r.family_score>=25
           and (not r.asks_grade or r.grade_score>=11)
           and (not r.asks_standard or r.standard_score>=15)
           and (not r.asks_cert or r.certificate_score>=5)) as strict_fit,
          (r.qualified and not r.dimension_conflict and r.family_score>=25
           and not (r.asks_grade and r.grade_score<0)
           and not (r.asks_standard and r.standard_score<0)
           and not (r.asks_cert and r.certificate_score<0)) as review_fit,
          (r.dimension_conflict or (r.asks_grade and r.grade_score<0) or (r.asks_standard and r.standard_score<0) or (r.asks_cert and r.certificate_score<0)) as explicit_conflict,
          ((r.asks_grade and r.grade_score>=0 and r.grade_score<11) or (r.asks_standard and r.standard_score>=0 and r.standard_score<15) or (r.asks_cert and r.certificate_score>=0 and r.certificate_score<5)) as evidence_gap
        from raw r
      ), enriched as (
        select c.*,
          a.profile_status,a.capability_count,a.evidence_count,a.gmail_evidence_count,a.max_confidence,a.last_evidence_at,
          coalesce(oh.offer_count,0)::int offer_count,
          coalesce(rh.rfq_count,0)::int rfq_count,
          coalesce(rh.reply_count,0)::int reply_count
        from classified c
        left join public.pppp_supplier_master_audit_v1 a on a.partner_id=c.partner_id
        left join lateral (select count(*)::int offer_count from public.offers o where lower(trim(o.supplier))=lower(trim(c.partner_name))) oh on true
        left join lateral (select count(*)::int rfq_count,count(*) filter(where r.replied_at is not null or lower(coalesce(r.status,''))='replied')::int reply_count from public.rfq_log r where lower(trim(r.supplier_name))=lower(trim(c.partner_name))) rh on true
      ), counts as (
        select count(*)::int matched,
          count(*) filter(where strict_fit)::int strict_fit_count,
          count(*) filter(where strict_fit and primary_email is not null)::int strict_rfq_ready,
          count(*) filter(where review_fit and not strict_fit)::int review_fit_count,
          count(*) filter(where review_fit and not strict_fit and primary_email is not null)::int review_rfq_ready,
          count(*) filter(where explicit_conflict)::int conflict_count,
          count(*) filter(where evidence_gap)::int evidence_gap_count,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='local')::int strict_local,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='regional')::int strict_regional,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='turkey')::int strict_turkey,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='greece')::int strict_greece,
          count(*) filter(where strict_fit and primary_email is not null and source_tier='eu')::int strict_eu
        from enriched
      ), candidates as (
        select coalesce(jsonb_agg(jsonb_build_object(
          'partner_id',e.partner_id,'name',e.partner_name,'country',e.country,'city',e.city,'website',e.website,'business_type',e.business_type,
          'email',e.primary_email,'contact_language',e.contact_language,'match_score',e.match_score,'source_tier',e.source_tier,
          'strict_fit',e.strict_fit,'review_fit',e.review_fit,'rfq_ready',(e.strict_fit and e.primary_email is not null),
          'base_matcher_qualified',e.qualified,'dimension_conflict',e.dimension_conflict,'explicit_conflict',e.explicit_conflict,'evidence_gap',e.evidence_gap,
          'match_reasons',e.match_reasons,'profile_status',e.profile_status,'capability_count',coalesce(e.capability_count,0),'evidence_count',coalesce(e.evidence_count,0),
          'gmail_evidence_count',coalesce(e.gmail_evidence_count,0),'max_evidence_confidence',e.max_confidence,'last_evidence_at',e.last_evidence_at,
          'offer_history_count',e.offer_count,'rfq_history_count',e.rfq_count,'rfq_reply_count',e.reply_count,'selection_status','candidate_only'
        ) order by e.strict_fit desc,(e.primary_email is not null) desc,e.match_score desc,e.partner_name) filter(where rn<=v_limit),'[]'::jsonb) j
        from (select e.*,row_number() over(order by e.strict_fit desc,(e.primary_email is not null) desc,e.match_score desc,e.partner_name) rn from enriched e) e
      )
      select jsonb_build_object(
        'family',v_req.family,'requirement',v_req_json,'threshold',v_threshold,'minimum_rfq_ready',v_min,
        'matched_existing',c.matched,'strict_fit_existing',c.strict_fit_count,'strict_rfq_ready_existing',c.strict_rfq_ready,
        'review_fit_existing',c.review_fit_count,'review_rfq_ready_existing',c.review_rfq_ready,'explicit_conflicts',c.conflict_count,'evidence_gaps',c.evidence_gap_count,
        'coverage_sufficient',(c.strict_rfq_ready>=v_min),'discovery_needed',(c.strict_rfq_ready<v_min),
        'next_external_search_tier',case when c.strict_rfq_ready>=v_min then 'complete' else 'local' end,
        'external_search_order',jsonb_build_array('local','regional','turkey','greece','eu'),
        'strict_rfq_ready_by_tier',jsonb_build_object('local',c.strict_local,'regional',c.strict_regional,'turkey',c.strict_turkey,'greece',c.strict_greece,'eu',c.strict_eu),
        'candidates',cand.j,
        'interpretation',jsonb_build_object(
          'strict_fit','All requested grade/standard/certificate evidence that is present in the requirement must be positively matched, dimensions must not conflict, and base matcher threshold must pass.',
          'review_fit','Base matcher passes and there is no explicit contradiction, but at least one requested technical attribute lacks positive evidence.',
          'explicit_conflict','A requested grade/standard/certificate or dimensional constraint conflicts with stored supplier capability evidence.',
          'candidate_only','A candidate is never an automatic supplier selection or commitment.'
        )
      ) into v_req_analysis from counts c cross join candidates cand;

      v_requirements := v_requirements || jsonb_build_array(v_req_analysis);
      v_all_covered := v_all_covered and coalesce((v_req_analysis->>'coverage_sufficient')::boolean,false);
      v_any_discovery := v_any_discovery or coalesce((v_req_analysis->>'discovery_needed')::boolean,false);
      v_total_strict_ready := v_total_strict_ready + coalesce((v_req_analysis->>'strict_rfq_ready_existing')::int,0);
      v_total_review_ready := v_total_review_ready + coalesce((v_req_analysis->>'review_rfq_ready_existing')::int,0);
      v_total_conflicts := v_total_conflicts + coalesce((v_req_analysis->>'explicit_conflicts')::int,0);
      v_total_evidence_gaps := v_total_evidence_gaps + coalesce((v_req_analysis->>'evidence_gaps')::int,0);
    end loop;
  else
    return jsonb_build_object(
      'supplier_intelligence_version',1,'read_only',true,'status','requirement_or_project_required',
      'supplier_selection_allowed',false,'supplier_commitment_allowed',false,'external_email_send_allowed',false,'executions_performed',0
    );
  end if;

  if p_project_id is not null then
    v_offer_comparison := public.pppp_chatgpt_supplier_comparison_v1(p_project_id);
  end if;

  return jsonb_build_object(
    'supplier_intelligence_version',1,
    'mode','read_only_synthesis',
    'input_mode',v_input_mode,
    'generated_at',now(),
    'project',v_project,
    'requirement_count',v_requirement_count,
    'all_requirements_covered',case when v_requirement_count=0 then false else v_all_covered end,
    'external_discovery_needed',case when v_requirement_count=0 then true else v_any_discovery end,
    'external_search_order',jsonb_build_array('local','regional','turkey','greece','eu'),
    'summary',jsonb_build_object(
      'requirements',v_requirement_count,
      'strict_rfq_ready_total',v_total_strict_ready,
      'review_rfq_ready_total',v_total_review_ready,
      'explicit_conflicts',v_total_conflicts,
      'evidence_gaps',v_total_evidence_gaps,
      'executions_performed',0
    ),
    'requirements',v_requirements,
    'project_offer_comparison',v_offer_comparison,
    'policy',jsonb_build_object(
      'read_only',true,
      'candidate_ranking_is_not_supplier_selection',true,
      'supplier_selection_allowed',false,
      'supplier_commitment_allowed',false,
      'external_email_send_allowed',false,
      'rfq_draft_preparation_allowed',true,
      'rfq_send_requires_explicit_human_approval',true,
      'supplier_selection_requires_explicit_human_approval',true,
      'external_discovery_is_recommendation_only',true,
      'no_discovery_request_created',true,
      'no_supplier_master_mutation',true,
      'no_offer_mutation',true,
      'no_rfq_mutation',true,
      'executions_performed',0
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer) to service_role, supabase_read_only_user;
