-- Run this once in Supabase SQL Editor to enable a rematch in the same room.
create or replace function public.restart_luminaria_room(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms
    where id = target_room_id and host_id = auth.uid()
  ) then
    raise exception 'Only the host can start a rematch';
  end if;

  -- Removing rounds cascades safely to submissions and votes.
  delete from public.rounds where room_id = target_room_id;
  delete from public.room_deck_cards where room_id = target_room_id;

  update public.room_players
  set score = 0, is_ready = false
  where room_id = target_room_id;

  update public.rooms
  set status = 'lobby'
  where id = target_room_id;
end;
$$;

grant execute on function public.restart_luminaria_room(uuid) to authenticated;
