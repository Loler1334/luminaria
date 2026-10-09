-- Store one generated finale illustration per finished party.
-- Apply after finale-story-per-party.sql in the Supabase SQL Editor.

begin;

alter table public.finale_stories
  add column if not exists illustration text,
  add column if not exists illustration_status text not null default 'none'
    check (illustration_status in ('none', 'pending', 'ready', 'failed')),
  add column if not exists illustration_started_at timestamptz;

create or replace function public.reset_luminaria_finale_illustration_on_new_party()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.final_round_id is distinct from old.final_round_id then
    new.illustration := null;
    new.illustration_status := 'none';
    new.illustration_started_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_luminaria_finale_illustration_on_new_party on public.finale_stories;
create trigger reset_luminaria_finale_illustration_on_new_party
before update of final_round_id on public.finale_stories
for each row execute function public.reset_luminaria_finale_illustration_on_new_party();

create or replace function public.claim_luminaria_finale_illustration(
  target_room_id uuid,
  story_language text,
  expected_final_round_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_status text;
  remaining_cards integer;
  latest_round_id uuid;
  current_status text;
  started_at timestamptz;
begin
  if auth.uid() is null or not private.is_luminaria_room_member(target_room_id) then
    raise exception 'Room members only';
  end if;
  if story_language not in ('ru', 'en') then raise exception 'Invalid language'; end if;

  select status into room_status from public.rooms where id = target_room_id for update;
  if room_status is null then raise exception 'Room not found'; end if;
  select id into latest_round_id from public.rounds
  where room_id = target_room_id order by created_at desc, id desc limit 1;
  if latest_round_id is distinct from expected_final_round_id
    or exists (select 1 from public.rounds where room_id = target_room_id and phase <> 'results') then
    raise exception 'This party is no longer current';
  end if;
  if room_status <> 'finished' then
    select state.remaining_cards into remaining_cards
    from public.luminaria_deck_state(target_room_id) as state;
    if remaining_cards is distinct from 0 then raise exception 'Game not finished'; end if;
  end if;

  select illustration_status, illustration_started_at into current_status, started_at
  from public.finale_stories
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id for update;
  if not found then raise exception 'Final story is not ready'; end if;
  if current_status = 'ready' then return false; end if;
  if current_status = 'pending' and started_at > now() - interval '2 minutes' then return false; end if;

  update public.finale_stories set illustration_status = 'pending', illustration_started_at = now()
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id;
  return true;
end;
$$;

create or replace function public.publish_luminaria_finale_illustration(
  target_room_id uuid,
  story_language text,
  generated_illustration text,
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
  latest_round_id uuid;
  canonical_illustration text;
begin
  if auth.uid() is null or not private.is_luminaria_room_member(target_room_id) then
    raise exception 'Room members only';
  end if;
  if story_language not in ('ru', 'en')
    or generated_illustration !~ '^data:image/jpeg;charset=utf-8;base64,[A-Za-z0-9+/=]+$'
    or char_length(generated_illustration) not between 1000 and 1400000 then
    raise exception 'Invalid finale illustration';
  end if;

  select status into room_status from public.rooms where id = target_room_id for update;
  if room_status is null then raise exception 'Room not found'; end if;
  select id into latest_round_id from public.rounds
  where room_id = target_room_id order by created_at desc, id desc limit 1;
  if latest_round_id is distinct from expected_final_round_id
    or exists (select 1 from public.rounds where room_id = target_room_id and phase <> 'results') then
    raise exception 'This party is no longer current';
  end if;
  if room_status <> 'finished' then
    select state.remaining_cards into remaining_cards
    from public.luminaria_deck_state(target_room_id) as state;
    if remaining_cards is distinct from 0 then raise exception 'Game not finished'; end if;
  end if;
  update public.finale_stories
    set illustration = coalesce(illustration, generated_illustration),
        illustration_status = 'ready', illustration_started_at = null
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id;
  if not found then raise exception 'Final story is not ready'; end if;
  select illustration into canonical_illustration from public.finale_stories
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id;
  return canonical_illustration;
end;
$$;

create or replace function public.release_luminaria_finale_illustration(
  target_room_id uuid,
  story_language text,
  expected_final_round_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_luminaria_room_member(target_room_id) then
    raise exception 'Room members only';
  end if;
  update public.finale_stories
    set illustration_status = 'failed', illustration_started_at = null
  where room_id = target_room_id and language = story_language
    and final_round_id = expected_final_round_id and illustration is null;
end;
$$;

revoke all on function public.claim_luminaria_finale_illustration(uuid, text, uuid) from public, anon;
revoke all on function public.publish_luminaria_finale_illustration(uuid, text, text, uuid) from public, anon;
revoke all on function public.release_luminaria_finale_illustration(uuid, text, uuid) from public, anon;
grant execute on function public.claim_luminaria_finale_illustration(uuid, text, uuid) to authenticated;
grant execute on function public.publish_luminaria_finale_illustration(uuid, text, text, uuid) to authenticated;
grant execute on function public.release_luminaria_finale_illustration(uuid, text, uuid) to authenticated;

commit;
