-- Replace literal Everyday Absurdity clues with situational hints.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

update public.luminaria_bot_card_semantics
set clues[1] = 'Кондуктор впервые пожалел, что боится высоты',
    clues_en[1] = 'The conductor finally admits a fear of heights'
where card_id = '003-abs.webp';
update public.luminaria_bot_card_semantics
set clues[1] = 'К обеду опоздал даже сам понедельник',
    clues_en[1] = 'Even Monday was late for lunch'
where card_id = '005-abs.webp';
update public.luminaria_bot_card_semantics
set clues[2] = 'Мелкая бытовая задача потребовала целую бригаду',
    clues_en[2] = 'One little errand took an entire moving crew'
where card_id = '009-abs.webp';
update public.luminaria_bot_card_semantics
set clues[1] = 'Пунктуальность сегодня взяла больничный',
    clues_en[1] = 'Punctuality called in sick today'
where card_id = '026-abs.webp';
update public.luminaria_bot_card_semantics
set clues[2] = 'Совещание затянулось до десерта',
    clues_en[2] = 'The meeting ran all the way into dessert'
where card_id = '028-abs.webp';
update public.luminaria_bot_card_semantics
set clues[1] = 'На приём записали даже само ожидание',
    clues_en[1] = 'Even waiting itself had an appointment'
where card_id = '046-abs.webp';
update public.luminaria_bot_card_semantics
set clues[2] = 'После обычных хлопот понадобилась карта океанов',
    clues_en[2] = 'An ordinary chore suddenly required an ocean map'
where card_id = '051-abs.webp';
update public.luminaria_bot_card_semantics
set clues[1] = 'Пропажа вернулась с прогнозом на завтра',
    clues_en[1] = 'The missing thing returned with tomorrow''s forecast'
where card_id = '100-abs.webp';

commit;
