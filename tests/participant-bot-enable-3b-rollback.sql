-- Exercise the exact client grants against an authenticated room host.
-- This test makes a private fixture room and rolls back every change.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

grant execute on function public.add_luminaria_bot(uuid) to authenticated;
grant execute on function public.remove_luminaria_bot(uuid,uuid) to authenticated;
grant execute on function public.advance_luminaria_bots(uuid) to authenticated;

do $test$
declare human_id uuid; test_room uuid;
begin
  select id into human_id from public.profiles
    where nickname is not null order by id limit 1;
  if human_id is null then raise exception 'One profile is required'; end if;
  insert into public.rooms(code, host_id, deck_id)
    values(upper(substr(md5(gen_random_uuid()::text),1,6)),
      human_id, 'moonlit-archive') returning id into test_room;
  insert into public.room_players(room_id,user_id,is_ready)
    values(test_room,human_id,true);
  perform set_config('test.bot_room',test_room::text,true);
  perform set_config('request.jwt.claim.sub',human_id::text,true);
end;
$test$;

set local role authenticated;
select id, bot_name from public.add_luminaria_bot(current_setting('test.bot_room')::uuid);
select public.advance_luminaria_bots(current_setting('test.bot_room')::uuid);
select public.remove_luminaria_bot(current_setting('test.bot_room')::uuid,
  (select id from public.room_players
    where room_id=current_setting('test.bot_room')::uuid and is_bot limit 1));
reset role;
select 'Authenticated bot RPC grants passed; rollback follows' as result;
rollback;
