-- Hosts may remove a participant while the room is still in the lobby.
begin;

create or replace function public.kick_luminaria_player(target_room_id uuid, target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_room public.rooms%rowtype;
begin
  select * into current_room
  from public.rooms
  where id = target_room_id
  for update;

  if current_room.id is null
     or current_room.host_id is distinct from (select auth.uid())
     or current_room.status <> 'lobby' then
    raise exception 'Only the lobby host can remove players';
  end if;

  if target_user_id = current_room.host_id then
    raise exception 'The host cannot remove themselves';
  end if;

  delete from public.room_players
  where room_id = target_room_id and user_id = target_user_id;

  if not found then
    raise exception 'Player is no longer in the lobby';
  end if;

  return true;
end;
$$;

revoke all on function public.kick_luminaria_player(uuid, uuid) from public, anon;
grant execute on function public.kick_luminaria_player(uuid, uuid) to authenticated;

commit;
