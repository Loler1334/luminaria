-- Nonbreaking foundation for party language and curated English bot semantics.
-- Existing rooms keep NULL so their final stories retain legacy clue detection.
-- Existing two-argument room creation remains available to old tabs.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.rooms add column if not exists language text;
alter table public.rooms alter column language set default 'ru';
alter table public.rooms drop constraint if exists rooms_language_check;
alter table public.rooms add constraint rooms_language_check
  check (language in ('ru', 'en'));

alter table public.luminaria_bot_card_semantics
  add column if not exists title_en text,
  add column if not exists scene_en text,
  add column if not exists keywords_en text,
  add column if not exists clues_en text[];

grant select (language) on public.rooms to authenticated;

create or replace function public.create_luminaria_room_localized(
  room_code text, public_room boolean, room_language text)
returns setof public.rooms
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  created_room public.rooms%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if upper(btrim(room_code)) !~ '^[A-Z0-9]{6}$' then raise exception 'Invalid room code'; end if;
  if room_language not in ('ru', 'en') or room_language is null then
    raise exception 'Invalid room language';
  end if;
  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'Create your player profile before opening a room';
  end if;
  update public.rooms set status = 'closed', is_public = false
  where host_id = current_user_id and status = 'lobby';
  insert into public.rooms (code, host_id, is_public, language)
  values (upper(btrim(room_code)), current_user_id, coalesce(public_room, false), room_language)
  returning * into created_room;
  insert into public.room_players (room_id, user_id)
  values (created_room.id, current_user_id);
  return next created_room;
end;
$$;
revoke all on function public.create_luminaria_room_localized(text,boolean,text) from public, anon;
grant execute on function public.create_luminaria_room_localized(text,boolean,text) to authenticated;
notify pgrst, 'reload schema';
commit;
