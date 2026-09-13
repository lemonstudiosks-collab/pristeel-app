-- PPPP project brief primary analysis hardening v1
-- Read-model only. Preserve the existing project brief JSON contract and grants.
-- Do not let a newer commercial/procurement dimension row with no narrative,
-- or an analysis older than the current canonical operational state, become the
-- project's displayed latest analysis.

create or replace function public.pppp_project_brief_v1(p_project_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog', 'public'
as $function$
select jsonb_build_object(
  'project',(select to_jsonb(p) from (
    select id,name,client,ref,business_ref,status,pipeline_stage,operational_state,
           origin_type,work_model,last_activity_at,last_email_at,updated_at
    from public.projects where id=p_project_id
  ) p),
  'open_tasks',coalesce((
    select jsonb_agg(to_jsonb(t) order by t.due_date asc nulls last,t.created_at desc)
    from (
      select id,title,left(coalesce(detail,''),1500) as detail,due_date,priority,status,source,category,contact_email,created_at
      from public.tasks x
      where x.project_id=p_project_id and x.status not in ('kryer','mbyllur','done','closed')
        and not (
          x.source='project_decision_auto'
          and exists (
            select 1 from public.tasks sw
            where sw.project_id=p_project_id and sw.source='supplier_wait_auto'
              and sw.status not in ('kryer','mbyllur','done','closed')
          )
        )
      order by due_date asc nulls last,created_at desc limit 10
    ) t
  ),'[]'::jsonb),
  'recent_emails',coalesce((
    select jsonb_agg(to_jsonb(e) order by e.sent_at desc)
    from (
      select gmail_message_id,gmail_thread_id,from_email,from_name,to_emails,cc_emails,subject,
             left(coalesce(snippet,''),2500) as snippet,sent_at,direction,has_attachments,gmail_url
      from public.project_emails
      where project_id=p_project_id
      order by sent_at desc limit 8
    ) e
  ),'[]'::jsonb),
  'contacts',coalesce((
    select jsonb_agg(to_jsonb(c) order by c.is_primary desc nulls last,c.email_count desc nulls last,c.last_seen desc nulls last)
    from (
      select id,name,email,company,role,source,is_primary,status,email_count,direct_count,cc_count,last_seen
      from public.project_contacts
      where project_id=p_project_id::text and coalesce(status,'active')<>'archived'
      order by is_primary desc nulls last,email_count desc nulls last,last_seen desc nulls last limit 15
    ) c
  ),'[]'::jsonb),
  'supplier_offers',coalesce((
    select jsonb_agg(to_jsonb(o) order by o.created_at desc)
    from (
      select id,supplier,offer_ref,currency,total_amount,total_eur,price_kg,qty_kg,delivery_weeks,
             incoterms,payment_terms,validity_days,left(coalesce(notes,''),1200) as notes,created_at
      from public.offers
      where project_id=p_project_id
        and coalesce(supplier,'') !~* '(oferta jone|our offer|pristeel)'
      order by created_at desc limit 12
    ) o
  ),'[]'::jsonb),
  'registered_client_offers',coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc)
    from (
      select id,doc_nr,client,currency,total_amount,total_eur,followup_status,last_followup_at,followup_count,created_at
      from public.documents_registry
      where project_id=p_project_id and upper(coalesce(series,''))='QUO'
      order by created_at desc limit 12
    ) q
  ),'[]'::jsonb),
  'sent_client_offer_emails',coalesce((
    select jsonb_agg(jsonb_build_object(
      'gmail_message_id',e.gmail_message_id,
      'subject',e.subject,
      'sent_at',e.sent_at,
      'to_emails',to_jsonb(e.to_emails),
      'gmail_url',e.gmail_url,
      'attachments',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',a.id,'name',a.attachment_name,'mime_type',a.attachment_mime_type,
          'size_bytes',a.attachment_size_bytes,'analysis_status',a.analysis_status,
          'drive_file_id',a.drive_file_id,'storage_backend',a.storage_backend
        ) order by a.id)
        from public.project_attachment_links a
        where a.project_id=p_project_id::text and a.gmail_message_id=e.gmail_message_id
          and coalesce(a.attachment_name,'') ~* '\.pdf$'
      ),'[]'::jsonb)
    ) order by e.sent_at desc)
    from (
      select gmail_message_id,subject,sent_at,to_emails,gmail_url
      from public.project_emails
      where project_id=p_project_id and direction='outgoing'
        and coalesce(subject,'') ~* '(angebot|offert|offer|quotation|ponuda)'
      order by sent_at desc limit 8
    ) e
  ),'[]'::jsonb),
  'document_status',jsonb_build_object(
    'linked_attachments',(select count(*) from public.project_attachment_links a where a.project_id=p_project_id::text),
    'analyzed_attachments',(select count(*) from public.project_attachment_links a where a.project_id=p_project_id::text and a.analysis_status='complete'),
    'pending_attachments',(select count(*) from public.project_attachment_links a where a.project_id=p_project_id::text and coalesce(a.analysis_status,'pending') in ('pending','queued','processing'))
  ),
  'latest_analysis',(
    select jsonb_build_object(
      'executive_summary',left(coalesce(a.analysis->>'executive_summary',''),3000),
      'current_stage',a.analysis->'current_stage','health',a.analysis->'health',
      'recommendation',a.analysis->'recommendation','next_actions',coalesce(a.analysis->'next_actions','[]'::jsonb),
      'risks',coalesce(a.analysis->'risks','[]'::jsonb),'missing_information',coalesce(a.analysis->'missing_information','[]'::jsonb),
      'created_at',a.created_at,'model',a.model
    )
    from public.project_analyses a
    where a.project_id=p_project_id::text
      and a.status='complete'
      and nullif(btrim(coalesce(a.analysis->>'executive_summary','')),'') is not null
      and a.created_at >= coalesce(
        (select p.operational_state_at from public.projects p where p.id=p_project_id),
        '-infinity'::timestamptz
      )
    order by a.created_at desc limit 1
  )
);
$function$;

revoke all on function public.pppp_project_brief_v1(uuid) from public, anon;
grant execute on function public.pppp_project_brief_v1(uuid) to authenticated, service_role;

comment on function public.pppp_project_brief_v1(uuid) is
  'PPPP project brief read model. latest_analysis is state-safe: summarized complete analyses only, never older than current operational_state_at.';
