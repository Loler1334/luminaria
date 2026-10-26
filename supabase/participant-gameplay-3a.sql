-- Stage 3A gameplay cutover for human-only rooms. Apply after
-- participant-contract-3a.sql. Keep the existing RPC signatures, outputs,
-- game scoring and old-client legacy writes.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.luminaria_next_storyteller_seat(
  target_room_id uuid, previous_participant_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  with ordered as (
    select id, row_number() over (order by joined_at, id) as position
    from public.room_players where room_id = target_room_id
  )
  select coalesce(
    (select next_seat.id from ordered prior
      join ordered next_seat on next_seat.position = prior.position + 1
      where prior.id = previous_participant_id),
    (select id from ordered order by position limit 1));
$$;
revoke all on function public.luminaria_next_storyteller_seat(uuid,uuid)
  from public, anon, authenticated;

-- Preserve the old internal signature until every caller is migrated.
create or replace function public.luminaria_next_storyteller(
  target_room_id uuid, previous_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select next_seat.user_id
  from public.room_players next_seat
  where next_seat.id = public.luminaria_next_storyteller_seat(
    target_room_id,
    (select previous_seat.id from public.room_players previous_seat
      where previous_seat.room_id = target_room_id
        and previous_seat.user_id = previous_id));
$$;

create or replace function public.luminaria_room_turn_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  next_id uuid;
  next_user_id uuid;
  round_limit integer;
  round_count integer;
begin
  if tg_table_name = 'rooms' then
    if old.status = 'lobby' and new.status = 'playing' then
      select id into new.current_storyteller_participant_id
      from public.room_players where room_id = new.id and user_id = new.host_id;
      if new.current_storyteller_participant_id is null then
        raise exception 'The host has no room seat';
      end if;
      new.current_storyteller_id := new.host_id;
      new.awaiting_storyteller := true;
      new.phase_deadline_at := case when new.turn_timer_seconds is null then null
        else now() + make_interval(secs => new.turn_timer_seconds) end;
    elsif new.status <> 'playing' then
      new.awaiting_storyteller := false;
      new.phase_deadline_at := null;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    update public.rooms set awaiting_storyteller = false,
      phase_deadline_at = case when turn_timer_seconds is null then null
        else now() + make_interval(secs => turn_timer_seconds) end
    where id = new.room_id;
    return new;
  end if;
  if old.phase is distinct from new.phase then
    if new.phase = 'voting' then
      update public.rooms set phase_deadline_at = case
        when turn_timer_seconds is null then null
        else now() + make_interval(secs => turn_timer_seconds) end
      where id = new.room_id;
    elsif new.phase = 'results' then
      select count(*) into round_count from public.rounds where room_id = new.room_id;
      select coalesce(max(position), 0) into round_limit
        from public.room_deck_cards where room_id = new.room_id;
      if round_count < round_limit then
        next_id := public.luminaria_next_storyteller_seat(
          new.room_id, new.storyteller_participant_id);
        select user_id into next_user_id from public.room_players where id = next_id;
      end if;
      update public.rooms set current_storyteller_participant_id = next_id,
        current_storyteller_id = next_user_id,
        awaiting_storyteller = false, phase_deadline_at = null
      where id = new.room_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_luminaria_round_creation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  previous_round public.rounds%rowtype;
  new_seat_id uuid;
  round_count integer;
  round_limit integer;
begin
  select * into room_row from public.rooms where id = new.room_id for update;
  -- BEFORE guard runs alphabetically before the participant sync trigger.
  -- Resolve the old client's storyteller_id without changing its request.
  select id into new_seat_id from public.room_players
    where room_id = new.room_id and user_id = new.storyteller_id;
  if new_seat_id is null or
     (new.storyteller_participant_id is not null
       and new.storyteller_participant_id <> new_seat_id) then
    raise exception 'It is another player''s turn to tell a clue';
  end if;
  if room_row.status = 'playing' and not room_row.awaiting_storyteller
     and new_seat_id = room_row.current_storyteller_participant_id then
    select * into previous_round from public.rounds where room_id = new.room_id
      order by created_at desc, id desc limit 1;
    if previous_round.id is not null and previous_round.phase = 'results' then
      update public.rooms set awaiting_storyteller = true,
        phase_deadline_at = case when turn_timer_seconds is null then null
          else now() + make_interval(secs => turn_timer_seconds) end
      where id = new.room_id;
      room_row.awaiting_storyteller := true;
    end if;
  end if;
  if room_row.status <> 'playing' or not room_row.awaiting_storyteller
     or new_seat_id is distinct from room_row.current_storyteller_participant_id then
    raise exception 'It is another player''s turn to tell a clue';
  end if;
  select count(*) into round_count from public.rounds where room_id = new.room_id;
  select coalesce(max(position), 0) into round_limit
    from public.room_deck_cards where room_id = new.room_id;
  if round_limit = 0 or round_count >= round_limit then
    raise exception 'The round limit has been reached';
  end if;
  select * into previous_round from public.rounds where room_id = new.room_id
    order by created_at desc, id desc limit 1;
  if previous_round.id is not null and previous_round.phase <> 'results' then
    raise exception 'Finish the current round first';
  end if;
  new.storyteller_participant_id := new_seat_id;
  return new;
end;
$$;

create or replace function public.start_next_turn(p_room_id uuid)
returns public.rooms language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  latest_round public.rounds%rowtype;
  round_count integer;
  round_limit integer;
begin
  select * into room_row from public.rooms where id = p_room_id for update;
  if room_row.id is null or room_row.status <> 'playing' then
    raise exception 'Room is not playing';
  end if;
  if not exists (select 1 from public.room_players
    where room_id = p_room_id and user_id = (select auth.uid())) then
    raise exception 'Only a room participant can start the next turn';
  end if;
  if room_row.awaiting_storyteller then return room_row; end if;
  select * into latest_round from public.rounds where room_id = p_room_id
    order by created_at desc, id desc limit 1;
  if latest_round.id is null or latest_round.phase <> 'results' then
    raise exception 'The current round is not finished';
  end if;
  select count(*) into round_count from public.rounds where room_id = p_room_id;
  select coalesce(max(position), 0) into round_limit
    from public.room_deck_cards where room_id = p_room_id;
  if round_count >= round_limit or room_row.current_storyteller_participant_id is null then
    raise exception 'The game has reached its round limit';
  end if;
  update public.rooms set awaiting_storyteller = true,
    phase_deadline_at = case when turn_timer_seconds is null then null
      else now() + make_interval(secs => turn_timer_seconds) end
  where id = p_room_id returning * into room_row;
  return room_row;
end;
$$;

create or replace function public.luminaria_hand(target_room_id uuid)
returns table(card_id text, hand_position integer, remaining integer)
language sql security definer set search_path = '' as $$
  select card.card_id, card.position, count(*) over ()::integer
  from public.room_deck_cards card
  join public.room_players seat
    on seat.id = card.owner_participant_id and seat.room_id = card.room_id
  where card.room_id = target_room_id and seat.user_id = (select auth.uid())
    and not card.is_played
  order by card.position limit 6;
$$;

create or replace function public.play_luminaria_card(
  target_round_id uuid, chosen_card_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  active_room uuid;
  my_seat_id uuid;
  previous_card text;
begin
  select room_id into active_room from public.rounds
    where id = target_round_id and phase = 'submitting' for update;
  select id into my_seat_id from public.room_players
    where room_id = active_room and user_id = (select auth.uid());
  if my_seat_id is null then raise exception 'You cannot play in this round'; end if;
  select card_id into previous_card from public.card_submissions
    where round_id = target_round_id and participant_id = my_seat_id;
  if previous_card is not null then
    if previous_card <> chosen_card_id then
      raise exception 'A card has already been submitted for this round';
    end if;
    return;
  end if;
  update public.room_deck_cards set is_played = true
    where room_id = active_room and card_id = chosen_card_id
      and owner_participant_id = my_seat_id and not is_played;
  if not found then raise exception 'This card is not in your hand'; end if;
  insert into public.card_submissions(round_id, player_id, participant_id, card_id)
    values(target_round_id, (select auth.uid()), my_seat_id, chosen_card_id)
    on conflict (round_id, player_id) do nothing;
end;
$$;

-- The sync trigger precedes validate_luminaria_vote alphabetically. Both an
-- old direct INSERT(voter_id) and a future trusted seat writer are checked
-- against stable seat IDs here.
create or replace function public.validate_luminaria_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  round_storyteller uuid;
  active_phase text;
  card_owner uuid;
begin
  select storyteller_participant_id, phase into round_storyteller, active_phase
    from public.rounds where id = new.round_id;
  if round_storyteller is null then raise exception 'Round not found'; end if;
  if active_phase <> 'voting' then raise exception 'This round is not accepting votes'; end if;
  select participant_id into card_owner from public.card_submissions
    where id = new.submission_id and round_id = new.round_id;
  if card_owner is null then raise exception 'The selected card is not in this round'; end if;
  if new.voter_participant_id = round_storyteller then
    raise exception 'The storyteller cannot vote in their own round';
  end if;
  if new.voter_participant_id = card_owner then
    raise exception 'A player cannot vote for their own card';
  end if;
  return new;
end;
$$;

-- The old result shape is deliberately unchanged. Progress is computed by
-- seat, while an old client still receives human user_id for its roster.
create or replace function public.luminaria_round_waiting(target_round_id uuid)
returns table(user_id uuid, has_submitted boolean, has_voted boolean)
language plpgsql security definer set search_path = '' as $$
declare active_room uuid;
begin
  select r.room_id into active_room from public.rounds r where r.id = target_round_id;
  if not exists (select 1 from public.room_players p
    where p.room_id = active_room and p.user_id = (select auth.uid())) then
    raise exception 'Only room members can view progress';
  end if;
  return query select p.user_id,
    exists(select 1 from public.card_submissions s
      where s.round_id = target_round_id and s.participant_id = p.id),
    exists(select 1 from public.votes v
      where v.round_id = target_round_id and v.voter_participant_id = p.id)
    from public.room_players p where p.room_id = active_room
    order by p.joined_at, p.id;
end;
$$;

notify pgrst, 'reload schema';
commit;
