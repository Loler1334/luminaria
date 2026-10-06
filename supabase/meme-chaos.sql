-- Install the Meme Chaos deck after the existing game migrations; safe to rerun.
begin;

create table if not exists public.luminaria_deck_catalog (
  deck_id text not null,
  card_id text not null,
  primary key (deck_id, card_id)
);
alter table public.luminaria_deck_catalog
  drop constraint if exists luminaria_deck_catalog_deck_id_check;
alter table public.luminaria_deck_catalog
  drop constraint if exists luminaria_deck_catalog_card_id_check;
alter table public.luminaria_deck_catalog
  add constraint luminaria_deck_catalog_deck_id_check
    check (deck_id in ('moonlit-archive', 'pop-culture', 'everyday-absurdity', 'meme-chaos'));
alter table public.luminaria_deck_catalog
  add constraint luminaria_deck_catalog_card_id_check
    check (card_id ~ '^[0-9]{3}-(card|pop|abs|meme)\.webp$');

-- Fill the reserve for all four decks. Only cards present in the site are listed.
insert into public.luminaria_deck_catalog (deck_id, card_id)
select 'moonlit-archive', lpad(number::text, 3, '0') || '-card.webp'
from generate_series(1, 112) as number
where number not in (60, 63)
union all
select 'pop-culture', lpad(number::text, 3, '0') || '-pop.webp'
from generate_series(201, 300) as number
union all
select 'pop-culture', lpad(number::text, 3, '0') || '-pop.webp'
from generate_series(401, 500) as number
union all
select 'everyday-absurdity', lpad(number::text, 3, '0') || '-abs.webp'
from generate_series(1, 110) as number
union all
select 'meme-chaos', lpad(number::text, 3, '0') || '-meme.webp'
from generate_series(1, 110) as number
on conflict do nothing;

alter table public.luminaria_deck_catalog enable row level security;
revoke all on public.luminaria_deck_catalog from public, anon, authenticated;

create or replace function public.configure_luminaria_lobby(
  target_room_id uuid, chosen_deck text, chosen_cycles integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare configured public.rooms;
begin
  if chosen_deck is null
    or chosen_deck not in ('moonlit-archive', 'pop-culture', 'everyday-absurdity', 'meme-chaos')
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
