-- Apply before introducing AFK timeouts. The existing client and vote trigger
-- both call this function; a direct RPC must not close an incomplete ballot.
begin;

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
  expected_voters integer;
  actual_voters integer;
  participant record;
  card_votes integer;
begin
  select * into active_round from public.rounds where id = target_round_id for update;
  if active_round.id is null then raise exception 'Round not found'; end if;
  if not exists (
    select 1 from public.room_players
    where room_id = active_round.room_id and user_id = auth.uid()
  ) then
    raise exception 'Only a room participant can finalize this round';
  end if;
  if active_round.phase = 'results' then return; end if;
  if active_round.phase <> 'voting' then raise exception 'This round is not ready for results'; end if;

  select count(*) - 1 into expected_voters
  from public.room_players where room_id = active_round.room_id;
  select count(*) into actual_voters
  from public.votes where round_id = target_round_id;
  if actual_voters < expected_voters then
    raise exception 'Voting is still in progress';
  end if;

  select id into storyteller_submission from public.card_submissions
  where round_id = target_round_id and player_id = active_round.storyteller_id;
  if storyteller_submission is null then
    raise exception 'Storyteller card is missing';
  end if;
  select count(*) into correct_votes from public.votes
  where round_id = target_round_id and submission_id = storyteller_submission;

  for participant in select player_id, id from public.card_submissions where round_id = target_round_id loop
    if participant.player_id = active_round.storyteller_id then
      if correct_votes > 0 and correct_votes < actual_voters then
        update public.room_players set score = score + 3 + correct_votes
        where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    else
      select count(*) into card_votes from public.votes where submission_id = participant.id;
      update public.room_players set score = score + card_votes
      where room_id = active_round.room_id and user_id = participant.player_id;
      if exists (
        select 1 from public.votes
        where round_id = target_round_id and voter_id = participant.player_id
          and submission_id = storyteller_submission
      ) then
        update public.room_players set score = score + 3
        where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    end if;
  end loop;
  update public.rounds set phase = 'results' where id = target_round_id;
  if not exists (
    select 1 from public.room_deck_cards
    where room_id = active_round.room_id and not is_played
  ) then
    update public.rooms set status = 'finished' where id = active_round.room_id;
  end if;
end;
$$;

revoke all on function public.finalize_luminaria_round(uuid) from public, anon;
grant execute on function public.finalize_luminaria_round(uuid) to authenticated;

commit;
