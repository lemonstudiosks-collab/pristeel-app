begin;
create index if not exists pppp_opp_assessment_company_idx on public.pppp_opportunity_company_assessments_v1(company_profile_id);
create index if not exists pppp_opp_followup_action_idx on public.pppp_opportunity_followups_v1(action_id);
create index if not exists pppp_opp_followup_company_idx on public.pppp_opportunity_followups_v1(company_profile_id) where company_profile_id is not null;
create index if not exists pppp_opp_followup_contact_idx on public.pppp_opportunity_followups_v1(contact_id) where contact_id is not null;
create index if not exists pppp_opp_registry_contact_idx on public.pppp_opportunity_outreach_registry_v1(contact_id) where contact_id is not null;
commit;
