-- Apply after lobby-rounds-and-waiting.sql and stabilize-round-flow.sql.
begin;

create or replace function public.guard_luminaria_round_creation()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  room_row public.rooms%rowtype;
  previous_round public.rounds%rowtype;
  round_count integer;
  round_limit integer;
  players uuid[];
  expected_storyteller uuid;
begin
  -- Serialize simultaneous round creation against start/rematch transactions.
  select * into room_row from public.rooms where id=new.room_id for update;
  if room_row.status is distinct from 'playing' then
    raise exception 'The room is not playing';
  end if;
  select count(*) into round_count from public.rounds where room_id=new.room_id;
  select coalesce(max(position),0) into round_limit from public.room_deck_cards where room_id=new.room_id;
  if round_limit=0 or round_count>=round_limit then
    raise exception 'The round limit has been reached';
  end if;
  select * into previous_round from public.rounds where room_id=new.room_id order by created_at desc,id desc limit 1;
  if previous_round.id is not null and previous_round.phase<>'results' then
    raise exception 'Finish the current round first';
  end if;
  select array_agg(user_id order by joined_at,user_id) into players from public.room_players where room_id=new.room_id;
  if previous_round.id is null then
    expected_storyteller:=room_row.host_id;
  else
    expected_storyteller:=players[(array_position(players,previous_round.storyteller_id)%array_length(players,1))+1];
  end if;
  if new.storyteller_id is distinct from expected_storyteller then
    raise exception 'It is another player''s turn to tell a clue';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_luminaria_round_creation on public.rounds;
create trigger guard_luminaria_round_creation before insert on public.rounds
for each row execute function public.guard_luminaria_round_creation();

create or replace function public.finish_luminaria_at_round_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare round_limit integer; completed_count integer;
begin
  if new.phase='results' and old.phase is distinct from 'results' then
    select coalesce(max(position),0) into round_limit from public.room_deck_cards where room_id=new.room_id;
    select count(*) into completed_count from public.rounds where room_id=new.room_id and phase='results';
    if round_limit>0 and completed_count>=round_limit then
      update public.rooms set status='finished' where id=new.room_id and status='playing';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists finish_luminaria_at_round_limit on public.rounds;
create trigger finish_luminaria_at_round_limit after update of phase on public.rounds
for each row execute function public.finish_luminaria_at_round_limit();

revoke all on function public.guard_luminaria_round_creation() from public,anon,authenticated;
revoke all on function public.finish_luminaria_at_round_limit() from public,anon,authenticated;
-- Run this once in Supabase SQL Editor to enable a rematch in the same room.
create or replace function public.restart_luminaria_room(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.rooms where id=target_room_id for update;
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

commit;
