-- Append after the bodies of participant-keys-3a.sql and participant-rls-3a.sql,
-- omitting their BEGIN/COMMIT and NOTIFY statements. Wrap the combined script
-- in BEGIN; ... ROLLBACK; so all schema and fixture changes are discarded.
-- Run only against a Stage 3A server schema with three existing profiles.

do $test$
begin
  if (select count(*) from pg_constraint where contype = 'f'
    and confrelid = 'public.room_players'::regclass
    and conname in ('rooms_current_storyteller_participant_fk',
      'rounds_storyteller_participant_fk', 'card_submissions_participant_fk',
      'votes_voter_participant_fk', 'room_deck_cards_owner_participant_fk',
      'luminaria_card_rerolls_participant_fk')) <> 6 then
    raise exception 'A participant foreign key was lost';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.room_players'::regclass and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') then
    raise exception 'room_players primary key is not id';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.luminaria_card_rerolls'::regclass and contype = 'p'
      and pg_get_constraintdef(oid) =
        'PRIMARY KEY (milestone_round_id, participant_id)') then
    raise exception 'Reroll primary key is not participant_id';
  end if;
end;
$test$;

create temporary table stage3a_final_fixture (
  label text primary key, id uuid not null
) on commit drop;

do $test$
declare
  people uuid[];
  test_room uuid;
begin
  select array_agg(id order by id) into people
  from (select id from (
    select distinct on (lower(nickname)) id, nickname
    from public.profiles order by lower(nickname), id
  ) unique_names order by id limit 3) p;
  if cardinality(people) <> 3 then
    raise exception 'Three profiles required for the RLS fixture';
  end if;
  insert into public.rooms(code, host_id, deck_id)
    values (upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      people[1], 'moonlit-archive') returning id into test_room;
  insert into stage3a_final_fixture values ('room', test_room);
  for i in 1..3 loop
    insert into public.room_players(room_id, user_id, is_ready)
      values (test_room, people[i], true)
      on conflict (room_id, user_id) do nothing;
    insert into stage3a_final_fixture
      values ('user' || i, people[i]);
  end loop;
end;
$test$;

select set_config('test.final_room',
    (select id::text from stage3a_final_fixture where label = 'room'), true),
  set_config('test.final_user1',
    (select id::text from stage3a_final_fixture where label = 'user1'), true),
  set_config('test.final_user2',
    (select id::text from stage3a_final_fixture where label = 'user2'), true),
  set_config('test.final_user3',
    (select id::text from stage3a_final_fixture where label = 'user3'), true);
select set_config('test.final_cards', array_to_string(array(
  select card_id from public.luminaria_deck_catalog
  where deck_id = 'moonlit-archive' order by card_id limit 18), ','), true);

select set_config('request.jwt.claim.sub', current_setting('test.final_user1'), true);
set local role authenticated;
select * from public.start_luminaria_game(
  current_setting('test.final_room')::uuid,
  string_to_array(current_setting('test.final_cards'), ','));
-- Reproduce the old client: no storyteller_participant_id in INSERT.
insert into public.rounds(room_id, storyteller_id, clue)
  values (current_setting('test.final_room')::uuid, auth.uid(), 'Seat RLS test');
reset role;

select set_config('test.final_round', id::text, true)
from public.rounds where room_id = current_setting('test.final_room')::uuid;
do $test$
declare
  person uuid;
  card text;
begin
  for i in 1..3 loop
    person := current_setting('test.final_user' || i)::uuid;
    select card_id into card from public.room_deck_cards
      where room_id = current_setting('test.final_room')::uuid
        and owner_id = person order by position limit 1;
    perform set_config('test.final_card' || i, card, true);
  end loop;
end;
$test$;

select set_config('request.jwt.claim.sub', current_setting('test.final_user1'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.final_round')::uuid,
  current_setting('test.final_card1'));
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.final_user2'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.final_round')::uuid,
  current_setting('test.final_card2'));
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.final_user3'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.final_round')::uuid,
  current_setting('test.final_card3'));
reset role;

select set_config('test.final_story_card', id::text, true)
from public.card_submissions
where round_id = current_setting('test.final_round')::uuid
  and player_id = current_setting('test.final_user1')::uuid;
select set_config('request.jwt.claim.sub', current_setting('test.final_user2'), true);
set local role authenticated;
-- Reproduce the old client: no voter_participant_id in INSERT.
insert into public.votes(round_id, voter_id, submission_id)
  values (current_setting('test.final_round')::uuid, auth.uid(),
    current_setting('test.final_story_card')::uuid);
do $test$
begin
  if (select count(*) from public.card_submissions
    where round_id = current_setting('test.final_round')::uuid) <> 1 then
    raise exception 'Voting submissions exposed other owners';
  end if;
  if (select count(*) from public.votes
    where round_id = current_setting('test.final_round')::uuid) <> 1 then
    raise exception 'Vote insert or own-vote read failed';
  end if;
end;
$test$;
reset role;

select 'Stage 3A keys and RLS passed; rollback follows' as result;
rollback;
