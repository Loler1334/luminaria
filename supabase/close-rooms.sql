-- Closing a lobby is distinct from finishing a played game.
begin;

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('lobby', 'playing', 'finished', 'closed'));

-- A player may host only one waiting room. Opening a new one closes the old
-- lobby immediately, even if the old tab was simply abandoned.
create or replace function public.create_luminaria_room(room_code text, public_room boolean)
returns setof public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  created_room public.rooms%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if upper(btrim(room_code)) !~ '^[A-Z0-9]{6}$' then raise exception 'Invalid room code'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'Create your player profile before opening a room';
  end if;
  update public.rooms set status = 'closed', is_public = false
  where host_id = current_user_id and status = 'lobby';
  insert into public.rooms (code, host_id, is_public)
  values (upper(btrim(room_code)), current_user_id, coalesce(public_room, false))
  returning * into created_room;
  insert into public.room_players (room_id, user_id)
  values (created_room.id, current_user_id);
  return next created_room;
end;
$$;

create or replace function public.close_luminaria_room(target_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rooms set status = 'closed', is_public = false
  where id = target_room_id and host_id = (select auth.uid()) and status = 'lobby';
  if not found then raise exception 'Only the host can close a waiting room'; end if;
end;
$$;

revoke all on function public.close_luminaria_room(uuid) from public, anon;
revoke all on function public.create_luminaria_room(text, boolean) from public, anon;
grant execute on function public.close_luminaria_room(uuid) to authenticated;
grant execute on function public.create_luminaria_room(text, boolean) to authenticated;

commit;
