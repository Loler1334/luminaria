-- Run as one transaction. Existing games and scores are preserved.
begin;
alter table public.rooms add column if not exists round_cycles integer not null default 2 check (round_cycles >= 2);
alter table public.rooms drop constraint if exists rooms_round_cycles_check;
alter table public.rooms add constraint rooms_round_cycles_check check (round_cycles >= 1);

create or replace function public.configure_luminaria_lobby(target_room_id uuid, chosen_deck text, chosen_cycles integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare configured public.rooms;
begin
  if chosen_deck is null or chosen_deck not in ('moonlit-archive','pop-culture') or chosen_cycles is null
    or chosen_cycles < case when (select count(*) from public.room_players where room_id=target_room_id) >= 8 then 1 else 2 end then
    raise exception 'Invalid lobby settings';
  end if;
  update public.rooms set deck_id=chosen_deck, round_cycles=chosen_cycles
    where id=target_room_id and host_id=auth.uid() and status='lobby' returning * into configured;
  if not found then raise exception 'Only the lobby host can change settings'; end if;
  return to_jsonb(configured);
end;
$$;
revoke all on function public.configure_luminaria_lobby(uuid,text,integer) from public, anon;
grant execute on function public.configure_luminaria_lobby(uuid,text,integer) to authenticated;

create or replace function public.luminaria_round_waiting(target_round_id uuid)
returns table(user_id uuid, has_submitted boolean, has_voted boolean)
language plpgsql security definer set search_path = public as $$
declare active_room uuid;
begin
  select r.room_id into active_room from public.rounds r where r.id=target_round_id;
  if not exists(select 1 from public.room_players p where p.room_id=active_room and p.user_id=auth.uid()) then
    raise exception 'Only room members can view progress';
  end if;
  return query select p.user_id,
    exists(select 1 from public.card_submissions s where s.round_id=target_round_id and s.player_id=p.user_id),
    exists(select 1 from public.votes v where v.round_id=target_round_id and v.voter_id=p.user_id)
  from public.room_players p where p.room_id=active_room order by p.joined_at;
end;
$$;
revoke all on function public.luminaria_round_waiting(uuid) from public, anon;
grant execute on function public.luminaria_round_waiting(uuid) to authenticated;

create or replace function public.start_luminaria_game(
  target_room_id uuid,
  card_ids text[]
)
returns table (cards_per_player integer, total_rounds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  player_count integer;
  usable_cards integer;
begin
  perform 1 from public.rooms where id = target_room_id for update;
  if not exists (
    select 1 from public.rooms
    where id = target_room_id and host_id = auth.uid() and status = 'lobby'
  ) then
    raise exception 'Only the host can start a lobby room';
  end if;

  lock table public.room_players in share row exclusive mode;
  select count(*) into player_count
  from public.room_players
  where room_id = target_room_id;

  if player_count < 3 or player_count > 10 then
    raise exception 'At least three players are required';
  end if;

  if exists (
    select 1 from public.room_players
    where room_id = target_room_id and not is_ready
  ) then
    raise exception 'Every player must be ready';
  end if;

  if array_length(card_ids, 1) is null
    or array_length(card_ids, 1) <> (select count(distinct card) from unnest(card_ids) as card) then
    raise exception 'Deck cards must be unique';
  end if;

  usable_cards := array_length(card_ids, 1);
  if usable_cards % (player_count * player_count) <> 0
    or usable_cards < (case when player_count >= 8 then 1 else 2 end) * player_count * player_count then
    raise exception 'Choose enough cards for complete storyteller cycles; refresh the lobby after player changes';
  end if;
  if usable_cards = 0 then
    raise exception 'Not enough cards for this room';
  end if;

  delete from public.room_deck_cards where room_id = target_room_id;

  insert into public.room_deck_cards (room_id, card_id, owner_id, position)
  select target_room_id, ordered.card_id, players.user_id, ordered.position
  from (
    select
      card_id,
      ((ordinality - 1) / player_count) + 1 as position,
      ((ordinality - 1) % player_count) + 1 as player_index
    from unnest(card_ids[1:usable_cards]) with ordinality as deck(card_id, ordinality)
  ) ordered
  join (
    select user_id, row_number() over (order by joined_at) as player_index
    from public.room_players
    where room_id = target_room_id
  ) players using (player_index);

  update public.rooms
    set status = 'playing', round_cycles = usable_cards / (player_count * player_count)
    where id = target_room_id and status = 'lobby';

  if not found then
    raise exception 'This room has already started';
  end if;

  return query select usable_cards / player_count, usable_cards / player_count;
end;
$$;

grant execute on function public.start_luminaria_game(uuid, text[]) to authenticated;

revoke all on function public.start_luminaria_game(uuid,text[]) from public, anon;
commit;
