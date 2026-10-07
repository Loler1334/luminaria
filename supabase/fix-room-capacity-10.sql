-- Bring the deployed room admission functions in line with the 10-seat lobby.
-- Preserve their existing security settings and all other admission checks.
begin;
do $$
declare
  function_id regprocedure;
  definition text;
begin
  foreach function_id in array array[
    'public.join_luminaria_room(uuid)'::regprocedure,
    'public.validate_luminaria_room_seat()'::regprocedure
  ] loop
    definition := pg_get_functiondef(function_id);
    if definition not like '%>= 7%' or definition not like '%maximum of 7 players%' then
      raise exception 'Unexpected capacity check in %; no functions changed', function_id;
    end if;
    execute replace(
      replace(definition, '>= 7', '>= 10'),
      'maximum of 7 players', 'maximum of 10 players'
    );
  end loop;
end $$;
commit;
