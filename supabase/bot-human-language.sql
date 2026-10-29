-- Apply after bot-language-actions.sql. Prefer the language of the latest human clue.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.luminaria_bot_clue(
  target_room_id uuid, round_number integer, chosen_card_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  chosen text;
  room_language text;
begin
  -- The latest human clue takes precedence over the room's UI language.
  select case
    when r.clue ~ '[А-Яа-яЁё]' then 'ru'
    when r.clue ~ '[A-Za-z]' then 'en'
  end into room_language
  from public.rounds r
  join public.room_players seat on seat.id = r.storyteller_participant_id
    and seat.room_id = target_room_id and not seat.is_bot
  where r.room_id = target_room_id
    and (r.clue ~ '[А-Яа-яЁё]' or r.clue ~ '[A-Za-z]')
  order by r.created_at desc, r.id desc
  limit 1;
  if room_language is null then
    select coalesce(language, 'ru') into room_language
    from public.rooms where id = target_room_id;
  end if;
  if room_language not in ('ru', 'en') then room_language := 'ru'; end if;
  select candidate.clue into chosen
  from public.luminaria_bot_card_semantics semantics
  cross join lateral unnest(case when room_language = 'en'
    then semantics.clues_en else semantics.clues end) as candidate(clue)
  where semantics.card_id = chosen_card_id
    and not exists (select 1 from public.rounds r
      where r.room_id = target_room_id and lower(r.clue) = lower(candidate.clue))
  order by md5(target_room_id::text || round_number::text || chosen_card_id || candidate.clue)
  limit 1;
  if chosen is not null then return chosen; end if;
  select case when room_language = 'en' then semantics.title_en
    else semantics.title end into chosen
  from public.luminaria_bot_card_semantics semantics
  where semantics.card_id = chosen_card_id
    and not exists (select 1 from public.rounds r
      where r.room_id = target_room_id and lower(r.clue) = lower(
        case when room_language = 'en' then semantics.title_en else semantics.title end));
  if chosen is not null then return chosen; end if;
  select pool.clue into chosen
  from unnest(case when room_language = 'en' then array[
    'Echo of a forgotten dream', 'Light through the cracks',
    'The old clockmaker''s secret', 'A dance at the edge of a shadow',
    'A fragile promise', 'The last lighthouse before the storm',
    'The moon forgot the way home', 'Tea for an invisible guest',
    'A paper dragon whispers', 'A key to yesterday''s tomorrow',
    'Where the fog starts laughing', 'A letter in a cloud''s pocket',
    'A star on a school desk', 'A crown for a sleepy traveler',
    'Rain made of other people''s memories', 'A mirror running late',
    'An alarm clock for the sleeping woods', 'The cosmic soup got cold',
    'A parade of missing socks', 'A lighthouse in a cup of cocoa',
    'The hourglass sneezed', 'A cucumber stole the stars',
    'The dragon fears the kettle', 'A penguin mixed up the planets',
    'The sun went out for ice cream', 'A shadow ordered a taxi',
    'A staircase in a giant''s pocket', 'A postman for moon cats',
    'A storm in a jam jar', 'The invisible orchestra is late'
  ]::text[] else array[
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
    'Буря в банке варенья', 'Невидимый оркестр опоздал'
  ]::text[] end) as pool(clue)
  where not exists (select 1 from public.rounds r
    where r.room_id = target_room_id and lower(r.clue) = lower(pool.clue))
  order by md5(target_room_id::text || round_number::text || pool.clue)
  limit 1;
  if chosen is not null then return chosen; end if;
  -- Even unusually long parties keep a fresh, valid clue after pool exhaustion.
  select pool.clue || ' · ' || suffix.n::text into chosen
  from unnest(case when room_language = 'en' then array[
    'Echo of a forgotten dream', 'Light through the cracks',
    'The old clockmaker''s secret', 'A dance at the edge of a shadow',
    'A fragile promise', 'The last lighthouse before the storm'
  ]::text[] else array[
    'Эхо забытого сна', 'Свет сквозь трещины',
    'Секрет старого часовщика', 'Танец на краю тени',
    'Хрупкое обещание', 'Последний маяк перед бурей'
  ]::text[] end) as pool(clue)
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
revoke all on function public.luminaria_bot_clue(uuid,integer,text)
  from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;

