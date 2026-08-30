create or replace function private.pppp_document_administrative_signal_v1(
  p_name text,
  p_subject text,
  p_text text default null
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $function$
  select lower(coalesce(p_name,'') || ' ' || coalesce(p_subject,'') || ' ' || left(coalesce(p_text,''),4000)) ~
    '(prilogistics|leternjoftim|identity[ -]?card|passport|statut(i|e)?([[:space:]]|$)|certifikat(a|e)?.{0,30}(biznes|business)|administrata.{0,20}tatim|tax.{0,20}(administration|certificate)|analiz(e|a).{0,20}financ|financial.{0,20}analysis|payroll|lista.{0,15}pagave|salary|bank.{0,15}statement|classification.{0,20}restricted|(^|[^a-z0-9])crk([^a-z0-9]|$).{0,20}(konsent|consent)|invoice|fatur(e|a)|payment.{0,20}(receipt|proof)|zahlung)';
$function$;

update public.tasks t
set status='mbyllur',done_at=coalesce(t.done_at,now())
from public.project_attachment_links a
left join public.project_emails e
  on e.gmail_message_id=a.gmail_message_id and e.project_id::text=a.project_id
where t.source='document_bom_review'
  and t.source_ref='ATTACHMENT:'||a.id::text
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and private.pppp_document_administrative_signal_v1(a.attachment_name,e.subject,a.extracted_text);

update public.project_attachment_links a
set bom_status='none',updated_at=now()
from public.project_emails e
where e.gmail_message_id=a.gmail_message_id
  and e.project_id::text=a.project_id
  and a.bom_applied_count=0
  and coalesce(jsonb_array_length(a.bom_candidates),0)=0
  and private.pppp_document_administrative_signal_v1(a.attachment_name,e.subject,a.extracted_text)
  and a.bom_status='review';