-- Append this to the four participant-*-3a.sql modules after removing their
-- intermediate COMMIT statements. The first module opens the transaction;
-- this file always ends it with ROLLBACK. Run only from a privileged SQL
-- Editor session against a database with the Stage 2 seat columns installed.

create temporary table stage3a_fixture (
  label text primary key,
  room_id uuid not null,
  users uuid[] not null
) on commit drop;

do $test$
declare
  people uuid[];
  room_10 uuid;
  room_3 uuid;
  user_id uuid;
begin
  select array_agg(id order by id) into people
  from (select id from (
    select distinct on (lower(nickname)) id, nickname
    from public.profiles order by lower(nickname), id
  ) distinct_names order by id limit 10) p;
  if cardinality(people) <> 10 then
    raise exception 'The deal test requires ten existing human profiles';
  end if;
  insert into public.rooms(code, host_id, deck_id)
    values (upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      people[1], 'pop-culture') returning id into room_10;
  insert into public.rooms(code, host_id, deck_id)
    values (upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      people[1], 'moonlit-archive') returning id into room_3;
  foreach user_id in array people loop
    insert into public.room_players(room_id, user_id, is_ready)
      values(room_10, user_id, true);
  end loop;
  for i in 1..3 loop
    insert into public.room_players(room_id, user_id, is_ready)
      values(room_3, people[i], true);
  end loop;
  insert into stage3a_fixture values
    ('ten', room_10, people), ('legacy', room_3, people[1:3]);
end;
$test$;

select set_config('test.room10', room_id::text, true),
  set_config('test.room3',
    (select room_id::text from stage3a_fixture where label = 'legacy'), true),
  set_config('test.host', users[1]::text, true)
from stage3a_fixture where label = 'ten';
select set_config('test.cards10', array_to_string(array(
  select card_id from public.luminaria_deck_catalog
  where deck_id = 'pop-culture' order by card_id limit 100), ','), true);
select set_config('request.jwt.claim.sub', current_setting('test.host'), true);
set local role authenticated;
select * from public.start_luminaria_game(
  current_setting('test.room10')::uuid,
  string_to_array(current_setting('test.cards10'), ','));
do $test$
declare n integer; first_position integer; last_position integer;
begin
  select count(*), min(hand_position), max(hand_position)
    into n, first_position, last_position
    from public.luminaria_hand(current_setting('test.room10')::uuid);
  if (n, first_position, last_position) is distinct from (6, 1, 6) then
    raise exception 'Ten-seat hand is wrong: %, %, %', n, first_position, last_position;
  end if;
end;
$test$;
reset role;
do $test$
declare bad integer;
begin
  select count(*) into bad from public.room_players p
  where p.room_id = current_setting('test.room10')::uuid
    and (select count(*) from public.room_deck_cards d
      where d.room_id = p.room_id and d.owner_participant_id = p.id
        and d.owner_id = p.user_id) <> 10;
  if bad <> 0 then raise exception 'Deal did not dual-write ten cards per seat'; end if;
  select count(*) into bad from (
    select p.id from public.room_players p
    cross join generate_series(1, 10) pos
    where p.room_id = current_setting('test.room10')::uuid
      and not exists (select 1 from public.room_deck_cards d
        where d.room_id = p.room_id and d.owner_participant_id = p.id
          and d.position = pos)
  ) gaps;
  if bad <> 0 then raise exception 'Deal has position gaps'; end if;
  if (select count(*) from public.room_deck_cards
    where room_id = current_setting('test.room10')::uuid) <> 100 then
    raise exception 'Ten-seat deal did not allocate 100 cards';
  end if;
end;
$test$;

-- Reproduce the live client: no participant ID in the request, clue is the
-- actual rounds column, and the phase uses its database default.
select set_config('test.cards3', array_to_string(array(
  select card_id from public.luminaria_deck_catalog
  where deck_id = 'moonlit-archive' order by card_id limit 18), ','), true);
select set_config('request.jwt.claim.sub', current_setting('test.host'), true);
set local role authenticated;
select * from public.start_luminaria_game(
  current_setting('test.room3')::uuid,
  string_to_array(current_setting('test.cards3'), ','));
insert into public.rounds(room_id, storyteller_id, clue)
  values(current_setting('test.room3')::uuid, auth.uid(), 'Legacy seat test');
reset role;
select set_config('test.round', id::text, true)
  from public.rounds where room_id = current_setting('test.room3')::uuid;
do $test$
begin
  if not exists (select 1 from public.rounds r
    join public.room_players p on p.id = r.storyteller_participant_id
    where r.id = current_setting('test.round')::uuid
      and p.user_id = current_setting('test.host')::uuid
      and r.phase = 'submitting') then
    raise exception 'Legacy round insert did not resolve storyteller seat';
  end if;
end;
$test$;

-- Three old RPC calls each pass only the round and card ID.
do $test$
declare uid uuid; card text; n integer;
begin
  for n in 1..3 loop
    select users[n] into uid from stage3a_fixture where label = 'legacy';
    select d.card_id into card from public.room_deck_cards d
      where d.room_id = current_setting('test.room3')::uuid
        and d.owner_id = uid order by d.position limit 1;
    perform set_config('test.user' || n, uid::text, true);
    perform set_config('test.card' || n, card, true);
  end loop;
end;
$test$;
select set_config('request.jwt.claim.sub', current_setting('test.user1'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.round')::uuid,
  current_setting('test.card1'));
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.user2'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.round')::uuid,
  current_setting('test.card2'));
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.user3'), true);
set local role authenticated;
select public.play_luminaria_card(current_setting('test.round')::uuid,
  current_setting('test.card3'));
reset role;
do $test$
begin
  if (select phase from public.rounds where id = current_setting('test.round')::uuid)
      <> 'voting' then raise exception 'Legacy plays did not open voting'; end if;
  if exists (select 1 from public.card_submissions s
    join public.room_players p on p.id = s.participant_id
    where s.round_id = current_setting('test.round')::uuid
      and (s.player_id <> p.user_id or not exists (
        select 1 from public.room_deck_cards d
        where d.room_id = current_setting('test.room3')::uuid
          and d.card_id = s.card_id and d.owner_participant_id = p.id
          and d.is_played))) then
    raise exception 'Legacy play did not sync submission and spent card';
  end if;
  if (select count(*) from public.card_submissions
    where round_id = current_setting('test.round')::uuid) <> 3 then
    raise exception 'Legacy play count is wrong';
  end if;
end;
$test$;
select set_config('test.host_submission', id::text, true)
  from public.card_submissions where round_id = current_setting('test.round')::uuid
    and player_id = current_setting('test.user1')::uuid;
select set_config('request.jwt.claim.sub', current_setting('test.user2'), true);
set local role authenticated;
insert into public.votes(round_id, voter_id, submission_id) values (
  current_setting('test.round')::uuid, auth.uid(),
  current_setting('test.host_submission')::uuid);
reset role;
do $test$
begin
  if not exists (select 1 from public.votes v
    join public.room_players p on p.id = v.voter_participant_id
    where v.round_id = current_setting('test.round')::uuid
      and p.user_id = current_setting('test.user2')::uuid) then
    raise exception 'Legacy direct vote did not resolve voter seat';
  end if;
end;
$test$;

-- A pre-existing, inactive seven-result room has untouched reroll milestones.
-- All of its changes below are rolled back together with the fixture rooms.
select set_config('test.reroll_room',
  '285ffc4e-097e-4e0f-802d-5f2b2426810e', true);
select set_config('test.reroll_user', p.user_id::text, true)
from public.room_players p
where p.room_id = current_setting('test.reroll_room')::uuid
order by p.joined_at, p.id limit 1;
select set_config('request.jwt.claim.sub', current_setting('test.reroll_user'), true);
set local role authenticated;
do $test$
declare s jsonb;
begin
  s := public.luminaria_reroll_status(current_setting('test.reroll_room')::uuid);
  if not coalesce((s->>'available')::boolean, false) then
    raise exception 'Reroll fixture is unavailable: %', s;
  end if;
  perform set_config('test.milestone', s->>'milestone', true);
end;
$test$;
select set_config('test.old_card', card_id, true)
from public.luminaria_hand(current_setting('test.reroll_room')::uuid)
order by hand_position limit 1;
select set_config('test.reroll_result', public.reroll_luminaria_card(
  current_setting('test.reroll_room')::uuid,
  current_setting('test.milestone')::uuid,
  current_setting('test.old_card'))::text, true);
select set_config('test.retry_result', public.reroll_luminaria_card(
  current_setting('test.reroll_room')::uuid,
  current_setting('test.milestone')::uuid,
  current_setting('test.old_card'))::text, true);
reset role;
do $test$
declare result jsonb := current_setting('test.reroll_result')::jsonb;
  retry jsonb := current_setting('test.retry_result')::jsonb;
  seat_id uuid;
begin
  select id into seat_id from public.room_players
    where room_id = current_setting('test.reroll_room')::uuid
      and user_id = current_setting('test.reroll_user')::uuid;
  if result->>'ok' <> 'true' or retry->>'retried' <> 'true'
     or result->>'card_id' is null
     or result->>'card_id' <> retry->>'card_id' then
    raise exception 'Reroll or its idempotent retry failed: %, %', result, retry;
  end if;
  if not exists (select 1 from public.luminaria_card_rerolls
    where room_id = current_setting('test.reroll_room')::uuid
      and milestone_round_id = current_setting('test.milestone')::uuid
      and player_id = current_setting('test.reroll_user')::uuid
      and participant_id = seat_id
      and returned_card_id = current_setting('test.old_card')
      and received_card_id = result->>'card_id') then
    raise exception 'Reroll record did not dual-write seat and user';
  end if;
  if not exists (select 1 from public.room_deck_cards
    where room_id = current_setting('test.reroll_room')::uuid
      and owner_id = current_setting('test.reroll_user')::uuid
      and owner_participant_id = seat_id and card_id = result->>'card_id'
      and not is_played)
     or exists (select 1 from public.room_deck_cards
       where room_id = current_setting('test.reroll_room')::uuid
         and card_id = current_setting('test.old_card')) then
    raise exception 'Reroll did not replace the card in the same seat';
  end if;
end;
$test$;
select set_config('request.jwt.claim.sub', current_setting('test.reroll_user'), true);
set local role authenticated;
do $test$
begin
  if not exists (select 1 from public.luminaria_hand(
    current_setting('test.reroll_room')::uuid)
    where card_id = current_setting('test.reroll_result')::jsonb->>'card_id') then
    raise exception 'Reroll replacement did not appear in the visible hand';
  end if;
end;
$test$;
reset role;

select 'deal, hand, legacy round/play/vote, reroll and retry passed; rollback follows' as result;
rollback;
