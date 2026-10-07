begin;
create or replace function public.reroll_luminaria_card(target_room_id uuid,milestone_round_id uuid,chosen_card_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); room_row public.rooms%rowtype; status_data jsonb; replacement text; position_no integer; sixth_position integer; old_card text; previous_swap public.luminaria_card_rerolls%rowtype;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into room_row from public.rooms where id=target_room_id for update;
 if room_row.id is null or not exists(select 1 from public.room_players where room_id=target_room_id and user_id=uid) then raise exception 'Room membership required'; end if;
 select r.* into previous_swap from public.luminaria_card_rerolls r where r.milestone_round_id=reroll_luminaria_card.milestone_round_id and r.player_id=uid;
 if previous_swap.milestone_round_id is not null then return jsonb_build_object('ok',true,'card_id',previous_swap.received_card_id,'retried',true); end if;
 status_data:=public.luminaria_reroll_status(target_room_id);
 if not coalesce((status_data->>'available')::boolean,false) then return jsonb_build_object('ok',false,'reason',status_data->>'reason'); end if;
 if (status_data->>'milestone')::uuid<>reroll_luminaria_card.milestone_round_id then return jsonb_build_object('ok',false,'reason','stale'); end if;
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
 insert into public.luminaria_card_rerolls(room_id,milestone_round_id,player_id,returned_card_id,received_card_id) values(target_room_id,reroll_luminaria_card.milestone_round_id,uid,old_card,replacement);
 return jsonb_build_object('ok',true,'card_id',replacement);
end $$;
commit;
