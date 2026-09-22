-- Room recovery and host-independent round progression.
-- Run this file once in the Supabase SQL Editor.

alter table public.room_players
  add column if not exists recovery_token_hash text;

create or replace function public.set_luminaria_recovery_token(target_room_id uuid, recovery_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if recovery_token is null or char_length(recovery_token) < 24 then
    raise exception 'Invalid recovery token';
  end if;
  update public.room_players
  set recovery_token_hash = encode(digest(recovery_token, 'sha256'), 'hex')
  where room_id = target_room_id and user_id = auth.uid();
  if not found then raise exception 'You are not seated in this room'; end if;
end;
$$;

create or replace function public.reclaim_luminaria_seat(room_code text, recovery_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms%rowtype;
  previous_user uuid;
  current_user uuid := auth.uid();
begin
  if current_user is null then raise exception 'Authentication required'; end if;
  select * into target_room from public.rooms where code = upper(room_code) for update;
  if target_room.id is null then raise exception 'Room not found'; end if;
  if exists (select 1 from public.room_players where room_id = target_room.id and user_id = current_user) then
    return target_room.id;
  end if;
  select user_id into previous_user
  from public.room_players
  where room_id = target_room.id
    and recovery_token_hash = encode(digest(recovery_token, 'sha256'), 'hex')
  for update;
  if previous_user is null then raise exception 'This seat cannot be recovered'; end if;

  update public.room_deck_cards set owner_id = current_user where room_id = target_room.id and owner_id = previous_user;
  update public.card_submissions set player_id = current_user
    where player_id = previous_user and round_id in (select id from public.rounds where room_id = target_room.id);
  update public.votes set voter_id = current_user
    where voter_id = previous_user and round_id in (select id from public.rounds where room_id = target_room.id);
  update public.rounds set storyteller_id = current_user where room_id = target_room.id and storyteller_id = previous_user;
  update public.rooms set host_id = current_user where id = target_room.id and host_id = previous_user;
  update public.room_players set user_id = current_user where room_id = target_room.id and user_id = previous_user;
  return target_room.id;
end;
$$;

create or replace function public.finalize_luminaria_round(target_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_round public.rounds%rowtype;
  storyteller_submission uuid;
  correct_votes integer;
  participant_count integer;
  participant record;
  card_votes integer;
begin
  select * into active_round from public.rounds where id = target_round_id for update;
  if active_round.id is null then raise exception 'Round not found'; end if;
  if not exists (select 1 from public.room_players where room_id = active_round.room_id and user_id = auth.uid()) then
    raise exception 'Only a room participant can finalize this round';
  end if;
  if active_round.phase = 'results' then return; end if;
  if active_round.phase <> 'voting' then raise exception 'This round is not ready for results'; end if;

  select count(*) into participant_count from public.room_players where room_id = active_round.room_id;
  select id into storyteller_submission from public.card_submissions
    where round_id = target_round_id and player_id = active_round.storyteller_id;
  select count(*) into correct_votes from public.votes
    where round_id = target_round_id and submission_id = storyteller_submission;

  for participant in select player_id, id from public.card_submissions where round_id = target_round_id loop
    if participant.player_id = active_round.storyteller_id then
      if correct_votes > 0 and correct_votes < participant_count - 1 then
        update public.room_players set score = score + 3 + correct_votes
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    else
      select count(*) into card_votes from public.votes where submission_id = participant.id;
      update public.room_players set score = score + card_votes
        where room_id = active_round.room_id and user_id = participant.player_id;
      if exists (select 1 from public.votes where round_id = target_round_id and voter_id = participant.player_id and submission_id = storyteller_submission) then
        update public.room_players set score = score + 3
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    end if;
  end loop;
  update public.rounds set phase = 'results' where id = target_round_id;
  if not exists (select 1 from public.room_deck_cards where room_id = active_round.room_id and not is_played) then
    update public.rooms set status = 'finished' where id = active_round.room_id;
  end if;
end;
$$;

create or replace function public.advance_luminaria_round(target_round_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  active_round public.rounds%rowtype;
  players integer;
  submissions integer;
  submitted_votes integer;
begin
  select * into active_round from public.rounds where id = target_round_id for update;
  if active_round.id is null then raise exception 'Round not found'; end if;
  if not exists (select 1 from public.room_players where room_id = active_round.room_id and user_id = auth.uid()) then
    raise exception 'You are not a player in this round';
  end if;
  select count(*) into players from public.room_players where room_id = active_round.room_id;
  select count(*) into submissions from public.card_submissions where round_id = target_round_id;
  select count(*) into submitted_votes from public.votes where round_id = target_round_id;
  if active_round.phase = 'submitting' and players > 1 and submissions >= players then
    update public.rounds set phase = 'voting' where id = target_round_id;
    return 'voting';
  end if;
  if active_round.phase = 'voting' and players > 1 and submitted_votes >= players - 1 then
    perform public.finalize_luminaria_round(target_round_id);
    return 'results';
  end if;
  return active_round.phase;
end;
$$;

grant execute on function public.set_luminaria_recovery_token(uuid, text) to authenticated;
grant execute on function public.reclaim_luminaria_seat(text, text) to authenticated;
grant execute on function public.advance_luminaria_round(uuid) to authenticated;
grant execute on function public.finalize_luminaria_round(uuid) to authenticated;
