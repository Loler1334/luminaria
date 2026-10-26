-- Append after participant-bot-seats-3b.sql with its BEGIN/COMMIT/NOTIFY
-- removed, then wrap the combined SQL in BEGIN; ... ROLLBACK;.
-- This verifies the 3B.1 schema in a solo room while bot creation stays
-- unavailable to authenticated clients.

create temporary table stage3b_fixture(label text primary key, id uuid not null)
  on commit drop;
do $test$
declare
  people uuid[];
  test_room uuid;
begin
  select array_agg(id order by id) into people from (
    select id from public.profiles where nickname is not null
    order by id limit 1
  ) p;
  if cardinality(people) <> 1 then
    raise exception 'One human profile is required';
  end if;
  insert into public.rooms(code, host_id, deck_id)
    values (upper(substr(md5(gen_random_uuid()::text), 1, 6)), people[1],
      'moonlit-archive')
    returning id into test_room;
  insert into public.room_players(room_id, user_id, is_ready)
    values (test_room, people[1], true);
  insert into stage3b_fixture values
    ('room', test_room), ('host', people[1]);
end;
$test$;

select set_config('test.bot_room',
    (select id::text from stage3b_fixture where label = 'room'), true),
  set_config('test.bot_host',
    (select id::text from stage3b_fixture where label = 'host'), true);
select set_config('request.jwt.claim.sub', current_setting('test.bot_host'), true);
select id, bot_name, bot_avatar from public.add_luminaria_bot(
  current_setting('test.bot_room')::uuid);
select id, bot_name, bot_avatar from public.add_luminaria_bot(
  current_setting('test.bot_room')::uuid);

do $test$
declare
  seat_order uuid[];
begin
  if (select count(*) from public.room_players
    where room_id = current_setting('test.bot_room')::uuid
      and is_bot and user_id is null and is_ready
      and length(btrim(bot_name)) between 1 and 40) <> 2 then
    raise exception 'Bot seat identity or ready state is wrong';
  end if;
  if (select count(distinct lower(coalesce(seat.bot_name, profile.nickname)))
      from public.room_players seat
      left join public.profiles profile on profile.id = seat.user_id
      where seat.room_id = current_setting('test.bot_room')::uuid) <> 3 then
    raise exception 'Bot and human names collide';
  end if;
  select array_agg(id order by joined_at, id) into seat_order
    from public.room_players
    where room_id = current_setting('test.bot_room')::uuid;
  for i in 1..cardinality(seat_order) loop
    if public.luminaria_next_storyteller_seat(
        current_setting('test.bot_room')::uuid, seat_order[i])
        is distinct from seat_order[(i % cardinality(seat_order)) + 1] then
      raise exception 'The storyteller queue skipped a human or bot seat';
    end if;
  end loop;
  if has_function_privilege('authenticated', 'public.add_luminaria_bot(uuid)',
      'EXECUTE')
     or has_function_privilege('authenticated',
       'public.remove_luminaria_bot(uuid,uuid)', 'EXECUTE') then
    raise exception 'Bot management RPC became public too early';
  end if;
end;
$test$;

select set_config('test.bot_to_remove', id::text, true)
from public.room_players where room_id = current_setting('test.bot_room')::uuid
  and is_bot order by joined_at, id limit 1;
select public.remove_luminaria_bot(current_setting('test.bot_room')::uuid,
  current_setting('test.bot_to_remove')::uuid);
do $test$
begin
  if (select count(*) from public.room_players
    where room_id = current_setting('test.bot_room')::uuid and is_bot) <> 1 then
    raise exception 'Removing a bot damaged the lobby';
  end if;
end;
$test$;

-- Restore a three-seat solo room, then exercise the real round, submission,
-- vote and turn-transition triggers under the host's auth.uid().
select id, bot_name from public.add_luminaria_bot(
  current_setting('test.bot_room')::uuid);
do $test$
declare
  test_room uuid := current_setting('test.bot_room')::uuid;
  host_seat uuid;
  first_bot uuid;
  second_bot uuid;
  bot_seat uuid;
  first_round uuid;
  bot_round uuid;
  host_submission uuid;
  first_bot_submission uuid;
  picked_card text;
  deck_cards text[];
begin
  select array_agg(card_id order by card_id) into deck_cards
    from (select card_id from public.luminaria_deck_catalog
      where deck_id = 'moonlit-archive' order by card_id limit 18) deck;
  if cardinality(deck_cards) <> 18 then
    raise exception 'The test deck needs 18 unique cards';
  end if;
  perform * from public.start_luminaria_game(test_room, deck_cards);
  select id into host_seat from public.room_players
    where room_id = test_room and user_id = current_setting('test.bot_host')::uuid;
  select id into first_bot from public.room_players
    where room_id = test_room and is_bot order by joined_at, id limit 1;
  select id into second_bot from public.room_players
    where room_id = test_room and is_bot order by joined_at, id offset 1 limit 1;
  if (select current_storyteller_participant_id from public.rooms
      where id = test_room) is distinct from host_seat then
    raise exception 'The host did not start as storyteller';
  end if;
  insert into public.rounds(room_id, storyteller_id, clue)
    values(test_room, current_setting('test.bot_host')::uuid, 'First clue')
    returning id into first_round;
  select card_id into picked_card from public.room_deck_cards
    where room_id = test_room and owner_participant_id = host_seat
      and not is_played order by position limit 1;
  perform public.play_luminaria_card(first_round, picked_card);
  foreach bot_seat in array array[first_bot, second_bot] loop
    select card_id into picked_card from public.room_deck_cards
      where room_id = test_room and owner_participant_id = bot_seat
        and not is_played order by position limit 1;
    update public.room_deck_cards set is_played = true
      where room_id = test_room and card_id = picked_card;
    insert into public.card_submissions(round_id, participant_id, card_id)
      values(first_round, bot_seat, picked_card);
  end loop;
  if (select phase from public.rounds where id = first_round) <> 'voting' then
    raise exception 'Bot submissions did not advance to voting';
  end if;
  select id into host_submission from public.card_submissions
    where round_id = first_round and participant_id = host_seat;
  select id into first_bot_submission from public.card_submissions
    where round_id = first_round and participant_id = first_bot;
  insert into public.votes(round_id, voter_participant_id, submission_id)
    values(first_round, first_bot, host_submission),
      (first_round, second_bot, first_bot_submission);
  if (select count(*) from public.votes where round_id = first_round
      and voter_id is null) <> 2 then
    raise exception 'Bot votes did not retain NULL legacy IDs';
  end if;
  if (select phase from public.rounds where id = first_round) <> 'results' then
    raise exception 'Bot votes did not finish the round';
  end if;
  if not exists (select 1 from public.rooms where id = test_room
      and current_storyteller_participant_id = first_bot
      and current_storyteller_id is null) then
    raise exception 'The next storyteller was not a bot seat';
  end if;
  perform public.start_next_turn(test_room);
  insert into public.rounds(room_id, storyteller_participant_id, clue)
    values(test_room, first_bot, 'Bot clue') returning id into bot_round;
  select card_id into picked_card from public.room_deck_cards
    where room_id = test_room and owner_participant_id = first_bot
      and not is_played order by position limit 1;
  update public.room_deck_cards set is_played = true
    where room_id = test_room and card_id = picked_card;
  insert into public.card_submissions(round_id, participant_id, card_id)
    values(bot_round, first_bot, picked_card);
  if not exists (select 1 from public.rounds where id = bot_round
      and storyteller_id is null and storyteller_participant_id = first_bot)
     or not exists (select 1 from public.card_submissions
      where round_id = bot_round and participant_id = first_bot
        and player_id is null) then
    raise exception 'Bot storyteller or submission lost its seat reference';
  end if;
end;
$test$;

select 'Solo bot seats, shared queue, bot round/submissions/votes and closed RPCs passed; rollback follows'
  as result;
rollback;
