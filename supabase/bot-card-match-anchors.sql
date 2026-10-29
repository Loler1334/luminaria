-- Prefer distinctive named entities and concrete scene details over loose overlap.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create or replace function public.luminaria_bot_card_match(
  target_clue text, card_title text, card_scene text)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  word text;
  score integer := 0;
  matched_words integer := 0;
  token_index integer;
  clue_text text := lower(btrim(regexp_replace(coalesce(target_clue, ''), '[[:space:]]+', ' ', 'g')));
  title_text text := lower(coalesce(card_title, ''));
  clue_tokens text[] := regexp_split_to_array(regexp_replace(clue_text, '[^[:alnum:]]+', ' ', 'g'), ' ');
  title_words tsvector := to_tsvector('pg_catalog.russian', coalesce(card_title, ''));
  scene_words tsvector := to_tsvector('pg_catalog.russian', coalesce(card_scene, ''));
  english_title tsvector := to_tsvector('pg_catalog.english', coalesce(card_title, ''));
  english_scene tsvector := to_tsvector('pg_catalog.english', coalesce(card_scene, ''));
begin
  -- A short, exact character or object name must beat incidental scene words.
  if length(clue_text) between 3 and 60
     and (' ' || regexp_replace(title_text, '[^[:alnum:]]+', ' ', 'g') || ' ')
       like '% ' || regexp_replace(clue_text, '[^[:alnum:]]+', ' ', 'g') || ' %' then
    score := score + 40;
  end if;

  -- Adjacent words describe one idea ("под одеялом"), unlike scattered overlaps.
  if coalesce(array_length(clue_tokens, 1), 0) >= 2 then
    for token_index in 1..array_length(clue_tokens, 1) - 1 loop
      if length(clue_tokens[token_index]) >= 3
         and length(clue_tokens[token_index + 1]) >= 3
         and position(clue_tokens[token_index] || ' ' || clue_tokens[token_index + 1]
           in regexp_replace(title_text, '[^[:alnum:]]+', ' ', 'g')) > 0 then
        score := score + 12;
      end if;
    end loop;
  end if;

  for word in select distinct token from regexp_split_to_table(clue_text, '[^[:alnum:]]+') as token
    where length(token) >= 3 loop
    if title_words @@ plainto_tsquery('pg_catalog.russian', word)
       or english_title @@ plainto_tsquery('pg_catalog.english', word) then
      score := score + 6;
      matched_words := matched_words + 1;
    elsif scene_words @@ plainto_tsquery('pg_catalog.russian', word)
       or english_scene @@ plainto_tsquery('pg_catalog.english', word) then
      score := score + 2;
      matched_words := matched_words + 1;
    end if;
  end loop;
  if matched_words >= 2 then
    score := score + matched_words * 2;
  end if;
  return score;
end;
$$;
revoke all on function public.luminaria_bot_card_match(text,text,text)
  from public, anon, authenticated;

-- The source-of-truth JSON and generated catalogue contain the same tags.
update public.luminaria_bot_card_semantics
set keywords = 'Баба-яга, баба яга, ведьма, ступа, избушка на курьих ножках, огромная ложка, полёт, замёрзшее озеро, луна, снег',
    keywords_en = 'Baba Yaga, witch, mortar, chicken-legged hut, giant spoon, frozen lake, moon, snowy mountains, flight'
where card_id = '031-card.webp';

update public.luminaria_bot_card_semantics
set keywords = 'ребёнок сон кровать спальня под одеялом все миры вселенная планеты космос солнце луна звёзды',
    keywords_en = 'sleeping child, floating bed, bedroom, under blanket, all worlds, universe, planets, sun, moon, stars'
where card_id = '082-card.webp';
commit;
