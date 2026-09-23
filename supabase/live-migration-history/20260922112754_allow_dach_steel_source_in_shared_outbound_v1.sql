
alter table public.pppp_outbound_queue_v1
  drop constraint if exists pppp_outbound_queue_v1_source_check;

alter table public.pppp_outbound_queue_v1
  add constraint pppp_outbound_queue_v1_source_check
  check (source in ('TED','GC','DACH_STEEL_BUYER'));

