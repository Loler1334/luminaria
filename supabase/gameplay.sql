-- Luminaria: rounds, submitted cards, and votes.
-- Run once in Supabase SQL Editor after schema.sql.

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  storyteller_id uuid not null references public.profiles(id) on delete cascade,
  clue text not null check (char_length(clue) between 1 and 70),
  phase text not null default 'submitting'
    check (phase in ('submitting', 'voting', 'results')),
  created_at timestamptz not null default now()
);

create table if not exists public.card_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.card_submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, voter_id)
);

alter table public.rounds enable row level security;
alter table public.card_submissions enable row level security;
alter table public.votes enable row level security;

drop policy if exists "players read rounds" on public.rounds;
drop policy if exists "storytellers create rounds" on public.rounds;
drop policy if exists "storytellers advance their rounds" on public.rounds;
drop policy if exists "players read submitted cards" on public.card_submissions;
drop policy if exists "players submit one card as themselves" on public.card_submissions;
drop policy if exists "players read votes" on public.votes;
drop policy if exists "players vote as themselves" on public.votes;

create policy "players read rounds" on public.rounds
  for select to authenticated using (true);
create policy "storytellers create rounds" on public.rounds
  for insert to authenticated with check (auth.uid() = storyteller_id);
create policy "storytellers advance their rounds" on public.rounds
  for update to authenticated using (auth.uid() = storyteller_id);

create policy "players read submitted cards" on public.card_submissions
  for select to authenticated using (
    player_id = auth.uid()
    or exists (
      select 1 from public.rounds
      where rounds.id = card_submissions.round_id
        and rounds.phase in ('voting', 'results')
    )
  );
create policy "players submit one card as themselves" on public.card_submissions
  for insert to authenticated with check (auth.uid() = player_id);

create policy "players read votes" on public.votes
  for select to authenticated using (true);
create policy "players vote as themselves" on public.votes
  for insert to authenticated with check (auth.uid() = voter_id);

-- The rules must hold even if a player opens the app in several browser tabs.
create or replace function public.validate_luminaria_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  round_storyteller uuid;
  card_owner uuid;
begin
  select storyteller_id into round_storyteller from public.rounds where id = new.round_id;
  select player_id into card_owner from public.card_submissions where id = new.submission_id;

  if new.voter_id = round_storyteller then
    raise exception 'The storyteller cannot vote in their own round';
  end if;
  if new.voter_id = card_owner then
    raise exception 'A player cannot vote for their own card';
  end if;
  return new;
end;
$$;

-- Shared finite deck. Every card is assigned once when the host starts a room.
create table if not exists public.room_deck_cards (
  room_id uuid not null references public.rooms(id) on delete cascade,
  card_id text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  position integer not null check (position > 0),
  is_played boolean not null default false,
  primary key (room_id, card_id),
  unique (room_id, owner_id, position)
);

alter table public.room_deck_cards enable row level security;

create or replace function public.initialize_luminaria_deck(target_room_id uuid, card_ids text[])
returns table (cards_per_player integer, total_rounds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  player_count integer;
  usable_cards integer;
begin
  if not exists (select 1 from rooms where id = target_room_id and host_id = auth.uid()) then
    raise exception 'Only the host can initialize this deck';
  end if;
  select count(*) into player_count from room_players where room_id = target_room_id;
  if player_count < 3 then
    raise exception 'At least three players are required';
  end if;
  if array_length(card_ids, 1) is null or array_length(card_ids, 1) <> (select count(distinct card) from unnest(card_ids) as card) then
    raise exception 'Deck cards must be unique';
  end if;
  usable_cards := (array_length(card_ids, 1) / player_count) * player_count;
  if usable_cards = 0 then raise exception 'Not enough cards for this room'; end if;
  if exists (select 1 from room_deck_cards where room_id = target_room_id) then
    return query select coalesce(max(position), 0), coalesce(max(position), 0)
      from room_deck_cards where room_id = target_room_id;
    return;
  end if;
  insert into room_deck_cards (room_id, card_id, owner_id, position)
  select target_room_id, ordered.card_id, players.user_id, ordered.position
  from (
    select card_id, ((ordinality - 1) / player_count) + 1 as position,
      ((ordinality - 1) % player_count) + 1 as player_index
    from unnest(card_ids[1:usable_cards]) with ordinality as deck(card_id, ordinality)
  ) ordered
  join (
    select user_id, row_number() over (order by joined_at) as player_index
    from room_players where room_id = target_room_id
  ) players using (player_index);
  return query select usable_cards / player_count, usable_cards / player_count;
end;
$$;

create or replace function public.luminaria_hand(target_room_id uuid)
returns table (card_id text, hand_position integer, remaining integer)
language sql
security definer
set search_path = public
as $$
  select card_id, position as hand_position,
    count(*) over ()::integer as remaining
  from room_deck_cards
  where room_id = target_room_id and owner_id = auth.uid() and not is_played
  order by position
  limit 6;
$$;

create or replace function public.play_luminaria_card(target_round_id uuid, chosen_card_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_room uuid;
  previous_card text;
begin
  select room_id into active_room from rounds where id = target_round_id and phase = 'submitting' for update;
  if active_room is null or not exists (select 1 from room_players where room_id = active_room and user_id = (select auth.uid())) then
    raise exception 'You cannot play in this round';
  end if;
  select card_id into previous_card from card_submissions
    where round_id = target_round_id and player_id = (select auth.uid());
  if previous_card is not null then
    if previous_card <> chosen_card_id then raise exception 'A card has already been submitted for this round'; end if;
    return;
  end if;
  update room_deck_cards set is_played = true
  where room_id = active_room and card_id = chosen_card_id and owner_id = (select auth.uid()) and not is_played;
  if not found then raise exception 'This card is not in your hand'; end if;
  insert into card_submissions (round_id, player_id, card_id)
  values (target_round_id, (select auth.uid()), chosen_card_id)
  on conflict (round_id, player_id) do nothing;
end;
$$;

create or replace function public.luminaria_deck_state(target_room_id uuid)
returns table (remaining_cards integer, cards_per_player integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from room_players where room_id = target_room_id and user_id = auth.uid()) then
    raise exception 'You are not a player in this room';
  end if;
  return query select
    count(*) filter (where not is_played)::integer,
    coalesce(max(position), 0)::integer
  from room_deck_cards where room_id = target_room_id;
end;
$$;

grant execute on function public.initialize_luminaria_deck(uuid, text[]) to authenticated;
grant execute on function public.luminaria_hand(uuid) to authenticated;
grant execute on function public.play_luminaria_card(uuid, text) to authenticated;
grant execute on function public.luminaria_deck_state(uuid) to authenticated;

-- The storyteller finalizes a round in one transaction. This keeps scores
-- consistent for every connected player and prevents clients from assigning points.
create or replace function public.luminaria_round_progress(target_round_id uuid)
returns table (participant_count integer, submission_count integer, vote_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_room uuid;
begin
  select room_id into active_room from public.rounds where id = target_round_id;
  if active_room is null or not exists (
    select 1 from public.room_players where room_id = active_room and user_id = auth.uid()
  ) then
    raise exception 'You are not a player in this round';
  end if;
  return query select
    (select count(*)::integer from public.room_players where room_id = active_room),
    (select count(*)::integer from public.card_submissions where round_id = target_round_id),
    (select count(*)::integer from public.votes where round_id = target_round_id);
end;
$$;

grant execute on function public.luminaria_round_progress(uuid) to authenticated;

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
  participant_count integer;
  participant record;
  card_votes integer;
begin
  select * into active_round from public.rounds where id = target_round_id for update;
  if active_round.id is null then
    raise exception 'Round not found';
  end if;
  if auth.uid() <> active_round.storyteller_id then
    raise exception 'Only the storyteller can finalize this round';
  end if;
  if active_round.phase <> 'voting' then
    raise exception 'This round is not ready for results';
  end if;

  select count(*) into participant_count from public.room_players where room_id = active_round.room_id;
  select id into storyteller_submission from public.card_submissions
    where round_id = target_round_id and player_id = active_round.storyteller_id;
  select count(*) into correct_votes from public.votes
    where round_id = target_round_id and submission_id = storyteller_submission;

  for participant in select player_id, id from public.card_submissions where round_id = target_round_id loop
    if participant.player_id = active_round.storyteller_id then
      if correct_votes > 0 and correct_votes < participant_count - 1 then
        update public.room_players set score = score + 3 + correct_votes
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    else
      select count(*) into card_votes from public.votes where submission_id = participant.id;
      update public.room_players set score = score + card_votes
        where room_id = active_round.room_id and user_id = participant.player_id;
      if exists (select 1 from public.votes where round_id = target_round_id and voter_id = participant.player_id and submission_id = storyteller_submission) then
        update public.room_players set score = score + 3
          where room_id = active_round.room_id and user_id = participant.player_id;
      end if;
    end if;
  end loop;

  update public.rounds set phase = 'results' where id = target_round_id;
  if not exists (select 1 from public.room_deck_cards where room_id = active_round.room_id and not is_played) then
    update public.rooms set status = 'finished' where id = active_round.room_id;
  end if;
end;
$$;

grant execute on function public.finalize_luminaria_round(uuid) to authenticated;

drop trigger if exists validate_luminaria_vote on public.votes;
create trigger validate_luminaria_vote
  before insert on public.votes
  for each row execute function public.validate_luminaria_vote();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rounds') then
    alter publication supabase_realtime add table public.rounds;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'card_submissions') then
    alter publication supabase_realtime add table public.card_submissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes') then
    alter publication supabase_realtime add table public.votes;
  end if;
end;
$$;
