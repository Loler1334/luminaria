-- Run this once in Supabase SQL Editor after gameplay.sql.
-- These checks run on the database, so parallel browser requests cannot bypass them.
create or replace function public.validate_luminaria_room_seat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_status text;
  requested_nickname text;
begin
  select status into active_status from public.rooms where id = new.room_id;
  if active_status is null then
    raise exception 'Room not found';
  end if;
  if active_status <> 'lobby' then
    raise exception 'This game has already started';
  end if;
  if (select count(*) from public.room_players where room_id = new.room_id) >= 7 then
    raise exception 'This room already has the maximum of 7 players';
  end if;

  select nickname into requested_nickname from public.profiles where id = new.user_id;
  if exists (
    select 1
    from public.room_players seat
    join public.profiles profile on profile.id = seat.user_id
    where seat.room_id = new.room_id
      and lower(profile.nickname) = lower(requested_nickname)
  ) then
    raise exception 'This nickname is already used in the room';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_luminaria_room_seat on public.room_players;
create trigger validate_luminaria_room_seat
  before insert on public.room_players
  for each row execute function public.validate_luminaria_room_seat();
