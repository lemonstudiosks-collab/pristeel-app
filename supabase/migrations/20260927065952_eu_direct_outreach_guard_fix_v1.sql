create or replace view public.pppp_eu_direct_operational_v1
with (security_invoker=true)
as
with base as (
  select
    t.id,'canonical'::text as record_origin,t.source_key,t.company_name,t.company_domain,t.company_domain_normalized,
    t.company_website,t.country,t.country_code,t.company_type,t.business_scope,t.why_relevant,t.evidence,t.source_name,
    t.source_url,t.discovery_source,t.stage,t.priority_score,t.contact_name,t.contact_role,t.contact_email,t.contact_source_url,
    t.contact_status,t.outreach_status,t.do_not_contact,t.gmail_draft_id,t.gmail_thread_id,t.last_contact_at,t.next_action,
    t.next_action_due,t.notes,t.last_verified_at,t.archived_at,t.archive_reason,t.created_at,t.updated_at
  from public.pppp_eu_direct_targets_v1 t
  union all
  select
    g.id,'historike_gc'::text,('legacy-gc:'||g.id::text)::text,g.company_name,
    public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url)),
    public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url)),
    g.website_url,g.country,g.country_code,
    case when lower(coalesce(g.company_type,'')) like '%gc%' or lower(coalesce(g.company_type,'')) like '%gu%' then 'gc_gu' else 'other_direct_client' end,
    array_remove(array[nullif(g.pristeel_offer_model,''),nullif(g.secondary_pristeel_offer_model,'')],null)::text[],
    coalesce(nullif(g.pristeel_offer_model,''),'Klient i drejtpërdrejtë për kapacitet dhe paketa çeliku të fabrikuar.'),
    g.evidence,g.discovery_source,g.source_url,g.discovery_source,
    case when g.replied_at is not null then 'replied'
         when g.first_sent_at is not null or g.second_sent_at is not null then 'contacted'
         when g.first_draft_id is not null or g.second_draft_id is not null then 'draft_ready'
         when nullif(g.contact_email,'') is not null then 'contact_ready' else 'verified' end,
    greatest(0,least(100,coalesce(g.relevance_score,0))),
    g.contact_name,g.contact_role,g.contact_email,g.contact_source_url,
    case when nullif(g.contact_email,'') is not null then 'verified' else 'unknown' end,
    case when g.replied_at is not null then 'replied'
         when g.first_sent_at is not null or g.second_sent_at is not null then 'contacted'
         when g.first_draft_id is not null or g.second_draft_id is not null then 'draft'
         else 'not_ready' end,
    g.do_not_contact,coalesce(g.second_draft_id,g.first_draft_id),g.first_gmail_thread_id,
    greatest(g.second_sent_at,g.first_sent_at,g.replied_at),null::text,g.followup_due_date,null::text,
    g.researched_at,null::timestamptz,null::text,g.first_discovered_at,g.updated_at
  from public.pppp_gc_prospects_v1 g
  where g.discovery_source='manual_web_verified_2026-09-22'
    and not exists (
      select 1 from public.pppp_eu_direct_targets_v1 t
      where t.archived_at is null
        and t.company_domain_normalized=public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url))
    )
),
flags as (
  select b.*,
    exists(select 1 from public.pppp_dach_steel_targets_v1 m
           where m.target_status<>'archived'
             and public.pppp_normalize_company_domain_v1(coalesce(m.company_domain,m.company_website))=b.company_domain_normalized) as in_material_trade,
    exists(select 1 from public.pppp_representation_targets_v1 r
           where r.archived_at is null and r.company_domain_normalized=b.company_domain_normalized) as in_representations,
    exists(select 1 from public.pppp_opportunity_company_profiles_v1 o
           where public.pppp_normalize_company_domain_v1(o.domain)=b.company_domain_normalized) as in_opportunities,
    exists(select 1 from public.pppp_outbound_queue_v1 q
           where (public.pppp_normalize_company_domain_v1(q.company_domain)=b.company_domain_normalized
               or split_part(lower(coalesce(q.recipient_email,'')),'@',2)=b.company_domain_normalized)
             and q.gmail_draft_id is not null and q.sent_at is null
             and coalesce(q.status,'') not in ('suppressed','closed')) as has_active_draft,
    greatest(
      (select max(q.sent_at) from public.pppp_outbound_queue_v1 q
       where public.pppp_normalize_company_domain_v1(q.company_domain)=b.company_domain_normalized
          or split_part(lower(coalesce(q.recipient_email,'')),'@',2)=b.company_domain_normalized),
      (select max(o.sent_at) from public.pppp_opportunity_outreach_registry_v1 o
       where split_part(lower(coalesce(o.recipient_email,'')),'@',2)=b.company_domain_normalized),
      b.last_contact_at
    ) as last_outbound_at,
    (select max(c.last_contact)::timestamptz from public.pppp_contact_master_v1 c
     where split_part(lower(coalesce(c.email,'')),'@',2)=b.company_domain_normalized
        or lower(btrim(coalesce(c.company,'')))=lower(btrim(b.company_name))) as contact_master_last_contact,
    exists(select 1 from public.pppp_contact_master_v1 c
           where split_part(lower(coalesce(c.email,'')),'@',2)=b.company_domain_normalized
              or lower(btrim(coalesce(c.company,'')))=lower(btrim(b.company_name))) as known_in_contact_master
  from base b
)
select f.*,
  array_remove(array[
    case when f.in_material_trade then 'material_trade' end,
    case when f.in_representations then 'representations' end,
    case when f.in_opportunities then 'opportunities' end
  ],null)::text[] as routing_conflicts,
  case
    when f.do_not_contact then 'blocked'
    when greatest(f.last_outbound_at,f.contact_master_last_contact) >= now()-interval '30 days' then 'cooldown_30d'
    when f.has_active_draft then 'existing_draft'
    when f.in_material_trade or f.in_representations or f.in_opportunities then 'routing_review'
    when greatest(f.last_outbound_at,f.contact_master_last_contact) is not null then 'contacted_before'
    else 'clear'
  end as outreach_guard,
  case when f.in_material_trade or f.in_representations or f.in_opportunities then 'review' else 'clear' end as routing_state
from flags f;

grant select on public.pppp_eu_direct_operational_v1 to authenticated;
