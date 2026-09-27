-- One-time, deduplicated contact promotion from existing TED payload/contact evidence.
-- This migration creates no Gmail drafts and sends no email.

with candidates as (
  select distinct on (s.company_profile_id,c.email)
    s.company_profile_id,s.tender_watch_id,c.email,c.full_name,c.job_title,c.functional_role,
    c.source_type,c.source_url,c.confidence_score,c.payload
  from public.pppp_opportunity_company_assessments_v1 s
  cross join lateral public.pppp_ted_contact_candidates_v1(s.tender_watch_id)c
  where s.workflow_track='ted_award_outreach' and s.company_profile_id is not null
  order by s.company_profile_id,c.email,c.confidence_score desc,s.updated_at desc
)
insert into public.pppp_opportunity_contacts_v1(
  company_profile_id,tender_watch_id,email,full_name,job_title,functional_role,source_type,source_url,
  verification_status,confidence_score,draft_eligible,last_verified_at,payload,updated_at
)
select company_profile_id,tender_watch_id,email,full_name,job_title,functional_role,source_type,source_url,
       'verified',confidence_score,true,now(),payload,now()
from candidates
on conflict(company_profile_id,email) do update set
  tender_watch_id=excluded.tender_watch_id,
  full_name=coalesce(excluded.full_name,public.pppp_opportunity_contacts_v1.full_name),
  job_title=coalesce(excluded.job_title,public.pppp_opportunity_contacts_v1.job_title),
  functional_role=excluded.functional_role,
  source_type=coalesce(excluded.source_type,public.pppp_opportunity_contacts_v1.source_type),
  source_url=coalesce(excluded.source_url,public.pppp_opportunity_contacts_v1.source_url),
  verification_status=case when public.pppp_opportunity_contacts_v1.verification_status='rejected' then 'rejected' else 'verified' end,
  confidence_score=greatest(public.pppp_opportunity_contacts_v1.confidence_score,excluded.confidence_score),
  draft_eligible=case when public.pppp_opportunity_contacts_v1.do_not_contact then false else true end,
  last_verified_at=now(),
  payload=coalesce(public.pppp_opportunity_contacts_v1.payload,'{}'::jsonb)||excluded.payload,
  updated_at=now();

with best as (
  select distinct on (s.action_id) s.action_id,c.email,c.full_name,c.job_title
  from public.pppp_opportunity_company_assessments_v1 s
  join public.pppp_opportunity_contacts_v1 c
    on c.company_profile_id=s.company_profile_id
   and c.verification_status='verified'
   and c.draft_eligible=true
   and c.do_not_contact=false
  where s.workflow_track='ted_award_outreach'
  order by s.action_id,c.confidence_score desc,c.email
)
update public.pppp_opportunity_actions a
set target_email=coalesce(nullif(a.target_email,''),best.email),
    target_name=coalesce(nullif(a.target_name,''),best.full_name),
    target_role=coalesce(nullif(a.target_role,''),best.job_title),
    workflow_state=case when a.workflow_state='strong_company_contact_gap' then 'ready_for_outreach' else a.workflow_state end,
    payload=jsonb_set(coalesce(a.payload,'{}'::jsonb),'{outreach_readiness_v1}',
      coalesce(a.payload->'outreach_readiness_v1','{}'::jsonb)||jsonb_build_object('contact_identity_verified',true),true),
    updated_at=now()
from best
where a.id=best.action_id
  and (nullif(a.target_email,'') is null
    or a.workflow_state='strong_company_contact_gap'
    or coalesce((a.payload->'outreach_readiness_v1'->>'contact_identity_verified')::boolean,false)=false);
