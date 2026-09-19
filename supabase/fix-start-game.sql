create or replace function public.start_luminaria_game(
  target_room_id uuid,
  card_ids text[]
)
returns table (cards_per_player integer, total_rounds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  player_count integer;
  usable_cards integer;
begin
  if not exists (
    select 1 from public.rooms
    where id = target_room_id and host_id = auth.uid() and status = 'lobby'
  ) then
    raise exception 'Only the host can start a lobby room';
  end if;

  select count(*) into player_count
  from public.room_players
  where room_id = target_room_id;

  if player_count < 3 then
    raise exception 'At least three players are required';
  end if;

  if exists (
    select 1 from public.room_players
    where room_id = target_room_id and not is_ready
  ) then
    raise exception 'Every player must be ready';
  end if;

  if array_length(card_ids, 1) is null
    or array_length(card_ids, 1) <> (select count(distinct card) from unnest(card_ids) as card) then
    raise exception 'Deck cards must be unique';
  end if;

  usable_cards := (array_length(card_ids, 1) / player_count) * player_count;
  if usable_cards = 0 then
    raise exception 'Not enough cards for this room';
  end if;

  delete from public.room_deck_cards where room_id = target_room_id;

  insert into public.room_deck_cards (room_id, card_id, owner_id, position)
  select target_room_id, ordered.card_id, players.user_id, ordered.position
  from (
    select
      card_id,
      ((ordinality - 1) / player_count) + 1 as position,
      ((ordinality - 1) % player_count) + 1 as player_index
    from unnest(card_ids[1:usable_cards]) with ordinality as deck(card_id, ordinality)
  ) ordered
  join (
    select user_id, row_number() over (order by joined_at) as player_index
    from public.room_players
    where room_id = target_room_id
  ) players using (player_index);

  update public.rooms
    set status = 'playing'
    where id = target_room_id and status = 'lobby';

  if not found then
    raise exception 'This room has already started';
  end if;

  return query select usable_cards / player_count, usable_cards / player_count;
end;
$$;

grant execute on function public.start_luminaria_game(uuid, text[]) to authenticated;
