-- Enable bot rooms only after the 3B.3 client is deployed.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

grant execute on function public.add_luminaria_bot(uuid) to authenticated;
grant execute on function public.remove_luminaria_bot(uuid,uuid) to authenticated;
grant execute on function public.advance_luminaria_bots(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
