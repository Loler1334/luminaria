-- Finish the party when the last planned round ends, even if an older skipped
-- round was left in submitting state by a previous version of the game.
begin;

create or replace function public.finish_luminaria_at_round_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare round_limit integer; round_number integer;
begin
  if new.phase='results' and old.phase is distinct from 'results' then
    select coalesce(max(position),0) into round_limit
      from public.room_deck_cards where room_id=new.room_id;
    select count(*) into round_number
      from public.rounds where room_id=new.room_id;
    if round_limit>0 and round_number>=round_limit then
      update public.rooms set status='finished'
        where id=new.room_id and status='playing';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.finish_luminaria_at_round_limit() from public,anon,authenticated;

-- Recover rooms whose planned final round already ended before this fix.
with limits as (
  select room_id, max(position) as round_limit
  from public.room_deck_cards group by room_id
), ordered_rounds as (
  select room_id, phase,
    row_number() over(partition by room_id order by created_at,id) as round_number
  from public.rounds
)
update public.rooms as room set status='finished'
from limits, ordered_rounds
where room.id=limits.room_id
  and room.id=ordered_rounds.room_id
  and room.status='playing'
  and limits.round_limit>0
  and ordered_rounds.round_number=limits.round_limit
  and ordered_rounds.phase='results';

commit;
