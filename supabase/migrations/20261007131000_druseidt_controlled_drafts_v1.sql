
create or replace function public.pppp_chatgpt_bridge_manifest_v30()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $fn$
 select public.pppp_chatgpt_bridge_manifest_v29() || jsonb_build_object('bridge_version','chatgpt-command-v30','druseidt_vertical',jsonb_build_object('canonical_target_domain','druseidt.de','read_rpc','pppp_druseidt_snapshot_v1','detail_rpc','pppp_druseidt_lead_detail_v1','command_actions',jsonb_build_array('druseidt_intelligence','druseidt_outreach_draft'),'intelligence_fields',jsonb_build_array('direct_customers'),'draft_fields',jsonb_build_array('lead_id','contact_key'),'human_email_approval_required',true,'external_email_sent',false)) || jsonb_build_object('allowed_action_types',(public.pppp_chatgpt_bridge_manifest_v29()->'allowed_action_types')||jsonb_build_array('druseidt_intelligence','druseidt_outreach_draft'));
$fn$;

