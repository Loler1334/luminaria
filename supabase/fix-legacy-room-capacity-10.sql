-- Older production databases retain this extra insert trigger in addition to
-- validate_luminaria_room_seat(). Keep its capacity in sync with the UI.
begin;
do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.validate_luminaria_room_capacity()'::regprocedure);
  if definition not like '%>= 7%'
     or definition not like '%This Luminaria room is full (maximum 7 players)%' then
    raise exception 'Unexpected legacy room capacity function; no change made';
  end if;
  execute replace(
    replace(definition, '>= 7', '>= 10'),
    'This Luminaria room is full (maximum 7 players)',
    'This Luminaria room is full (maximum 10 players)'
  );
end $$;
commit;
