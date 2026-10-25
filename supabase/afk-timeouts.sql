-- Apply after guard-incomplete-voting.sql and turn-state.sql.
begin;

create or replace function public.finalize_luminaria_round(target_round_id uuid)
returns void language plpgsql security definer set search_path = public as $$
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
  -- Normal card/vote actions lock the round before the room. Keep that order.
  select * into active_round from public.rounds where id = target_round_id for update;
  if active_round.id is null then raise exception 'Round not found'; end if;
  select * into room_row from public.rooms where id = active_round.room_id for update;
  if not exists (select 1 from public.room_players
    where room_id = active_round.room_id and user_id = auth.uid()) then
    raise exception 'Only a room participant can finalize this round';
  end if;
  if active_round.phase = 'results' then return; end if;
  if active_round.phase <> 'voting' then raise exception 'This round is not ready for results'; end if;
  select count(*) - 1 into expected_voters from public.room_players
    where room_id = active_round.room_id;
  select count(*) into actual_voters from public.votes where round_id = target_round_id;
  if actual_voters < expected_voters and
     (room_row.phase_deadline_at is null or now() < room_row.phase_deadline_at) then
    raise exception 'Voting is still in progress';
  end if;
  select id into storyteller_submission from public.card_submissions
    where round_id = target_round_id and player_id = active_round.storyteller_id;
  if storyteller_submission is null then raise exception 'Storyteller card is missing'; end if;
  select count(*) into correct_votes from public.votes
    where round_id = target_round_id and submission_id = storyteller_submission;
  for participant in select player_id, id from public.card_submissions
    where round_id = target_round_id loop
    if participant.player_id = active_round.storyteller_id then
      if correct_votes > 0 and correct_votes < actual_voters then
        update public.room_players set score = score + 3 + correct_votes
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    else
      select count(*) into card_votes from public.votes where submission_id = participant.id;
      update public.room_players set score = score + card_votes
        where room_id = active_round.room_id and user_id = participant.player_id;
      if exists (select 1 from public.votes where round_id = target_round_id
        and voter_id = participant.player_id and submission_id = storyteller_submission) then
        update public.room_players set score = score + 3
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    end if;
  end loop;
  update public.rounds set phase = 'results' where id = target_round_id;
  if not exists (select 1 from public.room_deck_cards
    where room_id = active_round.room_id and not is_played) then
    update public.rooms set status = 'finished' where id = active_round.room_id;
  end if;
end;
$$;

create or replace function public.skip_expired_phase(
  p_room_id uuid, p_round_id uuid, p_expected_phase text)
returns text language plpgsql security definer set search_path = public as $$
declare
  room_row public.rooms%rowtype;
  round_row public.rounds%rowtype;
  player_row record;
  picked_card text;
  latest_id uuid;
  current_phase text;
begin
  if p_expected_phase not in ('awaiting_storyteller', 'submitting', 'voting') then
    raise exception 'Invalid expected phase';
  end if;
  -- A live card/vote action already holds the round lock when its trigger runs.
  if p_expected_phase <> 'awaiting_storyteller' then
    select * into round_row from public.rounds where id = p_round_id
      and room_id = p_room_id for update;
    if round_row.id is null then raise exception 'Round not found'; end if;
  end if;
  select * into room_row from public.rooms where id = p_room_id for update;
  if room_row.id is null or room_row.status <> 'playing' then
    raise exception 'Room is not playing';
  end if;
  if not exists (select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Only a room participant can advance the timer';
  end if;
  select id into latest_id from public.rounds where room_id = p_room_id
    order by created_at desc, id desc limit 1;
  current_phase := case when room_row.awaiting_storyteller then 'awaiting_storyteller'
    else round_row.phase end;
  if current_phase is distinct from p_expected_phase or
     (p_expected_phase <> 'awaiting_storyteller' and latest_id is distinct from p_round_id) then
    return coalesce(current_phase, 'results');
  end if;
  if room_row.phase_deadline_at is null or now() < room_row.phase_deadline_at then
    raise exception 'Phase deadline has not passed';
  end if;
  if p_expected_phase = 'awaiting_storyteller' then
    update public.rooms set
      current_storyteller_id = public.luminaria_next_storyteller(
        p_room_id, room_row.current_storyteller_id),
      phase_deadline_at = now() + make_interval(secs => room_row.turn_timer_seconds)
    where id = p_room_id;
    return 'awaiting_storyteller';
  end if;
  if p_expected_phase = 'voting' then
    perform public.finalize_luminaria_round(p_round_id);
    return 'results';
  end if;

  for player_row in select user_id from public.room_players
    where room_id = p_room_id order by joined_at, user_id loop
    if exists (select 1 from public.card_submissions
      where round_id = p_round_id and player_id = player_row.user_id) then
      continue;
    end if;
    select card_id into picked_card from (
      select card_id from public.room_deck_cards
      where room_id = p_room_id and owner_id = player_row.user_id and not is_played
      order by position, card_id limit 6
    ) visible_hand order by random() limit 1;
    if picked_card is null then raise exception 'A player has no card to submit'; end if;
    update public.room_deck_cards set is_played = true
      where room_id = p_room_id and card_id = picked_card and not is_played;
    if not found then raise exception 'Selected card is no longer available'; end if;
    insert into public.card_submissions(round_id, player_id, card_id)
      values (p_round_id, player_row.user_id, picked_card);
    -- The existing AFTER INSERT trigger advances the last submission to voting.
  end loop;
  select phase into current_phase from public.rounds where id = p_round_id;
  if current_phase = 'submitting' then
    update public.rounds set phase = 'voting' where id = p_round_id;
  end if;
  return 'voting';
end;
$$;

create or replace function public.luminaria_timer_state(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare room_row public.rooms%rowtype;
begin
  select * into room_row from public.rooms where id = p_room_id;
  if room_row.id is null or not exists (select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Only room members can read this timer';
  end if;
  return jsonb_build_object('deadline', room_row.phase_deadline_at,
    'remaining_ms', case when room_row.phase_deadline_at is null then null
      else greatest(0, extract(epoch from (room_row.phase_deadline_at - now())) * 1000) end);
end;
$$;

revoke all on function public.skip_expired_phase(uuid,uuid,text) from public, anon;
grant execute on function public.skip_expired_phase(uuid,uuid,text) to authenticated;
revoke all on function public.luminaria_timer_state(uuid) from public, anon;
grant execute on function public.luminaria_timer_state(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
