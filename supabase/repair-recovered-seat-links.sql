-- Apply after resilient-room.sql, install-rerolls.sql, and turn-state.sql.
-- A recovered human keeps the same room_players row. The legacy user ID moves
-- to a new anonymous session; keep its turn and reroll history attached too.

begin;
set local lock_timeout = '2s';

create or replace function public.sync_luminaria_recovered_seat_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id then
    update public.luminaria_card_rerolls
       set player_id = new.user_id
     where room_id = new.room_id and player_id = old.user_id;

    update public.rooms
       set current_storyteller_id = new.user_id
     where id = new.room_id and current_storyteller_id = old.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_luminaria_recovered_seat_links()
  from public, anon, authenticated;

drop trigger if exists sync_luminaria_recovered_seat_links on public.room_players;
create trigger sync_luminaria_recovered_seat_links
after update of user_id on public.room_players
for each row
when (old.user_id is distinct from new.user_id)
execute function public.sync_luminaria_recovered_seat_links();

commit;
