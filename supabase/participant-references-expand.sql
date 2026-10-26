-- Phase 2 DRAFT: do not apply to production until the dual-write triggers
-- and recovery path have been exercised in an isolated database.
-- These nullable references preserve the existing human-only client and RPCs.
-- Existing clients and RPCs keep writing legacy user IDs. The triggers below
-- fill participant IDs for every new row in the same transaction as backfill.

begin;
set local lock_timeout = '2s';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'room_players' and column_name = 'id'
  ) then
    raise exception 'Apply participant-seats-expand.sql first';
  end if;
end;
$$;

alter table public.rooms
  add column if not exists current_storyteller_participant_id uuid;
alter table public.rounds
  add column if not exists storyteller_participant_id uuid;
alter table public.card_submissions
  add column if not exists participant_id uuid;
alter table public.votes
  add column if not exists voter_participant_id uuid;
alter table public.room_deck_cards
  add column if not exists owner_participant_id uuid;
alter table public.luminaria_card_rerolls
  add column if not exists participant_id uuid;

-- Re-running repairs rows written by older clients after the first backfill.
update public.rooms r set current_storyteller_participant_id = seat.id
from public.room_players seat
where seat.room_id = r.id and seat.user_id = r.current_storyteller_id
  and r.current_storyteller_participant_id is distinct from seat.id;

update public.rounds r set storyteller_participant_id = seat.id
from public.room_players seat
where seat.room_id = r.room_id and seat.user_id = r.storyteller_id
  and r.storyteller_participant_id is distinct from seat.id;

update public.card_submissions submission set participant_id = seat.id
from public.rounds r, public.room_players seat
where r.id = submission.round_id and seat.room_id = r.room_id
  and seat.user_id = submission.player_id
  and submission.participant_id is distinct from seat.id;

update public.votes vote set voter_participant_id = seat.id
from public.rounds r, public.room_players seat
where r.id = vote.round_id and seat.room_id = r.room_id
  and seat.user_id = vote.voter_id
  and vote.voter_participant_id is distinct from seat.id;

update public.room_deck_cards card set owner_participant_id = seat.id
from public.room_players seat
where seat.room_id = card.room_id and seat.user_id = card.owner_id
  and card.owner_participant_id is distinct from seat.id;

update public.luminaria_card_rerolls reroll set participant_id = seat.id
from public.room_players seat
where seat.room_id = reroll.room_id and seat.user_id = reroll.player_id
  and reroll.participant_id is distinct from seat.id;

-- Abort atomically if any historical human-owned row has no matching seat.
do $$
begin
  if exists (select 1 from public.rounds where storyteller_participant_id is null)
    or exists (select 1 from public.card_submissions where participant_id is null)
    or exists (select 1 from public.votes where voter_participant_id is null)
    or exists (select 1 from public.room_deck_cards
      where owner_id is not null and owner_participant_id is null)
    or exists (select 1 from public.luminaria_card_rerolls where participant_id is null)
    or exists (select 1 from public.rooms
      where current_storyteller_id is not null and current_storyteller_participant_id is null)
  then
    raise exception 'A legacy game row has no matching room_players seat';
  end if;
end;
$$;

-- New legacy INSERTs receive the seat ID before they become visible. On UPDATE,
-- an unchanged participant ID survives account recovery: reclaim_luminaria_seat
-- updates child user IDs before it updates room_players.user_id.
create or replace function public.sync_luminaria_participant_reference()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  seat_room_id uuid;
  legacy_user_id uuid;
  previous_user_id uuid;
  participant_id uuid;
  previous_participant_id uuid;
  matching_seat_id uuid;
begin
  case tg_table_name
    when 'rooms' then
      seat_room_id := new.id;
      legacy_user_id := new.current_storyteller_id;
      participant_id := new.current_storyteller_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.current_storyteller_id;
        previous_participant_id := old.current_storyteller_participant_id;
      end if;
    when 'rounds' then
      seat_room_id := new.room_id;
      legacy_user_id := new.storyteller_id;
      participant_id := new.storyteller_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.storyteller_id;
        previous_participant_id := old.storyteller_participant_id;
      end if;
    when 'card_submissions' then
      select room_id into seat_room_id from public.rounds where id = new.round_id;
      legacy_user_id := new.player_id;
      participant_id := new.participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.player_id;
        previous_participant_id := old.participant_id;
      end if;
    when 'votes' then
      select room_id into seat_room_id from public.rounds where id = new.round_id;
      legacy_user_id := new.voter_id;
      participant_id := new.voter_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.voter_id;
        previous_participant_id := old.voter_participant_id;
      end if;
    when 'room_deck_cards' then
      seat_room_id := new.room_id;
      legacy_user_id := new.owner_id;
      participant_id := new.owner_participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.owner_id;
        previous_participant_id := old.owner_participant_id;
      end if;
    when 'luminaria_card_rerolls' then
      seat_room_id := new.room_id;
      legacy_user_id := new.player_id;
      participant_id := new.participant_id;
      if tg_op = 'UPDATE' then
        previous_user_id := old.player_id;
        previous_participant_id := old.participant_id;
      end if;
    else
      raise exception 'Unsupported participant reference table: %', tg_table_name;
  end case;

  if seat_room_id is null then
    raise exception 'Participant reference has no room';
  end if;
  if legacy_user_id is not null then
    select id into matching_seat_id from public.room_players
      where room_id = seat_room_id and user_id = legacy_user_id;
    if matching_seat_id is null and tg_op = 'UPDATE'
       and participant_id = previous_participant_id
       and legacy_user_id is distinct from previous_user_id
       and exists (select 1 from public.room_players
         where id = participant_id and room_id = seat_room_id
           and user_id = previous_user_id) then
      -- In-flight recovery: the seat's user_id changes later in this transaction.
      matching_seat_id := participant_id;
    end if;
    if matching_seat_id is null then
      raise exception 'No room seat for legacy game user';
    end if;
    participant_id := matching_seat_id;
  elsif tg_table_name in ('rooms', 'room_deck_cards') and (
    participant_id is null
    or (tg_op = 'UPDATE' and previous_user_id is not null
      and participant_id = previous_participant_id)
  ) then
    -- A legacy writer clearing a human owner also clears its seat. An explicit
    -- new participant ID (future bot) is checked by the branch below.
    participant_id := null;
  elsif participant_id is null or not exists (
    select 1 from public.room_players
    where id = participant_id and room_id = seat_room_id
  ) then
    raise exception 'Invalid participant reference';
  end if;

  case tg_table_name
    when 'rooms' then new.current_storyteller_participant_id := participant_id;
    when 'rounds' then new.storyteller_participant_id := participant_id;
    when 'card_submissions' then new.participant_id := participant_id;
    when 'votes' then new.voter_participant_id := participant_id;
    when 'room_deck_cards' then new.owner_participant_id := participant_id;
    when 'luminaria_card_rerolls' then new.participant_id := participant_id;
  end case;
  return new;
end;
$$;
revoke all on function public.sync_luminaria_participant_reference()
  from public, anon, authenticated;

drop trigger if exists sync_luminaria_room_storyteller_participant on public.rooms;
create trigger sync_luminaria_room_storyteller_participant
-- Starting a game updates status only; the existing BEFORE trigger assigns
-- current_storyteller_id from host_id during that same statement.
before insert or update of status, current_storyteller_id,
  current_storyteller_participant_id on public.rooms for each row
execute function public.sync_luminaria_participant_reference();
drop trigger if exists sync_luminaria_round_storyteller_participant on public.rounds;
create trigger sync_luminaria_round_storyteller_participant
before insert or update of room_id, storyteller_id,
  storyteller_participant_id on public.rounds for each row
execute function public.sync_luminaria_participant_reference();
drop trigger if exists sync_luminaria_submission_participant on public.card_submissions;
create trigger sync_luminaria_submission_participant
before insert or update of round_id, player_id, participant_id
on public.card_submissions for each row
execute function public.sync_luminaria_participant_reference();
drop trigger if exists sync_luminaria_vote_participant on public.votes;
create trigger sync_luminaria_vote_participant
before insert or update of round_id, voter_id, voter_participant_id
on public.votes for each row
execute function public.sync_luminaria_participant_reference();
drop trigger if exists sync_luminaria_deck_owner_participant on public.room_deck_cards;
create trigger sync_luminaria_deck_owner_participant
before insert or update of room_id, owner_id, owner_participant_id
on public.room_deck_cards for each row
execute function public.sync_luminaria_participant_reference();
drop trigger if exists sync_luminaria_reroll_participant on public.luminaria_card_rerolls;
create trigger sync_luminaria_reroll_participant
before insert or update of room_id, player_id, participant_id
on public.luminaria_card_rerolls for each row
execute function public.sync_luminaria_participant_reference();

-- Nullable FKs allow legacy writers until the dual-write cutover.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.rooms'::regclass
    and conname = 'rooms_current_storyteller_participant_fk') then
    alter table public.rooms add constraint rooms_current_storyteller_participant_fk
      foreign key (current_storyteller_participant_id) references public.room_players(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.rounds'::regclass
    and conname = 'rounds_storyteller_participant_fk') then
    alter table public.rounds add constraint rounds_storyteller_participant_fk
      foreign key (storyteller_participant_id) references public.room_players(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.card_submissions'::regclass
    and conname = 'card_submissions_participant_fk') then
    alter table public.card_submissions add constraint card_submissions_participant_fk
      foreign key (participant_id) references public.room_players(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.votes'::regclass
    and conname = 'votes_voter_participant_fk') then
    alter table public.votes add constraint votes_voter_participant_fk
      foreign key (voter_participant_id) references public.room_players(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.room_deck_cards'::regclass
    and conname = 'room_deck_cards_owner_participant_fk') then
    alter table public.room_deck_cards add constraint room_deck_cards_owner_participant_fk
      foreign key (owner_participant_id) references public.room_players(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.luminaria_card_rerolls'::regclass
    and conname = 'luminaria_card_rerolls_participant_fk') then
    alter table public.luminaria_card_rerolls add constraint luminaria_card_rerolls_participant_fk
      foreign key (participant_id) references public.room_players(id) not valid;
  end if;
end;
$$;

-- Child-side indexes support seat lookups and FK checks. PostgreSQL does not
-- create them automatically for the referencing columns.
create index if not exists idx_rooms_storyteller_participant
  on public.rooms(current_storyteller_participant_id);
create index if not exists idx_rounds_storyteller_participant
  on public.rounds(storyteller_participant_id);
create index if not exists idx_card_submissions_round_participant
  on public.card_submissions(round_id, participant_id);
create index if not exists idx_votes_round_voter_participant
  on public.votes(round_id, voter_participant_id);
create index if not exists idx_room_deck_cards_room_owner_participant
  on public.room_deck_cards(room_id, owner_participant_id, position);
create index if not exists idx_card_rerolls_room_participant
  on public.luminaria_card_rerolls(room_id, participant_id);

commit;

-- Validation is deliberately a separate transaction, so it does not prolong
-- the metadata locks held while the new columns and triggers are installed.
begin;
set local lock_timeout = '2s';
alter table public.rooms validate constraint rooms_current_storyteller_participant_fk;
alter table public.rounds validate constraint rounds_storyteller_participant_fk;
alter table public.card_submissions validate constraint card_submissions_participant_fk;
alter table public.votes validate constraint votes_voter_participant_fk;
alter table public.room_deck_cards validate constraint room_deck_cards_owner_participant_fk;
alter table public.luminaria_card_rerolls validate constraint luminaria_card_rerolls_participant_fk;

commit;
