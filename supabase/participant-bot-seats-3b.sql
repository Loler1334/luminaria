-- Stage 3B.1: prepare bot seats without enabling bot rooms for clients.
-- Apply only after participant-keys-3a.sql and participant-rls-3a.sql.
-- add/remove RPCs remain revoked until bot actions, client and version gate ship.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.room_players
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_name text,
  add column if not exists bot_avatar text;
alter table public.room_players alter column user_id drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.room_players'::regclass
      and conname = 'room_players_identity_check') then
    alter table public.room_players add constraint room_players_identity_check
      check ((not is_bot and user_id is not null and bot_name is null)
        or (is_bot and user_id is null and bot_name is not null
          and length(btrim(bot_name)) between 1 and 40));
  end if;
end;
$$;
grant select (is_bot, bot_name, bot_avatar)
  on public.room_players to authenticated;

-- A bot is identified by its seat; its legacy user columns stay NULL.
alter table public.rounds alter column storyteller_id drop not null;
alter table public.card_submissions alter column player_id drop not null;
alter table public.votes alter column voter_id drop not null;
alter table public.room_deck_cards alter column owner_id drop not null;
alter table public.luminaria_card_rerolls alter column player_id drop not null;

-- Bot names and human profile names share the room's display-name namespace.
create or replace function public.validate_luminaria_room_seat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  room_status text;
  requested_name text;
begin
  select status into room_status from public.rooms where id = new.room_id;
  if room_status is null then raise exception 'Room not found'; end if;
  if room_status <> 'lobby' then raise exception 'This game has already started'; end if;
  if (select count(*) from public.room_players where room_id = new.room_id) >= 10 then
    raise exception 'This room already has the maximum of 10 players';
  end if;
  if new.is_bot then
    requested_name := btrim(new.bot_name);
  else
    select nickname into requested_name from public.profiles where id = new.user_id;
  end if;
  if new.is_bot and requested_name is null then
    raise exception 'Bot name is required';
  end if;
  if requested_name is not null and exists (
    select 1 from public.room_players seat
    left join public.profiles profile on profile.id = seat.user_id
    where seat.room_id = new.room_id
      and lower(btrim(coalesce(seat.bot_name, profile.nickname))) = lower(requested_name)
  ) then
    raise exception 'This nickname is already used in the room';
  end if;
  return new;
end;
$$;

-- Keep the 3A storyteller queue unchanged: bot seats take normal turns.
-- Its BEFORE guard runs before the participant sync trigger. Resolve a
-- human's legacy ID or a bot's participant-only ID before checking the turn.
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
  if new.storyteller_id is not null then
    select id into new_seat_id from public.room_players
      where room_id = new.room_id and user_id = new.storyteller_id
        and not is_bot;
  elsif new.storyteller_participant_id is not null then
    select id into new_seat_id from public.room_players
      where id = new.storyteller_participant_id and room_id = new.room_id
        and is_bot;
  end if;
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

-- Preserve the human RPC contract; conflict is now unique per seat.
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
    where room_id = active_room and user_id = (select auth.uid())
      and not is_bot;
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
    on conflict (round_id, participant_id) do nothing;
end;
$$;

-- These RPCs are created without an authenticated EXECUTE grant. Host calls
-- become available only in the 3B client/actions release.
create or replace function public.add_luminaria_bot(target_room_id uuid)
returns public.room_players language plpgsql security definer set search_path = '' as $$
declare
  target_room public.rooms%rowtype;
  chosen record;
  added public.room_players%rowtype;
begin
  select * into target_room from public.rooms where id = target_room_id for update;
  if target_room.id is null or target_room.host_id is distinct from (select auth.uid())
     or target_room.status <> 'lobby' then
    raise exception 'Only the host can add a bot in the lobby';
  end if;
  if (select count(*) from public.room_players where room_id = target_room_id) >= 10 then
    raise exception 'This room already has the maximum of 10 players';
  end if;
  select pool.bot_name, pool.bot_avatar into chosen
  from (values
    (1, 'Лунный Архивариус', '☽'),
    (2, 'Звёздный Плут', '✦'),
    (3, 'Хранитель Маяка', '✺'),
    (4, 'Тень Часовщика', '⌛'),
    (5, 'Кометный Гоблин', '☄'),
    (6, 'Сонный Оракул', '◇'),
    (7, 'Космический Пекарь', '✧'),
    (8, 'Пыльный Дракон', '♢'),
    (9, 'Сырный Астроном', '☼')
  ) as pool(priority, bot_name, bot_avatar)
  where not exists (
    select 1 from public.room_players seat
    left join public.profiles profile on profile.id = seat.user_id
    where seat.room_id = target_room_id
      and lower(btrim(coalesce(seat.bot_name, profile.nickname))) = lower(pool.bot_name)
  )
  order by pool.priority limit 1;
  if chosen.bot_name is null then raise exception 'No bot profile is available'; end if;
  insert into public.room_players(room_id, user_id, is_bot, bot_name, bot_avatar, is_ready)
    values(target_room_id, null, true, chosen.bot_name, chosen.bot_avatar, true)
    returning * into added;
  return added;
end;
$$;

create or replace function public.remove_luminaria_bot(
  target_room_id uuid, target_participant_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target_room public.rooms%rowtype;
begin
  select * into target_room from public.rooms where id = target_room_id for update;
  if target_room.id is null or target_room.host_id is distinct from (select auth.uid())
     or target_room.status <> 'lobby' then
    raise exception 'Only the host can remove a bot in the lobby';
  end if;
  delete from public.room_players
    where id = target_participant_id and room_id = target_room_id and is_bot;
  return found;
end;
$$;

revoke all on function public.add_luminaria_bot(uuid)
  from public, anon, authenticated;
revoke all on function public.remove_luminaria_bot(uuid,uuid)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
