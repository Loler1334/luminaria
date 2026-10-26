-- Stage 3B.2: deterministic bot turns. Apply after participant-bot-seats-3b.sql.
-- Do not grant EXECUTE to authenticated until the bot-aware client is ready.
-- Model calls belong outside PostgreSQL; this is the no-network fallback.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.luminaria_bot_clue(
  target_room_id uuid, round_number integer)
returns text language plpgsql security definer set search_path = '' as $$
declare
  chosen text;
begin
  select pool.clue into chosen
  from (values
    ('Эхо забытого сна'), ('Свет сквозь трещины'),
    ('Секрет старого часовщика'), ('Танец на краю тени'),
    ('Хрупкое обещание'), ('Последний маяк перед бурей'),
    ('Луна забыла дорогу'), ('Чай для невидимого гостя'),
    ('Шёпот бумажного дракона'), ('Ключ от вчерашнего завтра'),
    ('Там, где смеётся туман'), ('Письмо из кармана облака'),
    ('Звезда на школьной парте'), ('Корона для сонной улитки'),
    ('Дождь из чужих воспоминаний'), ('Зеркало, которое опоздало'),
    ('Будильник для спящего леса'), ('Космический суп остыл'),
    ('Парад потерянных носков'), ('Маяк в чашке какао'),
    ('Песочные часы чихнули'), ('Огурец захватил созвездие'),
    ('Дракон боится чайника'), ('Пингвин перепутал планеты'),
    ('Солнце ушло за мороженым'), ('Тень заказала такси'),
    ('Лестница в кармане великана'), ('Почтальон для лунных котов'),
    ('Буря в банке варенья'), ('Невидимый оркестр опоздал')
  ) as pool(clue)
  where not exists (select 1 from public.rounds r
    where r.room_id = target_room_id and lower(r.clue) = lower(pool.clue))
  order by md5(target_room_id::text || round_number::text || pool.clue)
  limit 1;
  if chosen is not null then return chosen; end if;
  -- Even unusually long parties keep a fresh, valid clue after pool exhaustion.
  select pool.clue || ' · ' || suffix.n::text into chosen
  from (values
    ('Эхо забытого сна'), ('Свет сквозь трещины'),
    ('Секрет старого часовщика'), ('Танец на краю тени'),
    ('Хрупкое обещание'), ('Последний маяк перед бурей')
  ) as pool(clue)
  cross join generate_series(2, 9999) as suffix(n)
  where not exists (select 1 from public.rounds r
    where r.room_id = target_room_id
      and lower(r.clue) = lower(pool.clue || ' · ' || suffix.n::text))
  order by suffix.n,
    md5(target_room_id::text || round_number::text || pool.clue)
  limit 1;
  if chosen is null then raise exception 'Bot clue pool is exhausted'; end if;
  return chosen;
end;
$$;
revoke all on function public.luminaria_bot_clue(uuid,integer)
  from public, anon, authenticated;

create or replace function public.advance_luminaria_bots(target_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  active_round public.rounds%rowtype;
  storyteller public.room_players%rowtype;
  bot record;
  chosen_card text;
  chosen_submission uuid;
  round_number integer;
  action_count integer := 0;
  current_phase text;
begin
  -- Existing card/vote triggers lock round before room. Match that order in
  -- active phases; only an awaiting-storyteller turn takes the room first.
  select * into room_row from public.rooms where id = target_room_id;
  if room_row.id is null or not (select private.is_luminaria_room_member(target_room_id)) then
    raise exception 'Room membership required';
  end if;
  if not room_row.awaiting_storyteller then
    select * into active_round from public.rounds
      where room_id = target_room_id
      order by created_at desc, id desc limit 1 for update;
  end if;
  select * into room_row from public.rooms where id = target_room_id for update;
  if room_row.status <> 'playing' then
    return jsonb_build_object('advanced', false, 'reason', 'not_playing');
  end if;
  if not (select private.is_luminaria_room_member(target_room_id)) then
    raise exception 'Room membership required';
  end if;
  if room_row.awaiting_storyteller then
    select * into storyteller from public.room_players
      where id = room_row.current_storyteller_participant_id
        and room_id = target_room_id and is_bot;
    if storyteller.id is null then
      return jsonb_build_object('advanced', false, 'reason', 'human_storyteller');
    end if;
    select count(*) + 1 into round_number from public.rounds
      where room_id = target_room_id;
    select hand.card_id into chosen_card from (
      select card_id, position from public.room_deck_cards
      where room_id = target_room_id
        and owner_participant_id = storyteller.id and not is_played
      order by position, card_id limit 6
    ) hand
    order by md5(target_room_id::text || round_number::text ||
      storyteller.id::text || hand.card_id), hand.card_id limit 1;
    if chosen_card is null then raise exception 'Bot storyteller has no visible card'; end if;
    insert into public.rounds(room_id, storyteller_participant_id, clue)
      values(target_room_id, storyteller.id,
        public.luminaria_bot_clue(target_room_id, round_number))
      returning * into active_round;
    update public.room_deck_cards set is_played = true
      where room_id = target_room_id and card_id = chosen_card
        and owner_participant_id = storyteller.id and not is_played;
    if not found then raise exception 'Bot storyteller card is no longer available'; end if;
    insert into public.card_submissions(round_id, participant_id, card_id)
      values(active_round.id, storyteller.id, chosen_card);
    action_count := action_count + 1;
  elsif active_round.id is null or active_round.room_id <> target_room_id
     or active_round.id is distinct from (
       select id from public.rounds where room_id = target_room_id
       order by created_at desc, id desc limit 1) then
    return jsonb_build_object('advanced', false, 'reason', 'retry');
  end if;

  select phase into current_phase from public.rounds where id = active_round.id;
  if current_phase = 'submitting' then
    for bot in select id from public.room_players
      where room_id = target_room_id and is_bot order by joined_at, id loop
      if exists (select 1 from public.card_submissions
        where round_id = active_round.id and participant_id = bot.id) then
        continue;
      end if;
      select hand.card_id into chosen_card from (
        select card_id, position from public.room_deck_cards
        where room_id = target_room_id and owner_participant_id = bot.id
          and not is_played
        order by position, card_id limit 6
      ) hand
      order by md5(active_round.id::text || bot.id::text || hand.card_id),
        hand.card_id limit 1;
      if chosen_card is null then raise exception 'Bot has no visible card'; end if;
      update public.room_deck_cards set is_played = true
        where room_id = target_room_id and card_id = chosen_card
          and owner_participant_id = bot.id and not is_played;
      if not found then raise exception 'Bot card is no longer available'; end if;
      -- The round lock and precheck make this idempotent. A unique error rolls
      -- back the card mark instead of silently losing a card on conflict.
      insert into public.card_submissions(round_id, participant_id, card_id)
        values(active_round.id, bot.id, chosen_card);
      action_count := action_count + 1;
    end loop;
  end if;

  select phase into current_phase from public.rounds where id = active_round.id;
  if current_phase = 'voting' then
    for bot in select id from public.room_players
      where room_id = target_room_id and is_bot
        and id <> active_round.storyteller_participant_id
      order by joined_at, id loop
      if exists (select 1 from public.votes
        where round_id = active_round.id and voter_participant_id = bot.id) then
        continue;
      end if;
      select s.id into chosen_submission from public.card_submissions s
        where s.round_id = active_round.id and s.participant_id <> bot.id
        order by md5(active_round.id::text || bot.id::text || s.id::text), s.id
        limit 1;
      if chosen_submission is null then raise exception 'Bot has no legal vote'; end if;
      insert into public.votes(round_id, voter_participant_id, submission_id)
        values(active_round.id, bot.id, chosen_submission);
      action_count := action_count + 1;
    end loop;
  end if;
  select phase into current_phase from public.rounds where id = active_round.id;
  return jsonb_build_object('advanced', action_count > 0,
    'actions', action_count, 'phase', current_phase,
    'round_id', active_round.id);
end;
$$;
revoke all on function public.advance_luminaria_bots(uuid)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
