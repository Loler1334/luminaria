-- Stage 3A scoring, AFK and rerolls for human-only rooms. Apply after
-- participant-gameplay-3a.sql. Existing RPC signatures and scoring remain.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.finalize_luminaria_round(target_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  active_round public.rounds%rowtype;
  room_row public.rooms%rowtype;
  storyteller_submission uuid;
  correct_votes integer;
  expected_voters integer;
  actual_voters integer;
  participant record;
  card_votes integer;
begin
  -- Existing action triggers lock the round before the room.
  select * into active_round from public.rounds
    where id = target_round_id for update;
  if active_round.id is null then raise exception 'Round not found'; end if;
  select * into room_row from public.rooms
    where id = active_round.room_id for update;
  if not exists (select 1 from public.room_players
    where room_id = active_round.room_id and user_id = (select auth.uid())) then
    raise exception 'Only a room participant can finalize this round';
  end if;
  if active_round.phase = 'results' then return; end if;
  if active_round.phase <> 'voting' then
    raise exception 'This round is not ready for results';
  end if;
  select count(*) - 1 into expected_voters from public.room_players
    where room_id = active_round.room_id;
  select count(*) into actual_voters from public.votes
    where round_id = target_round_id;
  if actual_voters < expected_voters and
     (room_row.phase_deadline_at is null or now() < room_row.phase_deadline_at) then
    raise exception 'Voting is still in progress';
  end if;
  select id into storyteller_submission from public.card_submissions
    where round_id = target_round_id
      and participant_id = active_round.storyteller_participant_id;
  if storyteller_submission is null then raise exception 'Storyteller card is missing'; end if;
  select count(*) into correct_votes from public.votes
    where round_id = target_round_id and submission_id = storyteller_submission;
  for participant in select participant_id, id from public.card_submissions
    where round_id = target_round_id loop
    if participant.participant_id = active_round.storyteller_participant_id then
      if correct_votes > 0 and correct_votes < actual_voters then
        update public.room_players set score = score + 3 + correct_votes
          where id = participant.participant_id
            and room_id = active_round.room_id;
      end if;
    else
      select count(*) into card_votes from public.votes
        where submission_id = participant.id;
      update public.room_players set score = score + card_votes
        where id = participant.participant_id
          and room_id = active_round.room_id;
      if exists (select 1 from public.votes
        where round_id = target_round_id
          and voter_participant_id = participant.participant_id
          and submission_id = storyteller_submission) then
        update public.room_players set score = score + 3
          where id = participant.participant_id
            and room_id = active_round.room_id;
      end if;
    end if;
  end loop;
  update public.rounds set phase = 'results' where id = target_round_id;
  if not exists (select 1 from public.room_deck_cards
    where room_id = active_round.room_id and not is_played) then
    update public.rooms set status = 'finished'
      where id = active_round.room_id;
  end if;
end;
$$;

create or replace function public.skip_expired_phase(
  p_room_id uuid, p_round_id uuid, p_expected_phase text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  round_row public.rounds%rowtype;
  player_row record;
  picked_card text;
  latest_id uuid;
  current_phase text;
  next_seat_id uuid;
  next_user_id uuid;
begin
  if p_expected_phase not in ('awaiting_storyteller', 'submitting', 'voting') then
    raise exception 'Invalid expected phase';
  end if;
  if p_expected_phase <> 'awaiting_storyteller' then
    select * into round_row from public.rounds
      where id = p_round_id and room_id = p_room_id for update;
    if round_row.id is null then raise exception 'Round not found'; end if;
  end if;
  select * into room_row from public.rooms where id = p_room_id for update;
  if room_row.id is null or room_row.status <> 'playing' then
    raise exception 'Room is not playing';
  end if;
  if not exists (select 1 from public.room_players
    where room_id = p_room_id and user_id = (select auth.uid())) then
    raise exception 'Only a room participant can advance the timer';
  end if;
  select id into latest_id from public.rounds where room_id = p_room_id
    order by created_at desc, id desc limit 1;
  current_phase := case when room_row.awaiting_storyteller
    then 'awaiting_storyteller' else round_row.phase end;
  if current_phase is distinct from p_expected_phase or
     (p_expected_phase <> 'awaiting_storyteller'
       and latest_id is distinct from p_round_id) then
    return coalesce(current_phase, 'results');
  end if;
  if room_row.phase_deadline_at is null or now() < room_row.phase_deadline_at then
    raise exception 'Phase deadline has not passed';
  end if;
  if p_expected_phase = 'awaiting_storyteller' then
    next_seat_id := public.luminaria_next_storyteller_seat(
      p_room_id, room_row.current_storyteller_participant_id);
    select user_id into next_user_id from public.room_players
      where id = next_seat_id;
    update public.rooms set
      current_storyteller_participant_id = next_seat_id,
      current_storyteller_id = next_user_id,
      phase_deadline_at = now() + make_interval(secs => room_row.turn_timer_seconds)
    where id = p_room_id;
    return 'awaiting_storyteller';
  end if;
  if p_expected_phase = 'voting' then
    perform public.finalize_luminaria_round(p_round_id);
    return 'results';
  end if;
  for player_row in select id, user_id from public.room_players
    where room_id = p_room_id order by joined_at, id loop
    if exists (select 1 from public.card_submissions
      where round_id = p_round_id and participant_id = player_row.id) then
      continue;
    end if;
    select card_id into picked_card from (
      select card_id from public.room_deck_cards
      where room_id = p_room_id and owner_participant_id = player_row.id
        and not is_played
      order by position, card_id limit 6
    ) visible_hand order by random() limit 1;
    if picked_card is null then raise exception 'A player has no card to submit'; end if;
    update public.room_deck_cards set is_played = true
      where room_id = p_room_id and card_id = picked_card and not is_played;
    if not found then raise exception 'Selected card is no longer available'; end if;
    insert into public.card_submissions(round_id, player_id, participant_id, card_id)
      values(p_round_id, player_row.user_id, player_row.id, picked_card);
    -- The existing AFTER INSERT trigger advances the last submission.
  end loop;
  select phase into current_phase from public.rounds where id = p_round_id;
  if current_phase = 'submitting' then
    update public.rounds set phase = 'voting' where id = p_round_id;
  end if;
  return 'voting';
end;
$$;

create or replace function public.luminaria_reroll_status(target_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  my_seat_id uuid;
  room_row public.rooms%rowtype;
  completed integer;
  round_limit integer;
  latest public.rounds%rowtype;
  milestone public.rounds%rowtype;
  reserve integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into room_row from public.rooms where id = target_room_id;
  select id into my_seat_id from public.room_players
    where room_id = target_room_id and user_id = uid;
  if room_row.id is null or my_seat_id is null then
    raise exception 'Room membership required';
  end if;
  if room_row.status <> 'playing' then
    return jsonb_build_object('available',false,'reason','finished');
  end if;
  select count(*) into completed from public.rounds
    where room_id = target_room_id and phase = 'results';
  select coalesce(max(position),0) into round_limit
    from public.room_deck_cards where room_id = target_room_id;
  if completed < 5 or completed >= round_limit then
    return jsonb_build_object('available',false,'reason','wait');
  end if;
  select * into milestone from public.rounds
    where room_id = target_room_id and phase = 'results'
    order by created_at,id offset ((completed/5)*5-1) limit 1;
  if milestone.id is null then
    return jsonb_build_object('available',false,'reason','wait');
  end if;
  if exists (select 1 from public.luminaria_card_rerolls
    where milestone_round_id = milestone.id and participant_id = my_seat_id) then
    return jsonb_build_object('available',false,'reason','used');
  end if;
  select * into latest from public.rounds where room_id = target_room_id
    order by created_at desc,id desc limit 1;
  if latest.phase not in ('results','submitting') or
     (latest.phase = 'submitting' and exists (
       select 1 from public.card_submissions
       where round_id = latest.id and participant_id = my_seat_id)) then
    return jsonb_build_object('available',false,'reason','wait');
  end if;
  select count(*) into reserve from public.luminaria_deck_catalog c
    where c.deck_id = room_row.deck_id and not exists (
      select 1 from public.room_deck_cards d
      where d.room_id = target_room_id and d.card_id = c.card_id);
  return jsonb_build_object('available',reserve>0,'reason',
    case when reserve=0 then 'empty_reserve' else null end,
    'milestone',milestone.id,'completed',completed,'reserve',reserve);
end;
$$;

create or replace function public.reroll_luminaria_card(
  target_room_id uuid, milestone_round_id uuid, chosen_card_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  my_seat_id uuid;
  room_row public.rooms%rowtype;
  status_data jsonb;
  replacement text;
  position_no integer;
  sixth_position integer;
  old_card text;
  previous_swap public.luminaria_card_rerolls%rowtype;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into room_row from public.rooms where id = target_room_id for update;
  select id into my_seat_id from public.room_players
    where room_id = target_room_id and user_id = uid;
  if room_row.id is null or my_seat_id is null then
    raise exception 'Room membership required';
  end if;
  select r.* into previous_swap from public.luminaria_card_rerolls r
    where r.milestone_round_id = reroll_luminaria_card.milestone_round_id
      and r.participant_id = my_seat_id;
  if previous_swap.milestone_round_id is not null then
    return jsonb_build_object('ok',true,'card_id',
      previous_swap.received_card_id,'retried',true);
  end if;
  status_data := public.luminaria_reroll_status(target_room_id);
  if not coalesce((status_data->>'available')::boolean,false) then
    return jsonb_build_object('ok',false,'reason',status_data->>'reason');
  end if;
  if (status_data->>'milestone')::uuid <> reroll_luminaria_card.milestone_round_id then
    return jsonb_build_object('ok',false,'reason','stale');
  end if;
  if chosen_card_id is not null then
    select position into position_no from public.room_deck_cards
      where room_id = target_room_id and owner_participant_id = my_seat_id
        and card_id = chosen_card_id and not is_played for update;
    select position into sixth_position from public.room_deck_cards
      where room_id = target_room_id and owner_participant_id = my_seat_id
        and not is_played order by position offset 5 limit 1;
    if position_no is null or
       (sixth_position is not null and position_no > sixth_position) then
      return jsonb_build_object('ok',false,'reason','not_in_hand');
    end if;
    select c.card_id into replacement from public.luminaria_deck_catalog c
      where c.deck_id = room_row.deck_id and not exists (
        select 1 from public.room_deck_cards d
        where d.room_id = target_room_id and d.card_id = c.card_id)
      order by random() limit 1;
    if replacement is null then
      return jsonb_build_object('ok',false,'reason','empty_reserve');
    end if;
    old_card := chosen_card_id;
    update public.room_deck_cards set card_id = replacement
      where room_id = target_room_id and owner_participant_id = my_seat_id
        and card_id = chosen_card_id and not is_played;
    if not found then return jsonb_build_object('ok',false,'reason','stale'); end if;
  end if;
  insert into public.luminaria_card_rerolls(
    room_id,milestone_round_id,player_id,participant_id,
    returned_card_id,received_card_id)
  values(target_room_id,reroll_luminaria_card.milestone_round_id,
    uid,my_seat_id,old_card,replacement);
  return jsonb_build_object('ok',true,'card_id',replacement);
end;
$$;

notify pgrst, 'reload schema';
commit;
