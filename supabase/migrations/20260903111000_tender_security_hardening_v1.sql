-- PPPP TED/Gmail security hardening v1
-- Scope: database access control only; no Opportunity workflow, outreach language,
-- Gmail draft behavior, pricing or human approval gates are changed.

-- tender_email_links is read by signed-in PPPP users and written only by authorized
-- operators/backend flows. RLS now enforces the same access model as project_emails.
alter table public.tender_email_links enable row level security;

drop policy if exists tender_email_links_select_authenticated on public.tender_email_links;
create policy tender_email_links_select_authenticated
on public.tender_email_links
for select
to authenticated
using ((select auth.role())='authenticated');

drop policy if exists tender_email_links_insert_can_write on public.tender_email_links;
create policy tender_email_links_insert_can_write
on public.tender_email_links
for insert
to authenticated
with check (public.can_write());

drop policy if exists tender_email_links_update_can_write on public.tender_email_links;
create policy tender_email_links_update_can_write
on public.tender_email_links
for update
to authenticated
using (public.can_write())
with check (public.can_write());

drop policy if exists tender_email_links_delete_can_write on public.tender_email_links;
create policy tender_email_links_delete_can_write
on public.tender_email_links
for delete
to authenticated
using (public.can_write());

-- Cover the FK/join path used by the TED outreach view and reconciler.
create index if not exists tender_email_links_gmail_message_id_idx
on public.tender_email_links(gmail_message_id);

-- These views are intentionally readable by authenticated PPPP users. Make them
-- SECURITY INVOKER so their base-table RLS policies are always respected.
alter view public.pppp_tender_operating_lanes_v1 set (security_invoker=true);
alter view public.pppp_ted_sales_outreach_v1 set (security_invoker=true);

-- This RPC only reads kek_tender_watch, whose authenticated SELECT RLS policy is
-- already explicit. SECURITY INVOKER removes unnecessary privilege elevation while
-- preserving the existing RPC contract used by TED/Gmail matching.
create or replace function public.pppp_ted_award_candidates_by_email_v1(p_email text)
returns table(
  tender_watch_id uuid,
  publication_no text,
  authority text,
  title text,
  status text,
  payload jsonb
)
language sql
stable
security invoker
set search_path to 'pg_catalog','public'
as $function$
  select k.id, k.publication_no, k.authority, k.title, k.status, k.payload
  from public.kek_tender_watch k
  where length(trim(coalesce(p_email,''))) >= 5
    and upper(coalesce(k.payload->>'source',''))='TED'
    and coalesce(k.payload->>'notice_phase','')='award'
    and lower(k.payload::text) like '%' || lower(trim(p_email)) || '%'
  order by k.published_date desc nulls last, k.updated_at desc;
$function$;

revoke all on function public.pppp_ted_award_candidates_by_email_v1(text) from public,anon;
grant execute on function public.pppp_ted_award_candidates_by_email_v1(text) to authenticated,service_role;

comment on table public.tender_email_links is
  'Canonical TED/Gmail link table. Authenticated reads are RLS-protected; writes require can_write() or service role.';
comment on function public.pppp_ted_award_candidates_by_email_v1(text) is
  'TED award candidate lookup by email; SECURITY INVOKER so kek_tender_watch RLS remains authoritative.';
