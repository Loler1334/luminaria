-- Step 1: deploy this RPC before the new client. Existing voting RLS stays available.
begin;

create or replace function public.get_luminaria_voting_cards(target_round_id uuid)
returns table (id uuid, card_id text, player_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.id, s.card_id,
    case when s.player_id = (select auth.uid()) then s.player_id else null::uuid end
  from public.card_submissions as s
  join public.rounds as r on r.id = s.round_id
  where r.id = target_round_id and r.phase = 'voting'
    and (select private.is_luminaria_room_member(r.room_id))
  order by md5(s.id::text || target_round_id::text);
$$;

revoke all on function public.get_luminaria_voting_cards(uuid) from public, anon;
grant execute on function public.get_luminaria_voting_cards(uuid) to authenticated;


commit;
notify pgrst, 'reload schema';
