-- Run in Supabase SQL Editor. All test users and rooms are rolled back.
begin;
do $$
declare
  players uuid[] := array[]::uuid[];
  player uuid; room uuid; round_id uuid; n integer; i integer;
  cards text[]; result record; denied boolean;
begin
  for i in 1..10 loop
    player := gen_random_uuid(); players := array_append(players, player);
    insert into auth.users(id) values(player);
    insert into public.profiles(id,nickname,avatar) values(player,'Round test '||i,'*');
  end loop;
  for n in 3..10 loop
    room := gen_random_uuid();
    insert into public.rooms(id,code,host_id) values(room,upper(substr(md5(room::text),1,6)),players[1]);
    for i in 1..n loop
      insert into public.room_players(room_id,user_id,is_ready,joined_at)
      values(room,players[i],true,now()+i*interval '1 second');
    end loop;
    perform set_config('request.jwt.claim.sub',players[1]::text,true);
    perform public.configure_luminaria_lobby(room,'pop-culture',2);
    perform set_config('request.jwt.claim.sub',players[2]::text,true);
    denied := false;
    begin perform public.configure_luminaria_lobby(room,'moonlit-archive',3);
    exception when others then denied := sqlerrm='Only the lobby host can change settings'; end;
    if not denied then raise exception 'Guest changed lobby settings'; end if;
    perform set_config('request.jwt.claim.sub',players[1]::text,true);
    select array_agg(lpad(k::text,3,'0')||'-card.webp') into cards from generate_series(1,(case when n>=8 then 1 else 2 end)*n*n+1) k;
    denied := false;
    begin perform public.start_luminaria_game(room,cards);
    exception when others then denied := sqlerrm like 'Choose enough cards for complete%'; end;
    if not denied then raise exception 'Incomplete cycle accepted'; end if;
    select * into result from public.start_luminaria_game(room,cards[1:(case when n>=8 then 1 else 2 end)*n*n]);
    if result.total_rounds <> (case when n>=8 then 1 else 2 end)*n then raise exception 'Wrong round count'; end if;
    if (select count(*) from public.room_deck_cards where room_id=room) <> (case when n>=8 then 1 else 2 end)*n*n then raise exception 'Wrong card count'; end if;
    if exists(select 1 from public.room_deck_cards where room_id=room group by owner_id having count(*)<>(case when n>=8 then 1 else 2 end)*n) then raise exception 'Unequal deal'; end if;
    insert into public.rounds(room_id,storyteller_id,clue) values(room,players[1],'Test clue') returning id into round_id;
    if (select count(*) from public.luminaria_round_waiting(round_id)) <> n then raise exception 'Wrong waiting roster'; end if;
    perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
    denied := false;
    begin perform public.luminaria_round_waiting(round_id);
    exception when others then denied := sqlerrm='Only room members can view progress'; end;
    if not denied then raise exception 'Outsider viewed progress'; end if;
  end loop;
end;
$$;
rollback;
select 'PASS: 3-10 players, fair deals, complete cycles, host-only settings, member-only waiting. Test data rolled back.' as verification;
