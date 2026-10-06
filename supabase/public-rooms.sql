-- Public lobby discovery. Existing rooms stay private by default.
begin;

alter table public.rooms add column if not exists is_public boolean not null default false;
alter table public.rooms add column if not exists host_seen_at timestamptz not null default now();

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
  insert into public.rooms (code, host_id, is_public)
  values (upper(btrim(room_code)), current_user_id, coalesce(public_room, false))
  returning * into created_room;
  insert into public.room_players (room_id, user_id)
  values (created_room.id, current_user_id);
  return next created_room;
end;
$$;

-- Only fresh, joinable lobbies appear. This function does not expose room IDs
-- or any metadata from private rooms to visitors.
create or replace function public.list_open_luminaria_rooms()
returns table (code text, host_name text, deck_id text, round_cycles integer, player_count integer, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select room.code, profile.nickname, room.deck_id, room.round_cycles,
    (select count(*)::integer from public.room_players seat where seat.room_id = room.id),
    room.created_at
  from public.rooms room
  join public.profiles profile on profile.id = room.host_id
  where room.is_public and room.status = 'lobby'
    and room.host_seen_at > now() - interval '90 seconds'
    and exists (select 1 from public.room_players seat where seat.room_id = room.id and seat.user_id = room.host_id)
    and (select count(*) from public.room_players seat where seat.room_id = room.id) < 10
  order by room.created_at desc
  limit 30;
$$;

create or replace function public.set_luminaria_room_visibility(target_room_id uuid, make_public boolean)
returns setof public.rooms
language plpgsql security definer set search_path = '' as $$
declare updated_room public.rooms%rowtype;
begin
  update public.rooms set is_public = coalesce(make_public, false), host_seen_at = now()
  where id = target_room_id and host_id = (select auth.uid()) and status = 'lobby'
  returning * into updated_room;
  if updated_room.id is null then raise exception 'Only the host can change lobby visibility'; end if;
  return next updated_room;
end;
$$;

create or replace function public.touch_luminaria_room(target_room_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.rooms set host_seen_at = now()
  where id = target_room_id and host_id = (select auth.uid()) and status = 'lobby'
    and host_seen_at < now() - interval '20 seconds';
end;
$$;

revoke all on function public.create_luminaria_room(text, boolean) from public, anon;
revoke all on function public.list_open_luminaria_rooms() from public;
revoke all on function public.set_luminaria_room_visibility(uuid, boolean) from public, anon;
revoke all on function public.touch_luminaria_room(uuid) from public, anon;
grant execute on function public.create_luminaria_room(text, boolean) to authenticated;
grant execute on function public.list_open_luminaria_rooms() to anon, authenticated;
grant execute on function public.set_luminaria_room_visibility(uuid, boolean) to authenticated;
grant execute on function public.touch_luminaria_room(uuid) to authenticated;

commit;
