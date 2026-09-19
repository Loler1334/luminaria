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
  dealt_cards integer;
  dealt_rounds integer;
begin
  if not exists (
    select 1 from public.rooms
    where id = target_room_id and host_id = auth.uid() and status = 'lobby'
  ) then
    raise exception 'Only the host can start a lobby room';
  end if;

  if (select count(*) from public.room_players where room_id = target_room_id) < 3 then
    raise exception 'At least three players are required';
  end if;

  if exists (
    select 1 from public.room_players
    where room_id = target_room_id and not is_ready
  ) then
    raise exception 'Every player must be ready';
  end if;

  select cards_per_player, total_rounds
    into dealt_cards, dealt_rounds
  from public.initialize_luminaria_deck(target_room_id, card_ids);

  update public.rooms
    set status = 'playing'
    where id = target_room_id and status = 'lobby';

  if not found then
    raise exception 'This room has already started';
  end if;

  return query select dealt_cards, dealt_rounds;
end;
$$;

grant execute on function public.start_luminaria_game(uuid, text[]) to authenticated;
