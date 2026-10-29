-- Permanent, registered-player progression. A final round identifies a party,
-- including rematches played in the same room.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create table if not exists public.player_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  games_played integer not null default 0,
  wins integer not null default 0,
  traps_sprung integer not null default 0,
  stories_created integer not null default 0,
  decks_played text[] not null default '{}',
  languages_played text[] not null default '{}',
  pinned_badges text[] not null default '{}'
);
create table if not exists public.player_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  room_id uuid not null,
  final_round_id uuid not null,
  primary key (user_id, achievement_id)
);
create table if not exists public.luminaria_game_progression (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null,
  final_round_id uuid not null,
  place integer not null,
  score integer not null,
  xp_gained integer not null default 0,
  achievements_unlocked text[] not null default '{}',
  story_created boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, final_round_id)
);
create index if not exists luminaria_game_progression_room_idx
  on public.luminaria_game_progression(room_id, final_round_id);
create index if not exists player_achievements_user_idx
  on public.player_achievements(user_id, unlocked_at desc);

alter table public.player_progression enable row level security;
alter table public.player_achievements enable row level security;
alter table public.luminaria_game_progression enable row level security;
revoke all on public.player_progression, public.player_achievements,
  public.luminaria_game_progression from public, anon, authenticated;

create or replace function public.luminaria_level_for_xp(total_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select 1 + floor((sqrt(10000.0 + 100.0 * greatest(total_xp, 0)) - 100.0) / 50.0)::integer;
$$;
revoke all on function public.luminaria_level_for_xp(integer) from public, anon, authenticated;

create or replace function public.record_luminaria_game_progression(target_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  game_room public.rooms%rowtype;
  final_id uuid;
  seat record;
  place_no integer;
  golden_count integer;
  trap_count integer;
  base_xp integer;
  bonus_xp integer;
  earned text[];
  unlocked text[];
  achievement text;
  new_row_count integer;
  match_language text;
begin
  select * into game_room from public.rooms where id = target_room_id for update;
  if game_room.id is null or game_room.status <> 'finished' then return; end if;
  if auth.uid() is not null and not exists (
    select 1 from public.room_players where room_id = target_room_id and user_id = auth.uid()
  ) then raise exception 'Room members only'; end if;
  select id into final_id from public.rounds where room_id = target_room_id
    order by created_at desc, id desc limit 1;
  if final_id is null or not exists (select 1 from public.room_deck_cards
      where room_id=target_room_id)
    or (select phase from public.rounds where id=final_id) <> 'results'
    or not ((select count(*) from public.rounds where room_id=target_room_id)
      >= (select coalesce(max(position),0) from public.room_deck_cards
        where room_id=target_room_id)
      or not exists (select 1 from public.room_deck_cards
        where room_id=target_room_id and not is_played)) then return; end if;
  match_language := case when game_room.language = 'en' then 'en' else 'ru' end;

  for seat in
    select p.id, p.user_id, p.score from public.room_players p
    join auth.users u on u.id = p.user_id
    where p.room_id = target_room_id and not p.is_bot
      and coalesce((to_jsonb(u)->>'is_anonymous')::boolean, false) = false
    order by p.joined_at, p.id
  loop
    place_no := 1 + (select count(distinct score) from public.room_players
      where room_id = target_room_id and score > seat.score);
    insert into public.luminaria_game_progression
      (user_id, room_id, final_round_id, place, score)
      values (seat.user_id, target_room_id, final_id, place_no, seat.score)
      on conflict (user_id, final_round_id) do nothing;
    if not found then continue; end if;

    select count(*) into golden_count from public.rounds r where r.room_id = target_room_id
      and r.storyteller_participant_id = seat.id
      and (select count(*) from public.votes v join public.card_submissions s
        on s.id = v.submission_id where v.round_id = r.id
        and s.participant_id = seat.id) between 1 and
        (select count(*) - 1 from public.votes v where v.round_id = r.id);
    select count(*) into trap_count from public.votes v
      join public.card_submissions s on s.id = v.submission_id
      join public.rounds r on r.id = v.round_id
      where r.room_id = target_room_id and s.participant_id = seat.id
        and r.storyteller_participant_id <> seat.id
        and v.voter_participant_id <> seat.id;
    base_xp := 40 + greatest(seat.score, 0) * 10 + golden_count * 15
      + trap_count * 10 + case place_no when 1 then 50 when 2 then 30
        when 3 then 15 else 0 end;

    insert into public.player_progression(user_id) values(seat.user_id)
      on conflict (user_id) do nothing;
    update public.player_progression set games_played = games_played + 1,
      wins = wins + case when place_no = 1 then 1 else 0 end,
      traps_sprung = traps_sprung + trap_count,
      decks_played = case when game_room.deck_id = any(decks_played)
        then decks_played else array_append(decks_played, game_room.deck_id) end,
      languages_played = case when match_language = any(languages_played)
        then languages_played else array_append(languages_played, match_language) end
      where user_id = seat.user_id;

    earned := '{}';
    if (select count(*) from public.room_players where room_id=target_room_id) >= 4
      and exists (select 1 from public.rounds r where r.room_id=target_room_id
        and r.storyteller_participant_id=seat.id and
        (select count(*) from public.votes v join public.card_submissions s
          on s.id=v.submission_id where v.round_id=r.id
          and s.participant_id=seat.id)=1) then
      earned := array_append(earned, 'subtle_hint');
    end if;
    if exists (select 1 from public.rounds r join public.card_submissions s
      on s.round_id=r.id and s.participant_id=seat.id
      where r.room_id=target_room_id and r.storyteller_participant_id<>seat.id
        and (select count(*) from public.votes v where v.submission_id=s.id)
          = (select count(*)-2 from public.room_players where room_id=target_room_id)
        and (select count(*) from public.room_players where room_id=target_room_id)>=4) then
      earned := array_append(earned, 'puppeteer');
    end if;
    if exists (select 1 from (
      select sum(case when v.submission_id=story.id then 1 else 0 end)
        over(order by r.created_at,r.id rows between 4 preceding and current row) as streak
      from public.rounds r
      left join public.card_submissions story on story.round_id=r.id
        and story.participant_id=r.storyteller_participant_id
      left join public.votes v on v.round_id=r.id and v.voter_participant_id=seat.id
      where r.room_id=target_room_id
    ) streaks where streak=5) then earned:=array_append(earned,'mind_reader'); end if;
    if exists (select 1 from public.rounds r where r.room_id=target_room_id
        and r.storyteller_participant_id=seat.id)
      and not exists (select 1 from public.rounds r where r.room_id=target_room_id
        and r.storyteller_participant_id=seat.id and not (
          (select count(*) from public.votes v join public.card_submissions s
            on s.id=v.submission_id where v.round_id=r.id and s.participant_id=seat.id)
          between 1 and (select count(*)-1 from public.votes v where v.round_id=r.id)))
      then earned:=array_append(earned,'flawless_storyteller'); end if;
    if exists (select 1 from public.rounds r join public.card_submissions story
      on story.round_id=r.id and story.participant_id=r.storyteller_participant_id
      join public.votes own_vote on own_vote.round_id=r.id
        and own_vote.voter_participant_id=seat.id and own_vote.submission_id=story.id
      where r.room_id=target_room_id
        and (select count(*) from public.votes v where v.submission_id=story.id)=1)
      then earned:=array_append(earned,'lone_detective'); end if;
    if exists (select 1 from public.rounds r join public.card_submissions s
      on s.round_id=r.id and s.participant_id=seat.id
      join public.votes v on v.submission_id=s.id
      join public.room_players voter on voter.id=v.voter_participant_id and voter.is_bot
      where r.room_id=target_room_id and r.storyteller_participant_id<>seat.id
      group by r.id,s.id having count(*)>=3)
      then earned:=array_append(earned,'rise_of_machines'); end if;
    if place_no=3 and (select count(*) from public.luminaria_game_progression
      where user_id=seat.user_id and place=3)>=3
      then earned:=array_append(earned,'safety_first'); end if;
    if exists (select 1 from public.luminaria_card_rerolls swap
      join public.rounds milestone on milestone.id=swap.milestone_round_id
      join public.card_submissions played on played.card_id=swap.received_card_id
        and played.participant_id=seat.id
      join public.rounds r on r.id=played.round_id and r.room_id=target_room_id
        and r.storyteller_participant_id=seat.id
      where swap.room_id=target_room_id and swap.participant_id=seat.id
        and r.created_at>=milestone.created_at
        and (select count(*) from public.rounds between_round
          where between_round.room_id=target_room_id
            and between_round.created_at>milestone.created_at
            and between_round.created_at<=r.created_at)<=1
        and (select count(*) from public.votes v join public.card_submissions s
          on s.id=v.submission_id where v.round_id=r.id and s.participant_id=seat.id)
          between 1 and (select count(*)-1 from public.votes v where v.round_id=r.id))
      then earned:=array_append(earned,'plot_twist'); end if;
    if exists (select 1 from public.rounds r where r.room_id=target_room_id
      and r.storyteller_participant_id=seat.id and btrim(r.clue) ~ '^[[:alpha:]]{1,5}$'
      and (select count(*) from public.votes v join public.card_submissions s
        on s.id=v.submission_id where v.round_id=r.id and s.participant_id=seat.id)
        between 1 and (select count(*)-1 from public.votes v where v.round_id=r.id))
      then earned:=array_append(earned,'brevity'); end if;
    if (select languages_played @> array['ru','en']::text[] from public.player_progression
      where user_id=seat.user_id) then earned:=array_append(earned,'polyglot'); end if;
    if (select decks_played @> array['moonlit-archive','cosmos-ufo',
      'everyday-absurdity','meme-chaos','pop-culture']::text[]
      from public.player_progression where user_id=seat.user_id)
      then earned:=array_append(earned,'five_worlds'); end if;

    bonus_xp:=0; unlocked:='{}';
    foreach achievement in array earned loop
      insert into public.player_achievements
        (user_id,achievement_id,room_id,final_round_id)
        values(seat.user_id,achievement,target_room_id,final_id)
        on conflict (user_id,achievement_id) do nothing;
      get diagnostics new_row_count = row_count;
      if new_row_count=1 then
        unlocked:=array_append(unlocked,achievement);
        bonus_xp:=bonus_xp+case achievement
          when 'mind_reader' then 200 when 'puppeteer' then 150
          when 'rise_of_machines' then 150 when 'five_worlds' then 200
          when 'flawless_storyteller' then 125 when 'polyglot' then 125
          else 75 end;
      end if;
    end loop;
    update public.player_progression set xp=xp+base_xp+bonus_xp,
      level=public.luminaria_level_for_xp(xp+base_xp+bonus_xp)
      where user_id=seat.user_id;
    update public.luminaria_game_progression
      set xp_gained=base_xp+bonus_xp, achievements_unlocked=unlocked
      where user_id=seat.user_id and final_round_id=final_id;
  end loop;
end;
$$;
revoke all on function public.record_luminaria_game_progression(uuid)
  from public, anon;
grant execute on function public.record_luminaria_game_progression(uuid)
  to authenticated;

create or replace function public.luminaria_record_finished_room()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='finished' and old.status is distinct from 'finished' then
    perform public.record_luminaria_game_progression(new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.luminaria_record_finished_room()
  from public, anon, authenticated;
drop trigger if exists luminaria_record_finished_room on public.rooms;
create trigger luminaria_record_finished_room
after update of status on public.rooms for each row
execute function public.luminaria_record_finished_room();

-- The generated epilogue can arrive later than the game result. Count it once
-- per player and final round, even if the story is retried or translated.
create or replace function public.luminaria_record_published_story()
returns trigger language plpgsql security definer set search_path = '' as $$
declare award record; added integer;
begin
  if new.final_round_id is null then return new; end if;
  for award in
    update public.luminaria_game_progression set story_created=true
    where room_id=new.room_id and final_round_id=new.final_round_id
      and not story_created returning user_id
  loop
    update public.player_progression set stories_created=stories_created+1
      where user_id=award.user_id;
    if (select stories_created from public.player_progression
      where user_id=award.user_id)>=10 then
      insert into public.player_achievements
        (user_id,achievement_id,room_id,final_round_id)
        values(award.user_id,'editor_in_chief',new.room_id,new.final_round_id)
        on conflict (user_id,achievement_id) do nothing;
      get diagnostics added = row_count;
      if added=1 then
        update public.player_progression set xp=xp+125,
          level=public.luminaria_level_for_xp(xp+125)
          where user_id=award.user_id;
        update public.luminaria_game_progression
          set xp_gained=xp_gained+125,
            achievements_unlocked=array_append(achievements_unlocked,'editor_in_chief')
          where user_id=award.user_id and final_round_id=new.final_round_id;
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.luminaria_record_published_story()
  from public, anon, authenticated;
drop trigger if exists luminaria_record_published_story on public.finale_stories;
create trigger luminaria_record_published_story
after insert or update of final_round_id on public.finale_stories for each row
execute function public.luminaria_record_published_story();

create or replace function public.luminaria_room_profiles(target_room_id uuid)
returns table(user_id uuid, level integer, xp integer, pinned_badges text[], unlocked_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.room_players membership
    where membership.room_id=target_room_id and membership.user_id=auth.uid()) then
    raise exception 'Room members only'; end if;
  return query select p.user_id, coalesce(progress.level,1), coalesce(progress.xp,0),
    coalesce(progress.pinned_badges,'{}'::text[]),
    (select count(*) from public.player_achievements a where a.user_id=p.user_id)
  from public.room_players p join auth.users u on u.id=p.user_id
  left join public.player_progression progress on progress.user_id=p.user_id
  where p.room_id=target_room_id and not p.is_bot
    and coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)=false;
end;
$$;
revoke all on function public.luminaria_room_profiles(uuid) from public, anon;
grant execute on function public.luminaria_room_profiles(uuid) to authenticated;

create or replace function public.my_luminaria_progression(target_room_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); result jsonb;
begin
  if account_id is null or exists (select 1 from auth.users u where u.id=account_id
    and coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)) then
    return null; end if;
  if target_room_id is not null and not exists (select 1 from public.room_players
    where room_id=target_room_id and user_id=account_id) then
    raise exception 'Room members only'; end if;
  select jsonb_build_object('xp',coalesce(p.xp,0),'level',coalesce(p.level,1),
    'games_played',coalesce(p.games_played,0),'wins',coalesce(p.wins,0),
    'traps_sprung',coalesce(p.traps_sprung,0),
    'stories_created',coalesce(p.stories_created,0),
    'pinned_badges',coalesce(p.pinned_badges,'{}'::text[]),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.achievement_id,'unlocked_at',a.unlocked_at))
      from public.player_achievements a where a.user_id=account_id),'[]'::jsonb),
    'game', (select to_jsonb(g) - 'user_id' from public.luminaria_game_progression g
      where g.user_id=account_id and g.room_id=target_room_id
      order by g.created_at desc, g.final_round_id desc limit 1))
    into result from (select 1) one
    left join public.player_progression p on p.user_id=account_id;
  return result;
end;
$$;
revoke all on function public.my_luminaria_progression(uuid) from public, anon;
grant execute on function public.my_luminaria_progression(uuid) to authenticated;

create or replace function public.pin_luminaria_badges(badge_ids text[])
returns text[] language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); normalized text[];
begin
  if account_id is null or exists (select 1 from auth.users u where u.id=account_id
    and coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)) then
    raise exception 'Registered players only'; end if;
  normalized:=coalesce(badge_ids,'{}'::text[]);
  if cardinality(normalized)>3 or exists (select 1 from unnest(normalized) badge
    where badge is null or not exists (select 1 from public.player_achievements a
      where a.user_id=account_id and a.achievement_id=badge))
    or cardinality(normalized)<>(select count(distinct badge) from unnest(normalized) badge) then
    raise exception 'Choose up to three unlocked achievements'; end if;
  insert into public.player_progression(user_id,pinned_badges)
    values(account_id,normalized)
    on conflict (user_id) do update set pinned_badges=excluded.pinned_badges;
  return normalized;
end;
$$;
revoke all on function public.pin_luminaria_badges(text[]) from public, anon;
grant execute on function public.pin_luminaria_badges(text[]) to authenticated;

notify pgrst, 'reload schema';
commit;
