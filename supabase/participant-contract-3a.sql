-- Stage 3A, compatible contract. Apply after participant-references-expand.sql.
-- Human-only rooms keep all legacy IDs and RPC signatures.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

-- Live grants already expose the other participant reference columns via
-- table-level SELECT. room_players uses column grants and lacks id.
grant select (id) on public.room_players to authenticated;

-- Keep old writers (legacy ID only) and future participant-only writers in
-- sync. A changed legacy ID wins over an unchanged participant ID during
-- account recovery; a changed participant ID wins over an unchanged legacy
-- ID. Explicitly contradictory values are rejected.
create or replace function public.sync_luminaria_participant_reference()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  seat_room_id uuid;
  legacy_user_id uuid;
  previous_user_id uuid;
  participant_id uuid;
  previous_participant_id uuid;
  matching_seat_id uuid;
  matching_user_id uuid;
  participant_changed boolean;
  legacy_changed boolean;
begin
  case tg_table_name
    when 'rooms' then
      seat_room_id := new.id;
      legacy_user_id := new.current_storyteller_id;
      participant_id := new.current_storyteller_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.current_storyteller_id;
        previous_participant_id := old.current_storyteller_participant_id;
      end if;
    when 'rounds' then
      seat_room_id := new.room_id;
      legacy_user_id := new.storyteller_id;
      participant_id := new.storyteller_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.storyteller_id;
        previous_participant_id := old.storyteller_participant_id;
      end if;
    when 'card_submissions' then
      select room_id into seat_room_id from public.rounds where id = new.round_id;
      legacy_user_id := new.player_id;
      participant_id := new.participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.player_id;
        previous_participant_id := old.participant_id;
      end if;
    when 'votes' then
      select room_id into seat_room_id from public.rounds where id = new.round_id;
      legacy_user_id := new.voter_id;
      participant_id := new.voter_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.voter_id;
        previous_participant_id := old.voter_participant_id;
      end if;
    when 'room_deck_cards' then
      seat_room_id := new.room_id;
      legacy_user_id := new.owner_id;
      participant_id := new.owner_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.owner_id;
        previous_participant_id := old.owner_participant_id;
      end if;
    when 'luminaria_card_rerolls' then
      seat_room_id := new.room_id;
      legacy_user_id := new.player_id;
      participant_id := new.participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.player_id;
        previous_participant_id := old.participant_id;
      end if;
    else
      raise exception 'Unsupported participant reference table: %', tg_table_name;
  end case;

  if seat_room_id is null then raise exception 'Participant reference has no room'; end if;
  participant_changed := tg_op = 'UPDATE'
    and participant_id is distinct from previous_participant_id;
  legacy_changed := tg_op = 'UPDATE'
    and legacy_user_id is distinct from previous_user_id;

  if participant_changed and not legacy_changed then
    -- A new writer changed only the seat. Resolve its human user ID.
    select seat.user_id into matching_user_id from public.room_players seat
      where seat.id = participant_id and seat.room_id = seat_room_id;
    if not found then
      if participant_id is not null then raise exception 'Invalid participant reference'; end if;
      if tg_table_name not in ('rooms', 'room_deck_cards') then
        raise exception 'Participant reference is required';
      end if;
    end if;
    legacy_user_id := matching_user_id;
  elsif legacy_user_id is not null then
    select seat.id into matching_seat_id from public.room_players seat
      where seat.room_id = seat_room_id and seat.user_id = legacy_user_id;
    if matching_seat_id is null and legacy_changed and not participant_changed
       and participant_id = previous_participant_id
       and exists (select 1 from public.room_players seat
         where seat.id = participant_id and seat.room_id = seat_room_id
           and seat.user_id = previous_user_id) then
      -- reclaim_luminaria_seat updates legacy children before the seat user.
      matching_seat_id := participant_id;
    end if;
    if matching_seat_id is null then raise exception 'No room seat for legacy game user'; end if;
    if participant_id is not null and participant_id <> matching_seat_id
       and (tg_op = 'INSERT' or participant_changed) then
      raise exception 'Conflicting participant and legacy user';
    end if;
    participant_id := matching_seat_id;
  elsif participant_id is not null and not
    (legacy_changed and not participant_changed
      and tg_table_name in ('rooms', 'room_deck_cards')) then
    select seat.user_id into matching_user_id from public.room_players seat
      where seat.id = participant_id and seat.room_id = seat_room_id;
    if not found then raise exception 'Invalid participant reference'; end if;
    legacy_user_id := matching_user_id;
  elsif tg_table_name in ('rooms', 'room_deck_cards') then
    -- A legacy writer clearing a human owner clears the matching seat too.
    participant_id := null;
  else
    raise exception 'Participant reference is required';
  end if;

  case tg_table_name
    when 'rooms' then
      new.current_storyteller_id := legacy_user_id;
      new.current_storyteller_participant_id := participant_id;
    when 'rounds' then
      new.storyteller_id := legacy_user_id;
      new.storyteller_participant_id := participant_id;
    when 'card_submissions' then
      new.player_id := legacy_user_id;
      new.participant_id := participant_id;
    when 'votes' then
      new.voter_id := legacy_user_id;
      new.voter_participant_id := participant_id;
    when 'room_deck_cards' then
      new.owner_id := legacy_user_id;
      new.owner_participant_id := participant_id;
    when 'luminaria_card_rerolls' then
      new.player_id := legacy_user_id;
      new.participant_id := participant_id;
  end case;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
