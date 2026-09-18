-- Run this once in Supabase SQL Editor after gameplay.sql.
-- Starts a room atomically: validates the table, deals the deck, then opens play.
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
  active_room public.rooms%rowtype;
begin
  select * into active_room from public.rooms where id = target_room_id for update;
  if active_room.id is null then
    raise exception 'Room not found';
  end if;
  if active_room.host_id <> auth.uid() then
    raise exception 'Only the host can start this game';
  end if;
  if active_room.status <> 'lobby' then
    raise exception 'This room has already started';
  end if;
  if (select count(*) from public.room_players where room_id = target_room_id) < 3 then
    raise exception 'At least three players are required';
  end if;
  if exists (select 1 from public.room_players where room_id = target_room_id and not is_ready) then
    raise exception 'Every player must be ready';
  end if;

  return query select * from public.initialize_luminaria_deck(target_room_id, card_ids);
  update public.rooms set status = 'playing' where id = target_room_id;
end;
$$;

grant execute on function public.start_luminaria_game(uuid, text[]) to authenticated;
