-- Luminaria access hardening.
-- Run after schema.sql, gameplay.sql, room-guards.sql, rematch.sql,
-- start-game.sql, resilient-room.sql, and stabilize-round-flow.sql.
-- This migration is intentionally safe to re-run.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_luminaria_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.room_players as seat
      where seat.room_id = target_room_id
        and seat.user_id = (select auth.uid())
    );
$$;

create or replace function private.can_access_luminaria_topic(topic_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room_text text;
begin
  if left(topic_name, 5) in ('chat-', 'room-') then
    room_text := substr(topic_name, 6);
  elsif left(topic_name, 6) = 'round-' then
    room_text := substr(topic_name, 7);
  else
    return false;
  end if;

  if room_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return private.is_luminaria_room_member(room_text::uuid);
end;
$$;

revoke all on function private.is_luminaria_room_member(uuid) from public, anon;
revoke all on function private.can_access_luminaria_topic(text) from public, anon;
grant execute on function private.is_luminaria_room_member(uuid) to authenticated;
grant execute on function private.can_access_luminaria_topic(text) to authenticated;

-- Invites reveal only the room metadata needed to join; room enumeration is no
-- longer possible through the table API.
create or replace function public.lookup_luminaria_room(room_code text)
returns table (
  id uuid,
  code text,
  host_id uuid,
  deck_id text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select room.id, room.code, room.host_id, room.deck_id, room.status, room.created_at
  from public.rooms as room
  where upper(btrim(room_code)) ~ '^[A-Z0-9]{6}$'
    and room.code = upper(btrim(room_code))
  limit 1;
$$;

create or replace function public.create_luminaria_room(room_code text)
returns setof public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_room public.rooms%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if upper(btrim(room_code)) !~ '^[A-Z0-9]{6}$' then raise exception 'Invalid room code'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'Create your player profile before opening a room';
  end if;

  insert into public.rooms (code, host_id)
  values (upper(btrim(room_code)), current_user_id)
  returning * into created_room;

  insert into public.room_players (room_id, user_id)
  values (created_room.id, current_user_id);

  return next created_room;
end;
$$;

create or replace function public.join_luminaria_room(target_room_id uuid)
returns setof public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'Create your player profile before joining a room';
  end if;

  select * into target_room
  from public.rooms
  where id = target_room_id
  for update;
  if target_room.id is null then raise exception 'Room not found'; end if;

  if exists (
    select 1 from public.room_players
    where room_id = target_room.id and user_id = current_user_id
  ) then
    return next target_room;
    return;
  end if;
  if target_room.status <> 'lobby' then raise exception 'This game has already started'; end if;
  if (select count(*) from public.room_players where room_id = target_room.id) >= 7 then
    raise exception 'This room already has the maximum of 7 players';
  end if;

  -- The existing seat trigger also enforces unique nicknames under concurrency.
  insert into public.room_players (room_id, user_id)
  values (target_room.id, current_user_id);
  return next target_room;
end;
$$;

revoke all on function public.lookup_luminaria_room(text) from public, anon;
revoke all on function public.create_luminaria_room(text) from public, anon;
revoke all on function public.join_luminaria_room(uuid) from public, anon;
grant execute on function public.lookup_luminaria_room(text) to authenticated;
grant execute on function public.create_luminaria_room(text) to authenticated;
grant execute on function public.join_luminaria_room(uuid) to authenticated;

-- Bound avatar payloads in the database too; the client already crops and
-- compresses uploads, but API callers must not be able to store huge strings.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_avatar_size_limit'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_size_limit
      check (char_length(avatar) <= 60000) not valid;
  end if;
end;
$$;

-- Revoke default API privileges first, then grant only the operations used by
-- the client. Column-level grants intentionally omit recovery_token_hash.
revoke all on public.profiles, public.rooms, public.room_players,
  public.rounds, public.card_submissions, public.votes
  from public, anon, authenticated;
revoke all on public.room_deck_cards from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.rooms to authenticated;
grant select (room_id, user_id, is_ready, score, joined_at)
  on public.room_players to authenticated;
grant update (is_ready) on public.room_players to authenticated;
grant delete on public.room_players to authenticated;
grant select on public.rounds to authenticated;
grant insert (room_id, storyteller_id, clue) on public.rounds to authenticated;
grant update (phase) on public.rounds to authenticated;
grant select on public.card_submissions to authenticated;
grant select on public.votes to authenticated;
grant insert (round_id, voter_id, submission_id) on public.votes to authenticated;

drop policy if exists "profiles are visible to signed-in players" on public.profiles;
drop policy if exists "players create their own profile" on public.profiles;
drop policy if exists "players update their own profile" on public.profiles;
create policy "players read own or room profiles" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.room_players as peer
      where peer.user_id = profiles.id
        and (select private.is_luminaria_room_member(peer.room_id))
    )
  );
create policy "players create their own profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "players update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "signed-in players can read rooms" on public.rooms;
drop policy if exists "hosts create rooms" on public.rooms;
drop policy if exists "hosts update their rooms" on public.rooms;
create policy "room members read their rooms" on public.rooms
  for select to authenticated
  using (
    host_id = (select auth.uid())
    or (select private.is_luminaria_room_member(id))
  );

drop policy if exists "signed-in players can read room rosters" on public.room_players;
drop policy if exists "players join rooms as themselves" on public.room_players;
drop policy if exists "players update their own seat" on public.room_players;
drop policy if exists "players leave their own seat" on public.room_players;
create policy "room members read their roster" on public.room_players
  for select to authenticated
  using ((select private.is_luminaria_room_member(room_id)));
create policy "players update their own readiness" on public.room_players
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "players leave their own seat" on public.room_players
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.rooms as room
      where room.id = room_players.room_id and room.status = 'lobby'
    )
  );

drop policy if exists "players read rounds" on public.rounds;
drop policy if exists "storytellers create rounds" on public.rounds;
drop policy if exists "storytellers advance their rounds" on public.rounds;
create policy "room members read rounds" on public.rounds
  for select to authenticated
  using ((select private.is_luminaria_room_member(room_id)));
create policy "room storytellers create rounds" on public.rounds
  for insert to authenticated
  with check (
    storyteller_id = (select auth.uid())
    and (select private.is_luminaria_room_member(room_id))
  );
create policy "room storytellers update round phase" on public.rounds
  for update to authenticated
  using (
    storyteller_id = (select auth.uid())
    and (select private.is_luminaria_room_member(room_id))
  )
  with check (
    storyteller_id = (select auth.uid())
    and (select private.is_luminaria_room_member(room_id))
  );

drop policy if exists "players read submitted cards" on public.card_submissions;
drop policy if exists "players submit one card as themselves" on public.card_submissions;
create policy "room members read revealed or own cards" on public.card_submissions
  for select to authenticated
  using (
    exists (
      select 1
      from public.rounds as active_round
      where active_round.id = card_submissions.round_id
        and (select private.is_luminaria_room_member(active_round.room_id))
        and (
          card_submissions.player_id = (select auth.uid())
          or active_round.phase in ('voting', 'results')
        )
    )
  );

drop policy if exists "players read votes" on public.votes;
drop policy if exists "players vote as themselves" on public.votes;
create policy "room members read room votes" on public.votes
  for select to authenticated
  using (
    exists (
      select 1 from public.rounds as active_round
      where active_round.id = votes.round_id
        and (select private.is_luminaria_room_member(active_round.room_id))
        and (
          votes.voter_id = (select auth.uid())
          or active_round.phase = 'results'
        )
    )
  );
create policy "room members vote as themselves" on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.rounds as active_round
      where active_round.id = votes.round_id
        and active_round.phase = 'voting'
        and (select private.is_luminaria_room_member(active_round.room_id))
    )
  );

-- Validate the vote's submission belongs to this round, and reject votes
-- outside the voting phase even if a client bypasses the UI.
create or replace function public.validate_luminaria_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  round_storyteller uuid;
  active_phase text;
  card_owner uuid;
begin
  select storyteller_id, phase
  into round_storyteller, active_phase
  from public.rounds
  where id = new.round_id;
  if round_storyteller is null then raise exception 'Round not found'; end if;
  if active_phase <> 'voting' then raise exception 'This round is not accepting votes'; end if;

  select player_id into card_owner
  from public.card_submissions
  where id = new.submission_id and round_id = new.round_id;
  if card_owner is null then raise exception 'The selected card is not in this round'; end if;
  if new.voter_id = round_storyteller then raise exception 'The storyteller cannot vote in their own round'; end if;
  if new.voter_id = card_owner then raise exception 'A player cannot vote for their own card'; end if;
  return new;
end;
$$;

-- Restrict private Realtime topics used for room state, rounds, chat, and
-- minigame broadcasts to actual room members.
drop policy if exists "luminaria room topic members can read" on realtime.messages;
drop policy if exists "luminaria room topic members can broadcast" on realtime.messages;
create policy "luminaria room topic members can read" on realtime.messages
  for select to authenticated
  using (
    extension in ('broadcast', 'presence')
    and (select private.can_access_luminaria_topic(realtime.topic()))
  );
create policy "luminaria room topic members can broadcast" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and (select private.can_access_luminaria_topic(realtime.topic()))
  );

-- Existing definer RPCs are callable only by authenticated app sessions.
revoke execute on function public.start_luminaria_game(uuid, text[]) from public, anon;
revoke execute on function public.restart_luminaria_room(uuid) from public, anon;
revoke execute on function public.initialize_luminaria_deck(uuid, text[]) from public, anon;
revoke execute on function public.luminaria_hand(uuid) from public, anon;
revoke execute on function public.play_luminaria_card(uuid, text) from public, anon;
revoke execute on function public.luminaria_deck_state(uuid) from public, anon;
revoke execute on function public.luminaria_round_progress(uuid) from public, anon;
revoke execute on function public.finalize_luminaria_round(uuid) from public, anon;
revoke execute on function public.advance_luminaria_round(uuid) from public, anon;
revoke execute on function public.set_luminaria_recovery_token(uuid, text) from public, anon;
revoke execute on function public.reclaim_luminaria_seat(text, text) from public, anon;
revoke execute on function public.validate_luminaria_room_seat() from public, anon;
revoke execute on function public.validate_luminaria_vote() from public, anon;
revoke execute on function public.sync_luminaria_round_after_action() from public, anon;
grant execute on function public.start_luminaria_game(uuid, text[]) to authenticated;
grant execute on function public.restart_luminaria_room(uuid) to authenticated;
grant execute on function public.initialize_luminaria_deck(uuid, text[]) to authenticated;
grant execute on function public.luminaria_hand(uuid) to authenticated;
grant execute on function public.play_luminaria_card(uuid, text) to authenticated;
grant execute on function public.luminaria_deck_state(uuid) to authenticated;
grant execute on function public.luminaria_round_progress(uuid) to authenticated;
grant execute on function public.finalize_luminaria_round(uuid) to authenticated;
grant execute on function public.advance_luminaria_round(uuid) to authenticated;
grant execute on function public.set_luminaria_recovery_token(uuid, text) to authenticated;
grant execute on function public.reclaim_luminaria_seat(text, text) to authenticated;
