-- Step 3: apply after the client using get_luminaria_voting_cards is live.
begin;

drop policy if exists "room members read revealed or own cards" on public.card_submissions;
drop policy if exists "players read submitted cards" on public.card_submissions;
drop policy if exists "room members read own or results cards" on public.card_submissions;
create policy "room members read own or results cards" on public.card_submissions
  for select to authenticated
  using (
    exists (
      select 1 from public.rounds as r
      where r.id = card_submissions.round_id
        and (select private.is_luminaria_room_member(r.room_id))
        and (card_submissions.player_id = (select auth.uid()) or r.phase = 'results')
    )
  );

commit;
