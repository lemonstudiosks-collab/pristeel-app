-- Only company-attributed contacts may enter the pilot queue.
create or replace view public.pppp_outreach_v2_pilot_queue_v1
with (security_invoker = true)
as
select w.*
from public.pppp_outreach_v2_workbench_v1 w
where w.outreach_engine_version='v2'
  and w.workflow_state='ready_for_outreach'
  and w.contact_quality_score >= 50
  and w.message_evidence_score >= 60
  and jsonb_array_length(coalesce(w.personalization_facts,'[]'::jsonb)) >= 2
  and w.last_contact_at is null
  and (
    w.source_type <> 'opportunity_action'
    or exists (
      select 1
      from public.pppp_opportunity_actions a
      join public.kek_tender_watch k on k.id=a.tender_watch_id
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(k.payload#>'{winner,contact_enrichment,organizations}')='array'
          then k.payload#>'{winner,contact_enrichment,organizations}' else '[]'::jsonb end
      ) org
      where a.id=w.source_id
        and lower(regexp_replace(coalesce(org->>'name',''),'[^a-z0-9]+','','g'))=
            lower(regexp_replace(coalesce(a.target_company,''),'[^a-z0-9]+','','g'))
        and lower(split_part(a.target_email,'@',2))=
            lower(coalesce(nullif(org->>'domain',''),regexp_replace(org->>'official_website','^https?://(www\.)?|/.*$','','g')))
    )
  )
order by w.outreach_readiness_score desc,w.company_fit_score desc
limit 25;

revoke all on public.pppp_outreach_v2_pilot_queue_v1 from public, anon;
grant select on public.pppp_outreach_v2_pilot_queue_v1 to authenticated, service_role;

