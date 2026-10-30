-- Read literal tags plus curated clues. Curated exact clues guide 80% of bot votes.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.luminaria_bot_semantic_score(
  target_clue text, target_card_id text, allow_curated boolean default true)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  semantics public.luminaria_bot_card_semantics%rowtype;
  score integer;
  clue text;
  normalized_target text := lower(btrim(regexp_replace(coalesce(target_clue, ''), '[^[:alnum:]]+', ' ', 'g')));
begin
  select * into semantics from public.luminaria_bot_card_semantics where card_id = target_card_id;
  if semantics.card_id is null then return 0; end if;
  score := public.luminaria_bot_card_match(target_clue,
    concat_ws(' ', semantics.title, semantics.keywords, semantics.title_en, semantics.keywords_en),
    concat_ws(' ', semantics.scene, semantics.scene_en));
  if not allow_curated then return score; end if;
  foreach clue in array (coalesce(semantics.clues, '{}'::text[]) ||
                         coalesce(semantics.clues_en, '{}'::text[])) loop
    if normalized_target = lower(btrim(regexp_replace(clue, '[^[:alnum:]]+', ' ', 'g'))) then
      return score + 120;
    end if;
  end loop;
  -- Both configured stemmers recognize many Russian and English inflections.
  return score + public.luminaria_bot_card_match(target_clue, '',
    concat_ws(' ', array_to_string(semantics.clues, ' '),
      array_to_string(semantics.clues_en, ' ')));
end;
$$;
revoke all on function public.luminaria_bot_semantic_score(text,text,boolean)
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
    order by case when exists (select 1 from public.luminaria_bot_card_semantics
        where card_id = hand.card_id) then 0 else 1 end,
      md5(target_room_id::text || round_number::text ||
      storyteller.id::text || hand.card_id), hand.card_id limit 1;
    if chosen_card is null then raise exception 'Bot storyteller has no visible card'; end if;
    insert into public.rounds(room_id, storyteller_participant_id, clue)
      values(target_room_id, storyteller.id,
        public.luminaria_bot_clue(target_room_id, round_number, chosen_card))
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
      order by public.luminaria_bot_semantic_score(active_round.clue, hand.card_id, true) desc,
        md5(active_round.id::text || bot.id::text || hand.card_id),
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
        left join public.luminaria_bot_card_semantics semantics
          on semantics.card_id = s.card_id
        where s.round_id = active_round.id and s.participant_id <> bot.id
        order by public.luminaria_bot_semantic_score(active_round.clue, s.card_id, ((('x' || substr(md5(active_round.id::text || bot.id::text), 1, 2))::bit(8))::integer < 204)) desc,
          md5(active_round.id::text || bot.id::text || s.id::text), s.id
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
revoke all on function public.advance_luminaria_bots(uuid) from public, anon;
grant execute on function public.advance_luminaria_bots(uuid) to authenticated;
do $$
declare
  example record;
  correct_score integer;
  other_score integer;
begin
  for example in select * from (values
    ('После отжима звёзды распределятся ровнее', '032-cos.webp'),
    ('Полный бак обещает очень жаркую поездку', '015-cos.webp'),
    ('После припева пришлось перенастроить орбиты', '028-cos.webp')
  ) as samples(clue, card_id) loop
    select public.luminaria_bot_semantic_score(example.clue, example.card_id, true)
      into correct_score;
    select max(public.luminaria_bot_semantic_score(example.clue, s.card_id, true))
      into other_score
    from public.luminaria_bot_card_semantics s where s.card_id <> example.card_id;
    if correct_score <= coalesce(other_score, 0) then
      raise exception 'Curated clue %: own score %, other maximum %',
        example.clue, correct_score, other_score;
    end if;
  end loop;
end;
$$;
select 'Bot clue matching passed; rollback follows' as result;
rollback;
