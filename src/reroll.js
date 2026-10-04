import './reroll.css';

export function installRerolls({ supabase, getContext, getLanguage, cardInfo, onChanged }) {
  let busy = false, scheduled = false;
  const ru = () => getLanguage() === 'ru';
  const text = (russian, english) => ru() ? russian : english;
  const missing = error => ['PGRST202', '42883'].includes(error?.code);
  const reasonText = reason => ({
        empty_reserve: text('Новых карт в запасе не осталось.', 'No reserve cards are available right now.'),
    used: text('Обмен в этом блоке раундов уже использован.', 'You have used this block’s swap.'),
    wait: text('Обменять карту можно до отправки карты в раунд.', 'Swap before submitting your card for the round.'),
    finished: text('Партия уже закончилась.', 'The game has finished.'),
  }[reason] || text('Обмен сейчас недоступен. Обнови страницу.', 'The swap is unavailable. Refresh the page.'));

  async function openPicker(status, root, context) {
    if (busy || document.querySelector('#rerollDialog')) return;
    busy = true;
    const dialog = document.createElement('dialog');
    dialog.id = 'rerollDialog';
    dialog.innerHTML = `<section class="reroll-modal"><button class="close" type="button" aria-label="${text('Закрыть', 'Close')}">×</button><p class="eyebrow">${text('Новый поворот', 'A new twist')}</p><h2>${text('Какую карту заменим?', 'Which card shall we swap?')}</h2><p>${text('Выбери одну карту. Получишь случайную новую, а выбранная вернётся в запас. Можно отказаться от обмена.', 'Choose one card to receive a random reserve card. Your old card returns to the reserve. You can skip the swap.')}</p><div class="reroll-cards"></div><p class="reroll-status" role="status">${text('Загружаем руку…', 'Loading your hand…')}</p><button class="primary-button full" id="confirmReroll" type="button" disabled>${text('Обменять карту', 'Swap card')} ↻</button><button class="text-button" id="skipReroll" type="button">${text('Пропустить этот обмен', 'Skip this swap')}</button></section>`;
    document.body.append(dialog); dialog.showModal();
    const notice = dialog.querySelector('.reroll-status'), confirm = dialog.querySelector('#confirmReroll'), skip = dialog.querySelector('#skipReroll');
    let selected = null, saving = false;
    const close = () => { if (saving) return; dialog.close(); dialog.remove(); busy = false; schedule(); };
    dialog.querySelector('.close').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    async function submit(card) {
      if (saving || !root.isConnected || getContext()?.room.id !== context.room.id) return close();
      saving = true; confirm.disabled = true; skip.disabled = true;
      notice.textContent = text('Меняем судьбу карты…', 'Changing the card’s fate…');
      try {
        const { data, error } = await supabase.rpc('reroll_luminaria_card', { target_room_id: context.room.id, milestone_round_id: status.milestone, chosen_card_id: card });
        if (error) throw error;
        if (!data?.ok) throw new Error(reasonText(data?.reason));
        // The server returns the original result for a retried request.
        await onChanged();
        saving = false; close();
      } catch (error) {
        notice.textContent = error.message || text('Не удалось обменять карту. Попробуй снова.', 'Could not swap the card. Please retry.');
        saving = false; confirm.disabled = !selected; skip.disabled = false;
      }
    }
    confirm.addEventListener('click', () => { if (selected) void submit(selected); });
    skip.addEventListener('click', () => void submit(null));
    try {
      const { data, error } = await supabase.rpc('luminaria_hand', { target_room_id: context.room.id });
      if (error) throw error;
      if (!root.isConnected || getContext()?.room.id !== context.room.id) return close();
      for (const row of data || []) {
        const button = document.createElement('button'), image = document.createElement('img');
        button.type = 'button'; button.className = 'reroll-card'; button.setAttribute('aria-pressed', 'false');
        image.src = `/deck-preview/${encodeURIComponent(row.card_id)}`;
        image.alt = cardInfo(row.card_id)?.title || text('Карта', 'Card');
        button.append(image);
        button.addEventListener('click', () => {
          if (saving) return;
          selected = row.card_id;
          dialog.querySelectorAll('.reroll-card').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          confirm.disabled = false;
        });
        dialog.querySelector('.reroll-cards').append(button);
      }
      notice.textContent = text('Один обмен после каждых 5 раундов. Неиспользованные обмены не накапливаются.', 'One swap after every 5 rounds. Unused swaps do not accumulate.');
    } catch { notice.textContent = text('Не удалось загрузить карты. Закрой окно и попробуй снова.', 'Could not load your cards. Close and try again.'); }
  }

  async function refresh() {
    scheduled = false;
    const context = getContext(), root = document.querySelector('main');
    if (busy || !context || context.room.status !== 'playing' || !root || root.matches('.lobby-page,.game-finale')) return;
    const { data, error } = await supabase.rpc('luminaria_reroll_status', { target_room_id: context.room.id });
    if (!root.isConnected || getContext()?.room.id !== context.room.id || busy) return;
    if (error) { if (!missing(error)) console.warn('Could not refresh card swap', error.message); return; }
    root.querySelector('.reroll-offer')?.remove();
    if (!data?.available && data?.reason !== 'empty_reserve') return;
    const offer = document.createElement('section'); offer.className = 'reroll-offer';
    const label = document.createElement('div'), heading = document.createElement('strong'), hint = document.createElement('p');
    heading.textContent = data.available ? text('↻ Освежи воображение', '↻ A fresh spark of imagination') : text('↻ Запас карт исчерпан', '↻ The reserve is empty');
    hint.textContent = data.available ? text('Доступна замена одной карты на случайную новую.', 'Swap one card for a random unseen card.') : reasonText(data.reason);
    label.append(heading, hint); offer.append(label);
    if (data.available) {
      const button = document.createElement('button'); button.className = 'primary-button'; button.type = 'button';
      button.textContent = text('Выбрать карту', 'Choose a card');
      button.addEventListener('click', () => void openPicker(data, root, context)); offer.append(button);
    }
    const hand = root.querySelector('.hand-area,.waiting-hand');
    if (hand) hand.prepend(offer); else (root.querySelector('.scores') || root).append(offer);
  }
  function schedule() { if (scheduled || busy) return; scheduled = true; queueMicrotask(() => void refresh().catch(console.error)); }
  new MutationObserver(schedule).observe(document.body, { childList: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}
