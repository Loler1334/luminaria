-- Stage 3A key cutover for human seats. Apply after participant-*-3a.sql.
-- Keep legacy uniqueness and NOT NULL columns until bot actions are ready.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

do $$
begin
  if exists (select 1 from public.rounds where storyteller_participant_id is null)
    or exists (select 1 from public.card_submissions where participant_id is null)
    or exists (select 1 from public.votes where voter_participant_id is null)
    or exists (select 1 from public.luminaria_card_rerolls where participant_id is null)
    or exists (select 1 from public.room_deck_cards
      where owner_id is not null and owner_participant_id is null) then
    raise exception 'Participant references must be backfilled before changing keys';
  end if;
end;
$$;

-- This remains an ON CONFLICT (room_id, user_id) arbiter after the PK swap.
create unique index if not exists room_players_room_user_3a_idx
  on public.room_players(room_id, user_id);
do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.room_players'::regclass
      and conname = 'room_players_room_user_3a_key') then
    alter table public.room_players add constraint room_players_room_user_3a_key
      unique using index room_players_room_user_3a_idx;
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.room_players'::regclass
        and conname = 'room_players_pkey') <> 'PRIMARY KEY (id)' then
    alter table public.room_players
      drop constraint room_players_pkey,
      add constraint room_players_pkey
        primary key using index room_players_participant_id_idx;
  end if;
end;
$$;

alter table public.rounds alter column storyteller_participant_id set not null;
alter table public.card_submissions alter column participant_id set not null;
alter table public.votes alter column voter_participant_id set not null;
alter table public.luminaria_card_rerolls alter column participant_id set not null;

-- Leave old arbiters in place for previous client/RPC versions.
create unique index if not exists card_submissions_round_participant_3a_idx
  on public.card_submissions(round_id, participant_id);
create unique index if not exists votes_round_voter_participant_3a_idx
  on public.votes(round_id, voter_participant_id);
create unique index if not exists room_deck_cards_room_owner_participant_position_3a_idx
  on public.room_deck_cards(room_id, owner_participant_id, position);

-- Reroll history has a composite PK. Preserve its old ON CONFLICT arbiter.
create unique index if not exists luminaria_card_rerolls_legacy_3a_idx
  on public.luminaria_card_rerolls(milestone_round_id, player_id);
create unique index if not exists luminaria_card_rerolls_participant_3a_idx
  on public.luminaria_card_rerolls(milestone_round_id, participant_id);
do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.luminaria_card_rerolls'::regclass
      and conname = 'luminaria_card_rerolls_legacy_3a_key') then
    alter table public.luminaria_card_rerolls
      add constraint luminaria_card_rerolls_legacy_3a_key
        unique using index luminaria_card_rerolls_legacy_3a_idx;
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.luminaria_card_rerolls'::regclass
        and conname = 'luminaria_card_rerolls_pkey')
       <> 'PRIMARY KEY (milestone_round_id, participant_id)' then
    alter table public.luminaria_card_rerolls
      drop constraint luminaria_card_rerolls_pkey,
      add constraint luminaria_card_rerolls_pkey
        primary key using index luminaria_card_rerolls_participant_3a_idx;
  end if;
end;
$$;

commit;
