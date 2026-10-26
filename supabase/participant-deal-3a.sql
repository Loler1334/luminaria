-- Stage 3A deck allocation. Apply after participant-contract-3a.sql.
-- Preserve old return shapes and legacy owner_id for existing clients.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

-- The existing rooms constraint still enforces >= 2 even though the client
-- offers one complete cycle for tables of 7-10 people.
alter table public.rooms drop constraint if exists rooms_round_cycles_check;
alter table public.rooms add constraint rooms_round_cycles_check
  check (round_cycles >= 1);

create or replace function public.start_luminaria_game(
  target_room_id uuid, card_ids text[])
returns table(cards_per_player integer, total_rounds integer)
language plpgsql security definer set search_path = '' as $$
declare
  player_count integer;
  usable_cards integer;
  minimum_cycles integer;
begin
  perform 1 from public.rooms where id = target_room_id for update;
  if not exists (select 1 from public.rooms
    where id = target_room_id and host_id = (select auth.uid())
      and status = 'lobby') then
    raise exception 'Only the host can start a lobby room';
  end if;
  lock table public.room_players in share row exclusive mode;
  select count(*) into player_count from public.room_players
    where room_id = target_room_id;
  if player_count < 3 or player_count > 10 then
    raise exception 'A room needs 3 to 10 players';
  end if;
  if exists (select 1 from public.room_players
    where room_id = target_room_id and not is_ready) then
    raise exception 'Every player must be ready';
  end if;
  if array_length(card_ids, 1) is null or
     array_length(card_ids, 1) <> (
       select count(distinct card) from unnest(card_ids) as card) then
    raise exception 'Deck cards must be unique';
  end if;
  usable_cards := array_length(card_ids, 1);
  minimum_cycles := case when player_count >= 7 then 1 else 2 end;
  if usable_cards % (player_count * player_count) <> 0 or
     usable_cards < minimum_cycles * player_count * player_count then
    raise exception 'Choose enough cards for complete storyteller cycles; refresh the lobby after player changes';
  end if;
  delete from public.room_deck_cards where room_id = target_room_id;
  insert into public.room_deck_cards(
    room_id,card_id,owner_id,owner_participant_id,position)
  select target_room_id, ordered.card_id,
    players.user_id, players.id, ordered.position
  from (
    select card_id, ((ordinality-1)/player_count)+1 as position,
      ((ordinality-1)%player_count)+1 as player_index
    from unnest(card_ids[1:usable_cards])
      with ordinality as deck(card_id,ordinality)
  ) ordered
  join (
    select id,user_id,
      row_number() over(order by joined_at,id) as player_index
    from public.room_players where room_id = target_room_id
  ) players using(player_index);
  update public.rooms
    set status = 'playing',
      round_cycles = usable_cards/(player_count*player_count)
    where id = target_room_id and status = 'lobby';
  if not found then raise exception 'This room has already started'; end if;
  return query select usable_cards/player_count, usable_cards/player_count;
end;
$$;

-- Older room setup paths still call this RPC; make its allocation use seats
-- as well, without changing its historical validation or return contract.
create or replace function public.initialize_luminaria_deck(
  target_room_id uuid, card_ids text[])
returns table(cards_per_player integer, total_rounds integer)
language plpgsql security definer set search_path = '' as $$
declare
  player_count integer;
  usable_cards integer;
begin
  if not exists (select 1 from public.rooms
    where id = target_room_id and host_id = (select auth.uid())) then
    raise exception 'Only the host can initialize this deck';
  end if;
  select count(*) into player_count from public.room_players
    where room_id = target_room_id;
  if player_count < 3 then
    raise exception 'At least three players are required';
  end if;
  if array_length(card_ids, 1) is null or
     array_length(card_ids, 1) <> (
       select count(distinct card) from unnest(card_ids) as card) then
    raise exception 'Deck cards must be unique';
  end if;
  usable_cards := (array_length(card_ids, 1) / player_count) * player_count;
  if usable_cards = 0 then raise exception 'Not enough cards for this room'; end if;
  if exists (select 1 from public.room_deck_cards
    where room_id = target_room_id) then
    return query select coalesce(max(position),0),coalesce(max(position),0)
      from public.room_deck_cards where room_id = target_room_id;
    return;
  end if;
  insert into public.room_deck_cards(
    room_id,card_id,owner_id,owner_participant_id,position)
  select target_room_id,ordered.card_id,
    players.user_id,players.id,ordered.position
  from (
    select card_id,((ordinality-1)/player_count)+1 as position,
      ((ordinality-1)%player_count)+1 as player_index
    from unnest(card_ids[1:usable_cards])
      with ordinality as deck(card_id,ordinality)
  ) ordered
  join (
    select id,user_id,
      row_number() over(order by joined_at,id) as player_index
    from public.room_players where room_id = target_room_id
  ) players using(player_index);
  return query select usable_cards/player_count, usable_cards/player_count;
end;
$$;

notify pgrst, 'reload schema';
commit;
