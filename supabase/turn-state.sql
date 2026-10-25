-- Install together with the matching client. This establishes the shared
-- storyteller/result transition; AFK expiry is installed separately.
begin;

alter table public.rooms
  add column if not exists turn_timer_seconds integer default null,
  add column if not exists current_storyteller_id uuid references auth.users(id),
  add column if not exists awaiting_storyteller boolean not null default false,
  add column if not exists phase_deadline_at timestamptz default null;
alter table public.rooms drop constraint if exists rooms_turn_timer_seconds_check;
alter table public.rooms add constraint rooms_turn_timer_seconds_check
  check (turn_timer_seconds in (60, 90, 120));
-- Phase changes are performed by server functions/triggers. A direct client
-- UPDATE could otherwise skip voting and bypass scoring entirely.
revoke update (phase) on public.rounds from authenticated;

create or replace function public.luminaria_next_storyteller(target_room_id uuid, previous_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  with ordered as (
    select user_id, row_number() over (order by joined_at, user_id) as position
    from public.room_players where room_id = target_room_id
  )
  select coalesce(
    (select next_player.user_id from ordered prior
     join ordered next_player on next_player.position = prior.position + 1
     where prior.user_id = previous_id),
    (select user_id from ordered order by position limit 1));
$$;
revoke all on function public.luminaria_next_storyteller(uuid,uuid) from public, anon, authenticated;

-- Existing active rooms: no round -> host; active round -> its storyteller;
-- results -> next storyteller. Do not start a timer in a running room on deploy.
with latest as (
  select room.id as room_id, r.id as round_id, r.phase, r.storyteller_id
  from public.rooms room left join lateral (
    select id, phase, storyteller_id from public.rounds
    where room_id = room.id order by created_at desc, id desc limit 1
  ) r on true
  where room.status = 'playing' and room.current_storyteller_id is null
)
update public.rooms room set
  current_storyteller_id = case
    when latest.round_id is null then room.host_id
    when latest.phase = 'results' then
      public.luminaria_next_storyteller(room.id, latest.storyteller_id)
    else latest.storyteller_id end,
  awaiting_storyteller = latest.round_id is null,
  phase_deadline_at = null
from latest where room.id = latest.room_id;

create or replace function public.luminaria_room_turn_transition()
returns trigger language plpgsql security definer set search_path = public as $$
declare next_id uuid; round_limit integer; round_count integer;
begin
  if tg_table_name = 'rooms' then
    if old.status = 'lobby' and new.status = 'playing' then
      new.current_storyteller_id := new.host_id;
      new.awaiting_storyteller := true;
      new.phase_deadline_at := case when new.turn_timer_seconds is null then null
        else now() + make_interval(secs => new.turn_timer_seconds) end;
    elsif new.status <> 'playing' then
      new.awaiting_storyteller := false;
      new.phase_deadline_at := null;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    update public.rooms set awaiting_storyteller = false,
      phase_deadline_at = case when turn_timer_seconds is null then null
        else now() + make_interval(secs => turn_timer_seconds) end
    where id = new.room_id;
    return new;
  end if;
  if old.phase is distinct from new.phase then
    if new.phase = 'voting' then
      update public.rooms set phase_deadline_at = case when turn_timer_seconds is null then null
        else now() + make_interval(secs => turn_timer_seconds) end
      where id = new.room_id;
    elsif new.phase = 'results' then
      select count(*) into round_count from public.rounds where room_id = new.room_id;
      select coalesce(max(position), 0) into round_limit
        from public.room_deck_cards where room_id = new.room_id;
      next_id := public.luminaria_next_storyteller(new.room_id, new.storyteller_id);
      update public.rooms set current_storyteller_id = case
          when round_count >= round_limit then null else next_id end,
        awaiting_storyteller = false, phase_deadline_at = null
      where id = new.room_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists luminaria_start_turn_on_room on public.rooms;
create trigger luminaria_start_turn_on_room before update of status on public.rooms
  for each row execute function public.luminaria_room_turn_transition();
drop trigger if exists luminaria_turn_after_round_insert on public.rounds;
create trigger luminaria_turn_after_round_insert after insert on public.rounds
  for each row execute function public.luminaria_room_turn_transition();
drop trigger if exists luminaria_turn_after_round_phase on public.rounds;
create trigger luminaria_turn_after_round_phase after update of phase on public.rounds
  for each row execute function public.luminaria_room_turn_transition();

create or replace function public.start_next_turn(p_room_id uuid)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare room_row public.rooms%rowtype; latest_round public.rounds%rowtype;
  round_count integer; round_limit integer;
begin
  select * into room_row from public.rooms where id = p_room_id for update;
  if room_row.id is null or room_row.status <> 'playing' then
    raise exception 'Room is not playing';
  end if;
  if not exists (select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()) then
    raise exception 'Only a room participant can start the next turn';
  end if;
  if room_row.awaiting_storyteller then return room_row; end if;
  select * into latest_round from public.rounds where room_id = p_room_id
    order by created_at desc, id desc limit 1;
  if latest_round.id is null or latest_round.phase <> 'results' then
    raise exception 'The current round is not finished';
  end if;
  select count(*) into round_count from public.rounds where room_id = p_room_id;
  select coalesce(max(position), 0) into round_limit from public.room_deck_cards
    where room_id = p_room_id;
  if round_count >= round_limit or room_row.current_storyteller_id is null then
    raise exception 'The game has reached its round limit';
  end if;
  update public.rooms set awaiting_storyteller = true,
    phase_deadline_at = case when turn_timer_seconds is null then null
      else now() + make_interval(secs => turn_timer_seconds) end
    where id = p_room_id returning * into room_row;
  return room_row;
end;
$$;
revoke all on function public.start_next_turn(uuid) from public, anon;
grant execute on function public.start_next_turn(uuid) to authenticated;

create or replace function public.configure_luminaria_turn_timer(
  p_room_id uuid, p_seconds integer)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare room_row public.rooms%rowtype;
begin
  if p_seconds is not null and p_seconds not in (60, 90, 120) then
    raise exception 'Invalid turn timer';
  end if;
  update public.rooms set turn_timer_seconds = p_seconds
    where id = p_room_id and host_id = auth.uid() and status = 'lobby'
    returning * into room_row;
  if room_row.id is null then raise exception 'Only the lobby host can set the timer'; end if;
  return room_row;
end;
$$;
revoke all on function public.configure_luminaria_turn_timer(uuid,integer) from public, anon;
grant execute on function public.configure_luminaria_turn_timer(uuid,integer) to authenticated;

create or replace function public.guard_luminaria_round_creation()
returns trigger language plpgsql security definer set search_path = public as $$
declare room_row public.rooms%rowtype; previous_round public.rounds%rowtype;
  round_count integer; round_limit integer;
begin
  select * into room_row from public.rooms where id = new.room_id for update;
  -- An already-open client starts the next turn locally and never calls
  -- start_next_turn. Its valid storyteller insert also starts the turn.
  if room_row.status = 'playing' and not room_row.awaiting_storyteller
    and new.storyteller_id = room_row.current_storyteller_id then
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
    or new.storyteller_id is distinct from room_row.current_storyteller_id then
    raise exception 'It is another player''s turn to tell a clue';
  end if;
  select count(*) into round_count from public.rounds where room_id = new.room_id;
  select coalesce(max(position), 0) into round_limit from public.room_deck_cards
    where room_id = new.room_id;
  if round_limit = 0 or round_count >= round_limit then
    raise exception 'The round limit has been reached';
  end if;
  select * into previous_round from public.rounds where room_id = new.room_id
    order by created_at desc, id desc limit 1;
  if previous_round.id is not null and previous_round.phase <> 'results' then
    raise exception 'Finish the current round first';
  end if;
  return new;
end;
$$;

commit;
