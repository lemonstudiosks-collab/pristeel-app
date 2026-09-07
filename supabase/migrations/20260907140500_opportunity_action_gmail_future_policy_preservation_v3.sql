create or replace function private.pppp_opportunity_action_preserve_external_state_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  k text;
  keys text[] := array[
    'gmail_draft_id','gmail_message_id','gmail_thread_id','gmail_draft_created_at',
    'gmail_draft_generator','gmail_draft_generator_target','gmail_draft_generator_complete',
    'gmail_drafts','gmail_draft_count','gmail_recipient_count','gmail_recipients',
    'gmail_draft_write_policy','gmail_draft_policy_cutoff','gmail_draft_html',
    'gmail_auto_send','human_send_required'
  ];
begin
  if tg_op='UPDATE' then
    new.payload := coalesce(new.payload,'{}'::jsonb);
    foreach k in array keys loop
      if (not new.payload ? k) and old.payload ? k then
        new.payload := new.payload || jsonb_build_object(k, old.payload -> k);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists pppp_opportunity_action_preserve_external_state_v1_trg on public.pppp_opportunity_actions;
create trigger pppp_opportunity_action_preserve_external_state_v1_trg
before update of payload on public.pppp_opportunity_actions
for each row
execute function private.pppp_opportunity_action_preserve_external_state_v1();
