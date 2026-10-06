-- Apply after everyday-absurdity.sql. Safe to rerun.
begin;
create table if not exists public.luminaria_card_rerolls (
 room_id uuid not null references public.rooms(id) on delete cascade,
 milestone_round_id uuid not null references public.rounds(id) on delete cascade,
 player_id uuid not null references auth.users(id) on delete cascade,
 returned_card_id text, received_card_id text, created_at timestamptz not null default now(),
 primary key(milestone_round_id,player_id));
alter table public.luminaria_card_rerolls enable row level security;
revoke all on public.luminaria_card_rerolls from public,anon,authenticated;
create or replace function public.luminaria_reroll_status(target_room_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); room_row public.rooms%rowtype; completed integer; round_limit integer; latest public.rounds%rowtype; milestone public.rounds%rowtype; reserve integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into room_row from public.rooms where id=target_room_id;
 if room_row.id is null or not exists(select 1 from public.room_players where room_id=target_room_id and user_id=uid) then raise exception 'Room membership required'; end if;
 if room_row.status<>'playing' then return jsonb_build_object('available',false,'reason','finished'); end if;
 select count(*) into completed from public.rounds where room_id=target_room_id and phase='results';
 select coalesce(max(position),0) into round_limit from public.room_deck_cards where room_id=target_room_id;
 if completed<5 or completed>=round_limit then return jsonb_build_object('available',false,'reason','wait'); end if;
 select * into milestone from public.rounds where room_id=target_room_id and phase='results' order by created_at,id offset ((completed/5)*5-1) limit 1;
 if milestone.id is null then return jsonb_build_object('available',false,'reason','wait'); end if;
 if exists(select 1 from public.luminaria_card_rerolls where milestone_round_id=milestone.id and player_id=uid) then return jsonb_build_object('available',false,'reason','used'); end if;
 select * into latest from public.rounds where room_id=target_room_id order by created_at desc,id desc limit 1;
 if latest.phase not in ('results','submitting') or (latest.phase='submitting' and exists(select 1 from public.card_submissions where round_id=latest.id and player_id=uid)) then return jsonb_build_object('available',false,'reason','wait'); end if;
 select count(*) into reserve from public.luminaria_deck_catalog c where c.deck_id=room_row.deck_id and not exists(select 1 from public.room_deck_cards d where d.room_id=target_room_id and d.card_id=c.card_id);
 return jsonb_build_object('available',reserve>0,'reason',case when reserve=0 then 'empty_reserve' else null end,'milestone',milestone.id,'completed',completed,'reserve',reserve);
end $$;
create or replace function public.reroll_luminaria_card(target_room_id uuid,milestone_round_id uuid,chosen_card_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); room_row public.rooms%rowtype; status_data jsonb; replacement text; position_no integer; sixth_position integer; old_card text; previous_swap public.luminaria_card_rerolls%rowtype;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into room_row from public.rooms where id=target_room_id for update;
 if room_row.id is null or not exists(select 1 from public.room_players where room_id=target_room_id and user_id=uid) then raise exception 'Room membership required'; end if;
 select * into previous_swap from public.luminaria_card_rerolls where milestone_round_id=reroll_luminaria_card.milestone_round_id and player_id=uid;
 if previous_swap.milestone_round_id is not null then return jsonb_build_object('ok',true,'card_id',previous_swap.received_card_id,'retried',true); end if;
 status_data:=public.luminaria_reroll_status(target_room_id);
 if not coalesce((status_data->>'available')::boolean,false) then return jsonb_build_object('ok',false,'reason',status_data->>'reason'); end if;
 if (status_data->>'milestone')::uuid<>milestone_round_id then return jsonb_build_object('ok',false,'reason','stale'); end if;
 if chosen_card_id is not null then
  select position into position_no from public.room_deck_cards where room_id=target_room_id and owner_id=uid and card_id=chosen_card_id and not is_played for update;
  select position into sixth_position from public.room_deck_cards where room_id=target_room_id and owner_id=uid and not is_played order by position offset 5 limit 1;
  if position_no is null or (sixth_position is not null and position_no>sixth_position) then return jsonb_build_object('ok',false,'reason','not_in_hand'); end if;
  select c.card_id into replacement from public.luminaria_deck_catalog c where c.deck_id=room_row.deck_id and not exists(select 1 from public.room_deck_cards d where d.room_id=target_room_id and d.card_id=c.card_id) order by random() limit 1;
  if replacement is null then return jsonb_build_object('ok',false,'reason','empty_reserve'); end if;
  old_card:=chosen_card_id;
  update public.room_deck_cards set card_id=replacement where room_id=target_room_id and owner_id=uid and card_id=chosen_card_id and not is_played;
  if not found then return jsonb_build_object('ok',false,'reason','stale'); end if;
 end if;
 insert into public.luminaria_card_rerolls(room_id,milestone_round_id,player_id,returned_card_id,received_card_id) values(target_room_id,milestone_round_id,uid,old_card,replacement);
 return jsonb_build_object('ok',true,'card_id',replacement);
end $$;
revoke all on function public.luminaria_reroll_status(uuid) from public,anon;
revoke all on function public.reroll_luminaria_card(uuid,uuid,text) from public,anon;
grant execute on function public.luminaria_reroll_status(uuid) to authenticated;
grant execute on function public.reroll_luminaria_card(uuid,uuid,text) to authenticated;
commit;
