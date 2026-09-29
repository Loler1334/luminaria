-- Idempotent card submission and server-side phase progression.
-- Run this whole file once in Supabase SQL Editor.

create index if not exists rounds_room_created_idx
  on public.rounds (room_id, created_at desc);
create index if not exists card_submissions_round_idx
  on public.card_submissions (round_id);
create index if not exists votes_round_idx
  on public.votes (round_id);
create index if not exists votes_submission_idx
  on public.votes (submission_id);
create index if not exists room_players_room_idx
  on public.room_players (room_id);

create or replace function public.play_luminaria_card(target_round_id uuid, chosen_card_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_room uuid;
  previous_card text;
begin
  select room_id into active_room
  from public.rounds
  where id = target_round_id and phase = 'submitting'
  for update;

  if active_room is null or not exists (
    select 1 from public.room_players
    where room_id = active_room and user_id = (select auth.uid())
  ) then
    raise exception 'You cannot play in this round';
  end if;

  select card_id into previous_card
  from public.card_submissions
  where round_id = target_round_id and player_id = (select auth.uid());

  -- Retried requests (double tap, reconnect, slow network) are successful no-ops.
  if previous_card is not null then
    if previous_card <> chosen_card_id then
      raise exception 'A card has already been submitted for this round';
    end if;
    return;
  end if;

  update public.room_deck_cards
  set is_played = true
  where room_id = active_room
    and card_id = chosen_card_id
    and owner_id = (select auth.uid())
    and not is_played;
  if not found then raise exception 'This card is not in your hand'; end if;

  insert into public.card_submissions (round_id, player_id, card_id)
  values (target_round_id, (select auth.uid()), chosen_card_id)
  on conflict (round_id, player_id) do nothing;
end;
$$;

create or replace function public.sync_luminaria_round_after_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := new.round_id;
  active_round public.rounds%rowtype;
  players integer;
  submissions integer;
  submitted_votes integer;
begin
  select * into active_round from public.rounds where id = target_id for update;
  if active_round.id is null then return new; end if;
  select count(*) into players from public.room_players where room_id = active_round.room_id;

  if active_round.phase = 'submitting' then
    select count(*) into submissions from public.card_submissions where round_id = target_id;
    if players > 1 and submissions >= players then
      update public.rounds set phase = 'voting' where id = target_id and phase = 'submitting';
    end if;
  elsif active_round.phase = 'voting' then
    select count(*) into submitted_votes from public.votes where round_id = target_id;
    if players > 1 and submitted_votes >= players - 1 then
      perform public.finalize_luminaria_round(target_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_luminaria_round_after_submission on public.card_submissions;
create trigger sync_luminaria_round_after_submission
  after insert on public.card_submissions
  for each row execute function public.sync_luminaria_round_after_action();

drop trigger if exists sync_luminaria_round_after_vote on public.votes;
create trigger sync_luminaria_round_after_vote
  after insert on public.votes
  for each row execute function public.sync_luminaria_round_after_action();

grant execute on function public.play_luminaria_card(uuid, text) to authenticated;
