begin;

-- Private receipt inbox. Original receipt images/PDFs are kept outside the legacy
-- expenses.file_base64 column so the finance table stays light and auditable.
create table if not exists public.pppp_expense_receipts_v1 (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('camera','upload','drive')),
  source_ref text,
  drive_file_id text,
  drive_file_url text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  content_sha256 text,
  storage_bucket text not null default 'expense-receipts',
  storage_path text not null,
  status text not null default 'needs_ocr' check (status in ('needs_ocr','ocr_queued','ocr_processing','review','confirmed','duplicate','failed','no_text','ignored')),
  ocr_text text,
  ocr_metadata jsonb not null default '{}'::jsonb,
  parsed_data jsonb not null default '{}'::jsonb,
  supplier text,
  invoice_nr text,
  expense_date date,
  category text,
  amount numeric,
  net_amount numeric,
  vat_rate numeric,
  vat_amount numeric,
  currency text default 'EUR',
  project_id uuid references public.projects(id) on delete set null,
  vehicle_plate text,
  quantity numeric,
  unit text,
  unit_price numeric,
  confidence numeric,
  review_fields jsonb not null default '[]'::jsonb,
  expense_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists pppp_expense_receipts_sha_unique
  on public.pppp_expense_receipts_v1(lower(content_sha256)) where nullif(btrim(content_sha256),'') is not null;
create unique index if not exists pppp_expense_receipts_drive_file_unique
  on public.pppp_expense_receipts_v1(drive_file_id) where drive_file_id is not null;
create index if not exists pppp_expense_receipts_status_idx
  on public.pppp_expense_receipts_v1(status,created_at desc);

alter table public.pppp_expense_receipts_v1 enable row level security;
drop policy if exists pppp_expense_receipts_read_auth on public.pppp_expense_receipts_v1;
create policy pppp_expense_receipts_read_auth on public.pppp_expense_receipts_v1
  for select to authenticated using (true);
revoke insert,update,delete on public.pppp_expense_receipts_v1 from authenticated,anon;
grant select on public.pppp_expense_receipts_v1 to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_expense_receipts_v1 to supabase_read_only_user;
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('expense-receipts','expense-receipts',false,20971520,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Backward-compatible optional accounting detail on confirmed operating expenses.
alter table public.expenses add column if not exists receipt_id uuid references public.pppp_expense_receipts_v1(id) on delete set null;
alter table public.expenses add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.expenses add column if not exists vehicle_plate text;
alter table public.expenses add column if not exists quantity numeric;
alter table public.expenses add column if not exists unit text;
alter table public.expenses add column if not exists unit_price numeric;
create unique index if not exists expenses_receipt_id_unique on public.expenses(receipt_id) where receipt_id is not null;

-- Extend the existing Mac-mini OCR queue without changing its public claim shape.
alter table public.local_ocr_jobs alter column attachment_link_id drop not null;
alter table public.local_ocr_jobs add column if not exists expense_receipt_id uuid references public.pppp_expense_receipts_v1(id) on delete cascade;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='local_ocr_jobs_one_source_chk' and conrelid='public.local_ocr_jobs'::regclass) then
    alter table public.local_ocr_jobs add constraint local_ocr_jobs_one_source_chk
      check ((attachment_link_id is not null)::integer + (expense_receipt_id is not null)::integer = 1);
  end if;
end $$;
create unique index if not exists local_ocr_jobs_one_active_per_receipt_idx
  on public.local_ocr_jobs(expense_receipt_id) where expense_receipt_id is not null and status in ('queued','processing');

create or replace function public.pppp_receipt_money_v1(p_raw text)
returns numeric
language plpgsql
immutable
set search_path=pg_catalog
as $$
declare s text:=regexp_replace(coalesce(p_raw,''),'[^0-9,.-]','','g'); lc integer; ld integer; begin
  if s='' then return null; end if;
  lc:=length(s)-length(replace(s,',',''));
  ld:=length(s)-length(replace(s,'.',''));
  if position(',' in s)>0 and position('.' in s)>0 then
    if strpos(reverse(s),',') < strpos(reverse(s),'.') then s:=replace(replace(s,'.',''),',','.');
    else s:=replace(s,',',''); end if;
  elsif position(',' in s)>0 then s:=replace(s,',','.');
  elsif ld>1 then s:=replace(s,'.','');
  end if;
  begin return s::numeric; exception when others then return null; end;
end;$$;

create or replace function public.pppp_parse_expense_receipt_text_v1(p_text text)
returns jsonb
language plpgsql
stable
set search_path=pg_catalog,public
as $$
declare
  t text:=coalesce(p_text,''); l text:=lower(coalesce(p_text,''));
  m text[]; v_date date; v_supplier text; v_invoice text; v_cat text:='tjera'; v_currency text:='EUR';
  v_total numeric; v_net numeric; v_vat numeric; v_rate numeric; v_qty numeric; v_unit_price numeric;
  v_conf integer:=0; v_review text[]:=array[]::text[];
begin
  m:=regexp_match(t,'([0-3]?[0-9])[./-]([01]?[0-9])[./-](20[0-9]{2})');
  if m is not null then begin v_date:=make_date(m[3]::int,m[2]::int,m[1]::int); exception when others then v_date:=null; end; end if;
  if v_date is null then
    m:=regexp_match(t,'(20[0-9]{2})[./-]([01]?[0-9])[./-]([0-3]?[0-9])');
    if m is not null then begin v_date:=make_date(m[1]::int,m[2]::int,m[3]::int); exception when others then v_date:=null; end; end if;
  end if;

  m:=regexp_match(t,'(?i)(?:grand[[:space:]]+total|total|totali|gesamt|summe|ukupno|za[[:space:]]+platiti|p[eë]r[[:space:]]+pages[eë])[^0-9]{0,24}([0-9][0-9 .]*[,.][0-9]{2})');
  if m is not null then v_total:=public.pppp_receipt_money_v1(m[1]); end if;
  if v_total is null then
    select max(public.pppp_receipt_money_v1(x[1])) into v_total
    from regexp_matches(t,'([0-9][0-9 .]*[,.][0-9]{2})','g') x;
  end if;

  m:=regexp_match(t,'(?i)(?:netto|neto|net|subtotal|osnovica|pa[[:space:]]+tvsh)[^0-9]{0,24}([0-9][0-9 .]*[,.][0-9]{2})');
  if m is not null then v_net:=public.pppp_receipt_money_v1(m[1]); end if;
  m:=regexp_match(t,'(?i)(?:tvsh|pdv|mwst|ust|vat)[^0-9]{0,32}([0-9][0-9 .]*[,.][0-9]{2})');
  if m is not null then v_vat:=public.pppp_receipt_money_v1(m[1]); end if;
  m:=regexp_match(t,'(?i)(?:tvsh|pdv|mwst|ust|vat)[^0-9%]{0,20}([0-9]{1,2}(?:[,.][0-9]+)?)[[:space:]]*%');
  if m is not null then v_rate:=public.pppp_receipt_money_v1(m[1]); end if;
  if v_net is null and v_total is not null and v_vat is not null and v_total>=v_vat then v_net:=v_total-v_vat; end if;
  if v_vat is null and v_total is not null and v_net is not null and v_total>=v_net then v_vat:=v_total-v_net; end if;

  m:=regexp_match(t,'(?i)(?:invoice|fatura|fatur[eë]|ra[cč]un|rechnung|beleg|receipt)[[:space:]#:.-]{0,12}([A-Z0-9][A-Z0-9/_-]{2,30})');
  if m is not null then v_invoice:=btrim(m[1]); end if;

  select btrim(x) into v_supplier
  from regexp_split_to_table(t,E'\\n') x
  where length(btrim(x)) between 3 and 100
    and btrim(x) !~ '^[0-9[:space:][:punct:]]+$'
    and lower(btrim(x)) !~ '^(fiscal|fiskal|receipt|rechnung|invoice|fatura|racun|račun|total|totali|datum|date|tax|vat|tvsh|pdv|mwst)'
  limit 1;

  if l ~ '(diesel|benzin|benzine|petrol|fuel|gorivo|naft[eë]|eurodiesel|euro diesel)' then v_cat:='nafta';
  elsif l ~ '(restaurant|restoran|restorant|pizzeria|grill|cafe|coffee|ushqim|food)' then v_cat:='restorant';
  elsif l ~ '(hotel|motel|accommodation|unterkunft|smje[sš]taj)' then v_cat:='hotel';
  elsif l ~ '(parking|parkplatz|parkir)' then v_cat:='parking';
  elsif l ~ '(maut|toll|cestarina|autoput|autostrada)' then v_cat:='rruge';
  elsif l ~ '(telefon|mobile|telekom|internet)' then v_cat:='telefoni';
  elsif l ~ '(miete|qira|rent)' then v_cat:='qiraja';
  elsif l ~ '(strom|electric|rrym)' then v_cat:='rryma';
  elsif l ~ '(wasser|water|uji)' then v_cat:='uji'; end if;

  if l ~ '(chf)' then v_currency:='CHF'; elsif l ~ '(gbp|£)' then v_currency:='GBP'; elsif l ~ '(usd|\$)' then v_currency:='USD'; else v_currency:='EUR'; end if;

  if v_cat='nafta' then
    m:=regexp_match(l,'([0-9]+[,.][0-9]+)[[:space:]]*(?:l|ltr|liter|litre|litra)');
    if m is not null then v_qty:=public.pppp_receipt_money_v1(m[1]); end if;
    m:=regexp_match(l,'(?:price|preis|cijena|cena|cmim|çmim)[^0-9]{0,12}([0-9]+[,.][0-9]{2,3})');
    if m is not null then v_unit_price:=public.pppp_receipt_money_v1(m[1]); end if;
    if v_unit_price is null and v_qty is not null and v_qty>0 and v_total is not null then v_unit_price:=round(v_total/v_qty,3); end if;
  end if;

  if v_total is not null and v_total>0 then v_conf:=v_conf+30; else v_review:=array_append(v_review,'amount'); end if;
  if v_date is not null then v_conf:=v_conf+20; else v_review:=array_append(v_review,'date'); end if;
  if nullif(v_supplier,'') is not null then v_conf:=v_conf+20; else v_review:=array_append(v_review,'supplier'); end if;
  if nullif(v_invoice,'') is not null then v_conf:=v_conf+8; end if;
  if v_vat is not null or v_net is not null then v_conf:=v_conf+10; end if;
  if v_cat<>'tjera' then v_conf:=v_conf+12; else v_review:=array_append(v_review,'category'); end if;

  return jsonb_build_object(
    'supplier',v_supplier,'invoice_nr',v_invoice,'date',v_date,'category',v_cat,
    'amount',v_total,'net_amount',v_net,'vat_rate',v_rate,'vat_amount',v_vat,'currency',v_currency,
    'quantity',v_qty,'unit',case when v_qty is not null then 'L' else null end,'unit_price',v_unit_price,
    'confidence',least(100,v_conf),'review_fields',to_jsonb(v_review)
  );
end;$$;

create or replace function public.pppp_apply_expense_receipt_ocr_v1(p_receipt_id uuid,p_text text,p_metadata jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare j jsonb; begin
  if nullif(btrim(coalesce(p_text,'')),'') is null then return false; end if;
  j:=public.pppp_parse_expense_receipt_text_v1(p_text);
  update public.pppp_expense_receipts_v1
     set ocr_text=left(p_text,120000),ocr_metadata=coalesce(p_metadata,'{}'::jsonb),parsed_data=j,
         supplier=nullif(j->>'supplier',''),invoice_nr=nullif(j->>'invoice_nr',''),
         expense_date=nullif(j->>'date','')::date,category=coalesce(nullif(j->>'category',''),'tjera'),
         amount=nullif(j->>'amount','')::numeric,net_amount=nullif(j->>'net_amount','')::numeric,
         vat_rate=nullif(j->>'vat_rate','')::numeric,vat_amount=nullif(j->>'vat_amount','')::numeric,
         currency=coalesce(nullif(j->>'currency',''),'EUR'),quantity=nullif(j->>'quantity','')::numeric,
         unit=nullif(j->>'unit',''),unit_price=nullif(j->>'unit_price','')::numeric,
         confidence=coalesce((j->>'confidence')::numeric,0),review_fields=coalesce(j->'review_fields','[]'::jsonb),
         status='review',last_error=null,updated_at=now()
   where id=p_receipt_id and status not in ('confirmed','ignored','duplicate');
  return found;
end;$$;
revoke all on function public.pppp_apply_expense_receipt_ocr_v1(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.pppp_apply_expense_receipt_ocr_v1(uuid,text,jsonb) to service_role;

create or replace function public.local_ocr_enqueue_expense_receipt_v1(p_receipt_id uuid)
returns bigint
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r record; v_job bigint; begin
  select id,status,mime_type,file_name,storage_path into r from public.pppp_expense_receipts_v1 where id=p_receipt_id for update;
  if not found or r.status in ('confirmed','ignored','duplicate') or nullif(btrim(coalesce(r.storage_path,'')),'') is null then return null; end if;
  if not (coalesce(r.mime_type,'') ilike 'image/%' or lower(coalesce(r.mime_type,''))='application/pdf' or lower(coalesce(r.file_name,'')) ~ '\\.(pdf|png|jpe?g|webp|heic|heif|tiff?|bmp)$') then return null; end if;
  select id into v_job from public.local_ocr_jobs where expense_receipt_id=p_receipt_id and status in ('queued','processing') order by id desc limit 1;
  if v_job is null then
    begin insert into public.local_ocr_jobs(expense_receipt_id,status) values(p_receipt_id,'queued') returning id into v_job;
    exception when unique_violation then select id into v_job from public.local_ocr_jobs where expense_receipt_id=p_receipt_id and status in ('queued','processing') order by id desc limit 1; end;
  end if;
  update public.pppp_expense_receipts_v1 set status='ocr_queued',updated_at=now(),last_error=null where id=p_receipt_id and status not in ('confirmed','ignored','duplicate');
  return v_job;
end;$$;
revoke all on function public.local_ocr_enqueue_expense_receipt_v1(uuid) from public,anon,authenticated;
grant execute on function public.local_ocr_enqueue_expense_receipt_v1(uuid) to service_role;

-- Same result columns as v1, so the already-running Mac mini worker remains compatible.
create or replace function public.local_ocr_claim_job(p_worker_id text)
returns table(job_id bigint, attachment_link_id bigint, attachment_name text, attachment_mime_type text, storage_bucket text, storage_path text, content_sha256 text, project_id text)
language plpgsql
security definer
set search_path=public
as $$
declare v_job_id bigint; begin
  update public.local_ocr_jobs set status='queued',worker_id=null,claimed_at=null,heartbeat_at=null,updated_at=now(),
    error=case when error is null or error='' then 'Automatically requeued after stale processing lease.' else error||E'\\nAutomatically requeued after stale processing lease.' end
  where status='processing' and coalesce(heartbeat_at,claimed_at,updated_at)<now()-interval '30 minutes';

  select j.id into v_job_id from public.local_ocr_jobs j where j.status='queued' order by j.created_at,j.id for update skip locked limit 1;
  if v_job_id is null then return; end if;
  update public.local_ocr_jobs set status='processing',worker_id=p_worker_id,attempt_count=attempt_count+1,claimed_at=now(),heartbeat_at=now(),updated_at=now(),error=null where id=v_job_id;
  update public.pppp_expense_receipts_v1 r set status='ocr_processing',updated_at=now() from public.local_ocr_jobs j where j.id=v_job_id and j.expense_receipt_id=r.id;

  return query
  select j.id,j.attachment_link_id,
         coalesce(a.attachment_name,r.file_name),coalesce(a.attachment_mime_type,r.mime_type),
         coalesce(a.storage_bucket,r.storage_bucket,'project-source-files'),coalesce(a.storage_path,r.storage_path),
         coalesce(a.content_sha256,r.content_sha256),a.project_id::text
  from public.local_ocr_jobs j
  left join public.project_attachment_links a on a.id=j.attachment_link_id
  left join public.pppp_expense_receipts_v1 r on r.id=j.expense_receipt_id
  where j.id=v_job_id;
end;$$;

create or replace function public.local_ocr_apply_completed_job(p_job_id bigint)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare j record; src_hash text; job_hash text; proj_name text; begin
  select q.id as job_id,q.attachment_link_id,q.expense_receipt_id,q.status as job_status,q.result_text,q.result_metadata,q.completed_at,
         a.project_id,a.attachment_name,a.attachment_mime_type,a.content_sha256,a.analysis_status,a.analysis_method,a.extracted_data,
         r.content_sha256 as receipt_sha
  into j from public.local_ocr_jobs q
  left join public.project_attachment_links a on a.id=q.attachment_link_id
  left join public.pppp_expense_receipts_v1 r on r.id=q.expense_receipt_id
  where q.id=p_job_id;
  if not found or j.job_status<>'completed' or nullif(btrim(coalesce(j.result_text,'')),'') is null then return false; end if;

  if j.expense_receipt_id is not null then
    src_hash:=lower(coalesce(j.receipt_sha,'')); job_hash:=lower(coalesce(j.result_metadata->>'source_sha256',''));
    if src_hash<>'' and (job_hash='' or job_hash<>src_hash) then raise exception 'local OCR source SHA mismatch for expense receipt %',j.expense_receipt_id; end if;
    return public.pppp_apply_expense_receipt_ocr_v1(j.expense_receipt_id,j.result_text,coalesce(j.result_metadata,'{}'::jsonb));
  end if;

  if j.analysis_status='analyzed' and coalesce(j.analysis_method,'') not like 'local-tesseract%' then return false; end if;
  src_hash:=lower(coalesce(j.content_sha256,'')); job_hash:=lower(coalesce(j.result_metadata->>'source_sha256',''));
  if src_hash<>'' and (job_hash='' or job_hash<>src_hash) then raise exception 'local OCR source SHA mismatch for attachment %',j.attachment_link_id; end if;
  select p.name into proj_name from public.projects p where p.id::text=j.project_id::text limit 1;
  update public.project_attachment_links set analysis_status='analyzed',analysis_method='local-tesseract-ocr-v1',extracted_text=left(j.result_text,120000),
    extracted_data=coalesce(j.extracted_data,'{}'::jsonb)||jsonb_build_object('file_name',j.attachment_name,'mime_type',j.attachment_mime_type,'trust_tier','ocr','local_ocr_job_id',j.job_id,'ocr_metadata',coalesce(j.result_metadata,'{}'::jsonb),'source_sha256',nullif(src_hash,'')),
    analysis_confidence=null,analysis_error=null,analyzed_at=coalesce(j.completed_at,now()),bom_status='review',bom_candidates='[]'::jsonb,bom_applied_count=0,updated_at=now()
  where id=j.attachment_link_id;
  insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
  values(j.project_id::uuid,'Rishiko dokumentin teknik: '||coalesce(j.attachment_name,'attachment'),
    'OCR lokal u perfundua me sukses dhe teksti eshte i gatshem per Project Intelligence. Burimi eshte OCR, prandaj asnje pozicion BOM nuk shkruhet automatikisht vetem nga ky rezultat.'||E'\\n'||
    'Project: '||coalesce(proj_name,j.project_id::text)||E'\\n'||'Attachment link #'||j.attachment_link_id::text||E'\\n'||'Local OCR job #'||j.job_id::text,
    current_date,'larte','hapur','document_bom_review','ATTACHMENT:'||j.attachment_link_id::text,'intern')
  on conflict(source,source_ref) do update set title=excluded.title,detail=excluded.detail,priority=excluded.priority,category=excluded.category;
  return true;
end;$$;

create or replace function public.local_ocr_fail_job(p_worker_id text,p_job_id bigint,p_error text)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare a record; v_expected_no_text boolean:=false; v_is_image boolean:=false; v_is_tiny_word_artifact boolean:=false; begin
  select coalesce(l.attachment_name,r.file_name) as name,coalesce(l.attachment_mime_type,r.mime_type) as mime,
         l.attachment_size_bytes,j.expense_receipt_id
  into a from public.local_ocr_jobs j
  left join public.project_attachment_links l on l.id=j.attachment_link_id
  left join public.pppp_expense_receipts_v1 r on r.id=j.expense_receipt_id
  where j.id=p_job_id and j.worker_id=p_worker_id and j.status='processing';
  if found then
    v_is_image:=coalesce(a.mime,'') ilike 'image/%' or coalesce(a.name,'') ~* '\\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif)$';
    v_is_tiny_word_artifact:=coalesce(a.attachment_size_bytes,0)<=4096 and coalesce(a.name,'') ~* '^~WRD.*\\.(jpe?g|png|gif|bmp)$';
    v_expected_no_text:=(lower(btrim(coalesce(p_error,''))) in ('ocr_empty','ocr text is empty') or lower(coalesce(p_error,'')) like '%ocr text is empty%') and (v_is_image or v_is_tiny_word_artifact);
  end if;
  update public.local_ocr_jobs set status=case when v_expected_no_text then 'no_text' else 'failed' end,
    error=left(coalesce(p_error,'Worker reported failure'),4000),completed_at=case when v_expected_no_text then now() else completed_at end,heartbeat_at=now(),updated_at=now()
  where id=p_job_id and worker_id=p_worker_id and status='processing';
  return found;
end;$$;

create or replace function public.local_ocr_failed_job_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; proj_name text; begin
  if new.status<>'failed' or old.status is not distinct from new.status then return new; end if;
  if new.expense_receipt_id is not null then
    update public.pppp_expense_receipts_v1 set status='failed',last_error=left(coalesce(new.error,'Local OCR worker failed.'),2000),updated_at=now() where id=new.expense_receipt_id and status not in ('confirmed','ignored','duplicate');
    return new;
  end if;
  select id,project_id,attachment_name into a from public.project_attachment_links where id=new.attachment_link_id;
  if not found then return new; end if;
  select name into proj_name from public.projects where id::text=a.project_id::text limit 1;
  update public.project_attachment_links set analysis_status='local_ocr_failed',analysis_method='local-tesseract-ocr-v1',analysis_error=left(coalesce(new.error,'Local OCR worker failed.'),2000),bom_status='review',bom_applied_count=0,updated_at=now() where id=new.attachment_link_id and analysis_status='local_ocr_queued';
  insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
  values(a.project_id::uuid,'Rishiko dokumentin teknik: '||coalesce(a.attachment_name,'attachment'),
    'OCR lokal deshtoi dhe dokumenti kerkon review manual ose retry.'||E'\\n'||'Gabimi: '||left(coalesce(new.error,'unknown'),1200)||E'\\n'||'Project: '||coalesce(proj_name,a.project_id::text)||E'\\n'||'Attachment link #'||a.id::text||E'\\n'||'Local OCR job #'||new.id::text,
    current_date,'larte','hapur','document_bom_review','ATTACHMENT:'||a.id::text,'intern')
  on conflict(source,source_ref) do update set title=excluded.title,detail=excluded.detail,priority=excluded.priority,category=excluded.category;
  return new;
end;$$;

create or replace function public.local_ocr_no_text_job_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; v_duplicate bigint; v_is_tiny_word_artifact boolean:=false; v_is_image boolean:=false; begin
  if new.status<>'no_text' or old.status is not distinct from new.status then return new; end if;
  if new.expense_receipt_id is not null then
    update public.pppp_expense_receipts_v1 set status='no_text',last_error='OCR lokal nuk gjeti tekst të lexueshëm. Provo një foto më të qartë ose plotëso të dhënat manualisht.',updated_at=now() where id=new.expense_receipt_id and status not in ('confirmed','ignored','duplicate');
    return new;
  end if;
  select id,project_id,attachment_name,attachment_mime_type,attachment_size_bytes,content_sha256 into a from public.project_attachment_links where id=new.attachment_link_id;
  if not found then return new; end if;
  v_is_tiny_word_artifact:=coalesce(a.attachment_size_bytes,0)<=4096 and coalesce(a.attachment_name,'') ~* '^~WRD.*\\.(jpe?g|png|gif|bmp)$';
  v_is_image:=coalesce(a.attachment_mime_type,'') ilike 'image/%' or coalesce(a.attachment_name,'') ~* '\\.(jpe?g|png|webp|gif|bmp|tiff?)$';
  if v_is_tiny_word_artifact then
    update public.project_attachment_links set analysis_status='metadata_noise',analysis_method='local-tesseract-no-text-v2',analysis_error=null,extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','metadata_noise'),bom_status='none',bom_applied_count=0,updated_at=now() where id=a.id;
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()) where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed'); return new;
  end if;
  if coalesce(a.content_sha256,'')<>'' then select x.id into v_duplicate from public.project_attachment_links x where x.project_id is not distinct from a.project_id and x.id<a.id and x.content_sha256=a.content_sha256 order by x.id asc limit 1; end if;
  if v_duplicate is not null then
    update public.project_attachment_links set analysis_status='duplicate_content',analysis_method='sha256-dedupe-after-ocr-empty-v1',analysis_error=null,extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','duplicate_content','duplicate_of_attachment_link_id',v_duplicate),bom_status='already_present',bom_applied_count=0,updated_at=now() where id=a.id;
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()) where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed'); return new;
  end if;
  if v_is_image then
    update public.project_attachment_links set analysis_status='image_review',analysis_method='local-tesseract-no-text-v2',analysis_error=null,extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','image_review'),bom_status='review',bom_applied_count=0,updated_at=now() where id=a.id;
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()) where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
    values(a.project_id::uuid,'[AUTO] Rishiko fotografinë: '||coalesce(a.attachment_name,'attachment'),'OCR lokal nuk gjeti tekst të lexueshëm. Kjo nuk është OCR failure. Shiko fotografinë vizualisht vetëm për të konfirmuar nëse përmban informacion teknik/quality që duhet ruajtur ose vepruar.',current_date,'mesatare','hapur','document_image_review','ATTACHMENT:'||a.id::text,'intern')
    on conflict(source,source_ref) do update set title=excluded.title,detail=excluded.detail,category=excluded.category,priority=excluded.priority,status=case when lower(coalesce(public.tasks.status,'')) in ('kryer','mbyllur','done','closed') then public.tasks.status else 'hapur' end;
  end if;
  return new;
end;$$;

create or replace function public.pppp_confirm_expense_receipt_v1(p_receipt_id uuid,p_values jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare r public.pppp_expense_receipts_v1%rowtype; v_exp uuid; v_supplier text; v_date date; v_cat text; v_amount numeric; v_net numeric; v_vat numeric; v_rate numeric; v_currency text; begin
  select * into r from public.pppp_expense_receipts_v1 where id=p_receipt_id for update;
  if not found then raise exception 'Receipt not found'; end if;
  if r.expense_id is not null then return jsonb_build_object('ok',true,'already_confirmed',true,'expense_id',r.expense_id); end if;
  if r.status in ('ignored','duplicate') then raise exception 'Receipt is not confirmable'; end if;
  v_supplier:=coalesce(nullif(btrim(p_values->>'supplier'),''),r.supplier);
  v_date:=coalesce(nullif(p_values->>'date','')::date,r.expense_date);
  v_cat:=coalesce(nullif(btrim(p_values->>'category'),''),r.category,'tjera');
  v_amount:=coalesce(nullif(p_values->>'amount','')::numeric,r.amount);
  v_net:=coalesce(nullif(p_values->>'net_amount','')::numeric,r.net_amount);
  v_vat:=coalesce(nullif(p_values->>'vat_amount','')::numeric,r.vat_amount,0);
  v_rate:=coalesce(nullif(p_values->>'vat_rate','')::numeric,r.vat_rate,0);
  v_currency:=upper(coalesce(nullif(btrim(p_values->>'currency'),''),r.currency,'EUR'));
  if nullif(btrim(coalesce(v_supplier,'')),'') is null then raise exception 'Supplier is required'; end if;
  if v_date is null then raise exception 'Expense date is required'; end if;
  if v_amount is null or v_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
  if v_net is null then v_net:=greatest(0,v_amount-coalesce(v_vat,0)); end if;
  insert into public.expenses(category,supplier,invoice_nr,date,amount,vat_rate,vat_amount,net_amount,currency,deductible,notes,file_name,receipt_id,project_id,vehicle_plate,quantity,unit,unit_price)
  values(v_cat,v_supplier,coalesce(nullif(btrim(p_values->>'invoice_nr'),''),r.invoice_nr),v_date,v_amount,v_rate,v_vat,v_net,v_currency,
    coalesce((p_values->>'deductible')::boolean,true),nullif(p_values->>'notes',''),r.file_name,r.id,
    coalesce(nullif(p_values->>'project_id','')::uuid,r.project_id),coalesce(nullif(btrim(p_values->>'vehicle_plate'),''),r.vehicle_plate),
    coalesce(nullif(p_values->>'quantity','')::numeric,r.quantity),coalesce(nullif(btrim(p_values->>'unit'),''),r.unit),coalesce(nullif(p_values->>'unit_price','')::numeric,r.unit_price))
  returning id into v_exp;
  update public.pppp_expense_receipts_v1 set expense_id=v_exp,status='confirmed',confirmed_at=now(),
    supplier=v_supplier,expense_date=v_date,category=v_cat,amount=v_amount,net_amount=v_net,vat_amount=v_vat,vat_rate=v_rate,currency=v_currency,
    invoice_nr=coalesce(nullif(btrim(p_values->>'invoice_nr'),''),invoice_nr),project_id=coalesce(nullif(p_values->>'project_id','')::uuid,project_id),
    vehicle_plate=coalesce(nullif(btrim(p_values->>'vehicle_plate'),''),vehicle_plate),quantity=coalesce(nullif(p_values->>'quantity','')::numeric,quantity),unit=coalesce(nullif(btrim(p_values->>'unit'),''),unit),unit_price=coalesce(nullif(p_values->>'unit_price','')::numeric,unit_price),updated_at=now(),last_error=null
  where id=r.id;
  return jsonb_build_object('ok',true,'expense_id',v_exp,'status','confirmed');
end;$$;

create or replace function public.pppp_ignore_expense_receipt_v1(p_receipt_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ begin
  update public.pppp_expense_receipts_v1 set status='ignored',updated_at=now() where id=p_receipt_id and expense_id is null and status<>'confirmed';
  return jsonb_build_object('ok',found,'status',(select status from public.pppp_expense_receipts_v1 where id=p_receipt_id));
end;$$;

grant execute on function public.pppp_confirm_expense_receipt_v1(uuid,jsonb) to authenticated,service_role;
grant execute on function public.pppp_ignore_expense_receipt_v1(uuid) to authenticated,service_role;
revoke all on function public.pppp_confirm_expense_receipt_v1(uuid,jsonb) from anon;
revoke all on function public.pppp_ignore_expense_receipt_v1(uuid) from anon;

create or replace view public.pppp_expense_receipt_review_v1 with (security_invoker=true) as
select id,source_type,source_ref,drive_file_id,drive_file_url,file_name,mime_type,size_bytes,status,supplier,invoice_nr,expense_date,category,amount,net_amount,vat_rate,vat_amount,currency,project_id,vehicle_plate,quantity,unit,unit_price,confidence,review_fields,expense_id,last_error,created_at,updated_at,confirmed_at
from public.pppp_expense_receipts_v1
where status not in ('ignored','duplicate')
order by case status when 'review' then 1 when 'no_text' then 2 when 'failed' then 3 when 'ocr_processing' then 4 when 'ocr_queued' then 5 else 9 end,created_at desc;
grant select on public.pppp_expense_receipt_review_v1 to authenticated,service_role;
do $$ begin if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then grant select on public.pppp_expense_receipt_review_v1 to supabase_read_only_user; end if; end $$;

commit;
