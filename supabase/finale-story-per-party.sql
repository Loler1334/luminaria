-- Tie the canonical epilogue to the completed party, not just its room.
-- Apply after finale-stories.sql. Existing stories remain stored but cannot
-- be mistaken for a later party because their final_round_id is null.
begin;

alter table public.finale_stories
  add column if not exists final_round_id uuid;

drop function if exists public.publish_luminaria_finale_story(uuid, text, text);

create or replace function public.publish_luminaria_finale_story(
  target_room_id uuid,
  story_language text,
  generated_story text,
  expected_final_round_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_status text;
  remaining_cards integer;
  current_final_round_id uuid;
  canonical_story text;
begin
  if auth.uid() is null or not private.is_luminaria_room_member(target_room_id) then
    raise exception 'Room members only';
  end if;
  if story_language not in ('ru', 'en') or char_length(generated_story) not between 100 and 400 then
    raise exception 'Invalid finale story';
  end if;

  -- Serialize publishing against a rematch and reject late AI responses.
  select status into room_status from public.rooms
  where id = target_room_id for update;
  if room_status is null then raise exception 'Room not found'; end if;
  select id into current_final_round_id from public.rounds
  where room_id = target_room_id order by created_at desc, id desc limit 1;
  if current_final_round_id is distinct from expected_final_round_id
    or exists (select 1 from public.rounds where room_id = target_room_id and phase <> 'results') then
    raise exception 'This party is no longer current';
  end if;
  if room_status <> 'finished' then
    select state.remaining_cards into remaining_cards
    from public.luminaria_deck_state(target_room_id) as state;
    if remaining_cards is distinct from 0 then raise exception 'Game not finished'; end if;
  end if;

  insert into public.finale_stories(room_id, language, story, final_round_id)
  values (target_room_id, story_language, generated_story, expected_final_round_id)
  on conflict (room_id, language) do update
  set story = excluded.story, final_round_id = excluded.final_round_id,
      created_at = now()
  where public.finale_stories.final_round_id is distinct from excluded.final_round_id;
  select story into canonical_story from public.finale_stories
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id;
  return canonical_story;
end;
$$;

revoke all on function public.publish_luminaria_finale_story(uuid, text, text, uuid)
  from public, anon;
grant execute on function public.publish_luminaria_finale_story(uuid, text, text, uuid)
  to authenticated;

commit;
