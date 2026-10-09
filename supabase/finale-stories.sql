-- Store one canonical generated epilogue per room and language.
-- Run in Supabase SQL Editor after security-hardening.sql.

create table if not exists public.finale_stories (
  room_id uuid not null references public.rooms(id) on delete cascade,
  language text not null check (language in ('ru', 'en')),
  story text not null check (char_length(story) >= 100),
  created_at timestamptz not null default now(),
  primary key (room_id, language)
);

alter table public.finale_stories enable row level security;
revoke all on public.finale_stories from public, anon, authenticated;
grant select on public.finale_stories to authenticated;

drop policy if exists "room members read finale stories" on public.finale_stories;
create policy "room members read finale stories" on public.finale_stories
  for select to authenticated
  using ((select private.is_luminaria_room_member(room_id)));

create or replace function public.publish_luminaria_finale_story(
  target_room_id uuid,
  story_language text,
  generated_story text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_status text;
  remaining_cards integer;
  canonical_story text;
begin
  if auth.uid() is null or not private.is_luminaria_room_member(target_room_id) then
    raise exception 'Room members only';
  end if;
  if story_language not in ('ru', 'en') or char_length(generated_story) < 100 then
    raise exception 'Invalid finale story';
  end if;
  select status into room_status from public.rooms where id = target_room_id;
  if room_status is null then raise exception 'Room not found'; end if;
  if exists (select 1 from public.rounds where room_id = target_room_id and phase <> 'results')
    or not exists (select 1 from public.rounds where room_id = target_room_id) then
    raise exception 'Game not finished';
  end if;
  if room_status <> 'finished' then
    select state.remaining_cards into remaining_cards
    from public.luminaria_deck_state(target_room_id) as state;
    if remaining_cards is distinct from 0 then raise exception 'Game not finished'; end if;
  end if;

  insert into public.finale_stories(room_id, language, story)
  values (target_room_id, story_language, generated_story)
  on conflict (room_id, language) do nothing;
  select story into canonical_story from public.finale_stories
  where room_id = target_room_id and language = story_language;
  return canonical_story;
end;
$$;

revoke all on function public.publish_luminaria_finale_story(uuid, text, text) from public, anon;
grant execute on function public.publish_luminaria_finale_story(uuid, text, text) to authenticated;
