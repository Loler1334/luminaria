-- Add the 110-card Cosmos & UFOs deck after meme-chaos.sql.
begin;

alter table public.luminaria_deck_catalog
  drop constraint if exists luminaria_deck_catalog_deck_id_check;
alter table public.luminaria_deck_catalog
  drop constraint if exists luminaria_deck_catalog_card_id_check;
alter table public.luminaria_deck_catalog
  add constraint luminaria_deck_catalog_deck_id_check
    check (deck_id in ('moonlit-archive', 'pop-culture', 'everyday-absurdity', 'meme-chaos', 'cosmos-ufo'));
alter table public.luminaria_deck_catalog
  add constraint luminaria_deck_catalog_card_id_check
    check (card_id ~ '^[0-9]{3}-(card|pop|abs|meme|cos)\.webp$');

insert into public.luminaria_deck_catalog (deck_id, card_id)
select 'cosmos-ufo', lpad(number::text, 3, '0') || '-cos.webp'
from generate_series(1, 110) as number
on conflict do nothing;

create or replace function public.configure_luminaria_lobby(
  target_room_id uuid, chosen_deck text, chosen_cycles integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare configured public.rooms;
begin
  if chosen_deck is null
    or chosen_deck not in ('moonlit-archive', 'pop-culture', 'everyday-absurdity', 'meme-chaos', 'cosmos-ufo')
    or chosen_cycles is null
    or chosen_cycles < (case when (select count(*) from public.room_players where room_id=target_room_id) >= 7 then 1 else 2 end) then
    raise exception 'Invalid lobby settings';
  end if;
  update public.rooms set deck_id=chosen_deck, round_cycles=chosen_cycles
    where id=target_room_id and host_id=auth.uid() and status='lobby'
    returning * into configured;
  if not found then raise exception 'Only the lobby host can change settings'; end if;
  return to_jsonb(configured);
end;
$$;
revoke all on function public.configure_luminaria_lobby(uuid,text,integer) from public, anon;
grant execute on function public.configure_luminaria_lobby(uuid,text,integer) to authenticated;

commit;
