-- A historical acceptance fixture may link a trading project to a synthetic
-- tender-watch row. Business type is stronger evidence for this collision.
update public.projects
set workflow_type = 'steel_trading'
where workflow_type = 'self_tender'
  and lower(coalesce(business_type, '')) = 'trading'
  and coalesce(origin_type, '') <> 'tender';

-- Future direct-tender classification requires both canonical project origin
-- and a non-fixture linked tender record.
update public.projects p
set workflow_type = 'self_tender'
where p.workflow_type is null
  and p.origin_type = 'tender'
  and exists (
    select 1
    from public.kek_tender_watch k
    where k.project_id = p.id
      and coalesce(k.payload->>'notice_phase', 'opportunity') <> 'award'
      and coalesce(k.source_key, '') !~* '^acceptance:'
  );
