-- Append after participant-bot-actions-3b.sql without its BEGIN/COMMIT/NOTIFY,
-- wrap in BEGIN; ... ROLLBACK;. Requires the applied Stage 3B.1 schema.

create temporary table stage3b_actions_fixture(
  label text primary key, id uuid not null) on commit drop;
do $test$
declare
  human_id uuid;
  test_room uuid;
begin
  select id into human_id from public.profiles
    where nickname is not null order by id limit 1;
  if human_id is null then raise exception 'One profile is required'; end if;
  insert into public.rooms(code, host_id, deck_id)
    values(upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      human_id, 'moonlit-archive') returning id into test_room;
  insert into public.room_players(room_id, user_id, is_ready)
    values(test_room, human_id, true);
  insert into stage3b_actions_fixture values
    ('room', test_room), ('human', human_id);
end;
$test$;
select set_config('test.bot_room',
    (select id::text from stage3b_actions_fixture where label = 'room'), true),
  set_config('request.jwt.claim.sub',
    (select id::text from stage3b_actions_fixture where label = 'human'), true);
select id, bot_name from public.add_luminaria_bot(
  current_setting('test.bot_room')::uuid);
select id, bot_name from public.add_luminaria_bot(
  current_setting('test.bot_room')::uuid);

do $test$
declare
  test_room uuid := current_setting('test.bot_room')::uuid;
  human_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  human_seat uuid;
  bot_one uuid;
  bot_two uuid;
  first_round uuid;
  second_round uuid;
  picked_card text;
  deck_cards text[];
  result jsonb;
  storyteller_submission uuid;
begin
  if has_function_privilege('authenticated',
      'public.advance_luminaria_bots(uuid)', 'EXECUTE') then
    raise exception 'Bot advancement RPC is open before the new client';
  end if;
  select array_agg(card_id order by card_id) into deck_cards
    from (select card_id from public.luminaria_deck_catalog
      where deck_id = 'moonlit-archive' order by card_id limit 18) deck;
  if cardinality(deck_cards) <> 18 then
    raise exception 'The test deck needs 18 cards';
  end if;
  perform * from public.start_luminaria_game(test_room, deck_cards);
  select id into human_seat from public.room_players
    where room_id = test_room and user_id = human_id;
  select id into bot_one from public.room_players
    where room_id = test_room and is_bot order by joined_at, id limit 1;
  select id into bot_two from public.room_players
    where room_id = test_room and is_bot order by joined_at, id offset 1 limit 1;

  -- Round one: the human tells a clue; one call should submit and vote for
  -- both bots, then the existing triggers should finalize the round.
  insert into public.rounds(room_id, storyteller_id, clue)
    values(test_room, human_id, 'Human clue') returning id into first_round;
  select card_id into picked_card from public.room_deck_cards
    where room_id = test_room and owner_participant_id = human_seat
      and not is_played order by position limit 1;
  perform public.play_luminaria_card(first_round, picked_card);
  result := public.advance_luminaria_bots(test_room);
  if result->>'advanced' <> 'true' or (result->>'actions')::integer <> 4
     or (select phase from public.rounds where id = first_round) <> 'results'
     or (select count(*) from public.card_submissions
       where round_id = first_round and player_id is null) <> 2
     or (select count(*) from public.votes
       where round_id = first_round and voter_id is null) <> 2 then
    raise exception 'Human storyteller bot actions failed: %', result;
  end if;
  result := public.advance_luminaria_bots(test_room);
  if result->>'advanced' <> 'false'
     or (select count(*) from public.votes where round_id = first_round) <> 2 then
    raise exception 'Repeated bot action was not idempotent: %', result;
  end if;

  -- Round two: a bot tells the clue and lays its card. The other bot submits,
  -- then the engine waits for the human rather than using a hidden card.
  if (select current_storyteller_participant_id from public.rooms
      where id = test_room) is distinct from bot_one then
    raise exception 'The storyteller queue did not reach the first bot';
  end if;
  perform public.start_next_turn(test_room);
  result := public.advance_luminaria_bots(test_room);
  select id into second_round from public.rounds
    where room_id = test_room order by created_at desc, id desc limit 1;
  if result->>'advanced' <> 'true' or (result->>'actions')::integer <> 2
     or (select phase from public.rounds where id = second_round) <> 'submitting'
     or not exists (select 1 from public.rounds where id = second_round
       and storyteller_participant_id = bot_one and storyteller_id is null)
     or (select count(*) from public.card_submissions
       where round_id = second_round and player_id is null) <> 2 then
    raise exception 'Bot storyteller creation failed: %', result;
  end if;
  result := public.advance_luminaria_bots(test_room);
  if result->>'advanced' <> 'false'
     or (select count(*) from public.card_submissions
       where round_id = second_round) <> 2 then
    raise exception 'Repeated bot submission was not idempotent: %', result;
  end if;
  select card_id into picked_card from public.room_deck_cards
    where room_id = test_room and owner_participant_id = human_seat
      and not is_played order by position limit 1;
  perform public.play_luminaria_card(second_round, picked_card);
  if (select phase from public.rounds where id = second_round) <> 'voting' then
    raise exception 'The human submission did not open voting';
  end if;
  result := public.advance_luminaria_bots(test_room);
  if result->>'advanced' <> 'true' or (result->>'actions')::integer <> 1
     or (select count(*) from public.votes
       where round_id = second_round and voter_participant_id = bot_two) <> 1 then
    raise exception 'Bot voting in bot-led round failed: %', result;
  end if;
  select id into storyteller_submission from public.card_submissions
    where round_id = second_round and participant_id = bot_one;
  insert into public.votes(round_id, voter_id, submission_id)
    values(second_round, human_id, storyteller_submission);
  if (select phase from public.rounds where id = second_round) <> 'results'
     or (select count(*) from public.rounds where room_id = test_room) <> 2
     or (select count(*) from public.room_deck_cards
       where room_id = test_room and is_played) <> 6 then
    raise exception 'The bot-led round did not finish cleanly';
  end if;
end;
$test$;

select 'Bot action engine handled human and bot storytellers, votes and retries; rollback follows'
  as result;
rollback;
