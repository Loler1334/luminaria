-- Credit retained finished parties and their already published final stories.
-- Safe to rerun: final-round awards and story credits are idempotent.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

do $backfill$
declare finished_room record;
begin
  for finished_room in select id from public.rooms
    where status='finished' order by id loop
    perform public.record_luminaria_game_progression(finished_room.id);
  end loop;
end;
$backfill$;

update public.finale_stories story set final_round_id=story.final_round_id
where story.final_round_id is not null
  and exists (select 1 from public.luminaria_game_progression award
    where award.room_id=story.room_id
      and award.final_round_id=story.final_round_id
      and not award.story_created);

commit;
