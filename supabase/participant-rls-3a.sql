-- Stage 3A RLS cutover. Apply after participant-keys-3a.sql.
-- Direct card inserts stay closed; play_luminaria_card remains the only path.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

drop policy if exists "room storytellers create rounds" on public.rounds;
create policy "room storytellers create rounds" on public.rounds
  for insert to authenticated with check (
    (select private.is_luminaria_room_member(rounds.room_id))
    and exists (select 1 from public.room_players seat
      where seat.id = rounds.storyteller_participant_id
        and seat.room_id = rounds.room_id
        and seat.user_id = (select auth.uid()))
  );

drop policy if exists "room storytellers update round phase" on public.rounds;
create policy "room storytellers update round phase" on public.rounds
  for update to authenticated
  using ((select private.is_luminaria_room_member(rounds.room_id))
    and exists (select 1 from public.room_players seat
      where seat.id = rounds.storyteller_participant_id
        and seat.room_id = rounds.room_id
        and seat.user_id = (select auth.uid())))
  with check ((select private.is_luminaria_room_member(rounds.room_id))
    and exists (select 1 from public.room_players seat
      where seat.id = rounds.storyteller_participant_id
        and seat.room_id = rounds.room_id
        and seat.user_id = (select auth.uid())));

drop policy if exists "room members read own or results cards" on public.card_submissions;
create policy "room members read own or results cards" on public.card_submissions
  for select to authenticated using (
    exists (select 1 from public.rounds r
      where r.id = card_submissions.round_id
        and (select private.is_luminaria_room_member(r.room_id))
        and (r.phase = 'results' or exists (
          select 1 from public.room_players seat
          where seat.id = card_submissions.participant_id
            and seat.room_id = r.room_id
            and seat.user_id = (select auth.uid()))))
  );

drop policy if exists "room members read room votes" on public.votes;
create policy "room members read room votes" on public.votes
  for select to authenticated using (
    exists (select 1 from public.rounds r
      where r.id = votes.round_id
        and (select private.is_luminaria_room_member(r.room_id))
        and (r.phase = 'results' or exists (
          select 1 from public.room_players seat
          where seat.id = votes.voter_participant_id
            and seat.room_id = r.room_id
            and seat.user_id = (select auth.uid()))))
  );

drop policy if exists "room members vote as themselves" on public.votes;
create policy "room members vote as themselves" on public.votes
  for insert to authenticated with check (
    exists (select 1 from public.rounds r
      join public.room_players seat
        on seat.id = votes.voter_participant_id and seat.room_id = r.room_id
      where r.id = votes.round_id and r.phase = 'voting'
        and seat.user_id = (select auth.uid())
        and (select private.is_luminaria_room_member(r.room_id)))
  );

-- room_players UPDATE/DELETE remain limited by user_id = auth.uid().
notify pgrst, 'reload schema';
commit;
