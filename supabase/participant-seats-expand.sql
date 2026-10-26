-- Phase 1 of participant IDs. Safe for human-only rooms and old clients.
-- Apply on its own; this does not enable bots or change the current primary key.
-- A later migration will move game references and replace (room_id, user_id).

begin;
set local lock_timeout = '2s';

alter table public.room_players
  add column if not exists id uuid;

alter table public.room_players
  alter column id set default gen_random_uuid();

-- Existing seats receive a stable identity. Re-running does not change it.
update public.room_players
set id = gen_random_uuid()
where id is null;

alter table public.room_players
  alter column id set not null;

-- This index can become the primary-key index at the final cutover.
create unique index if not exists room_players_participant_id_idx
  on public.room_players (id);

comment on column public.room_players.id is
  'Stable identity of a seat in a room; survives human session recovery.';

commit;

-- Read-only verification after applying:
-- select count(*) as seats, count(distinct id) as distinct_ids,
--        count(*) filter (where id is null) as missing_ids
-- from public.room_players;
-- The existing primary key (room_id, user_id), RLS, and game functions remain intact.
