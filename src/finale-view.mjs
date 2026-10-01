import { awardFor, awardIcon } from './game-finale.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function starAwardMarkup(ranking, starScores = {}, language = 'ru') {
  const ru = language === 'ru';
  const eligible = ranking.map(seat => ({...seat, stars: starScores[seat.user_id]?.score}))
    .filter(seat => Number.isSafeInteger(seat.stars) && seat.stars > 0);
  const best = Math.max(0, ...eligible.map(seat => seat.stars));
  const winners = eligible.filter(seat => seat.stars === best);
  if (!winners.length) return '';
  return `<span class="star-award-icon" aria-hidden="true">🏆 ✦</span><h2>${ru ? 'Главный ловитель звёзд' : 'Star-catching champion'}</h2><p class="star-award-names">${winners.map(seat => escape(seat.name)).join(' · ')}</p><p>${best} ${ru ? 'пойманных звёзд · за эту партию' : 'stars caught · this game'}</p>${winners.length > 1 ? `<small>${ru ? 'Равный результат — награда каждому!' : 'A tie — everyone receives the award!'}</small>` : ''}`;
}

export function finaleMarkup({ ranking, rounds, roomId, roomCode, userId, language, story, isHost, starScores = {} }) {
  const ru = language === 'ru';
  const name = seat => escape(seat?.name || (ru ? 'Мечтатель' : 'Dreamer'));
  const places = [2, 1, 3];
  const podium = places.map(place => {
    const players = ranking.filter(seat => seat.place === place);
    return `<article class="podium-step podium-place-${place} ${players.length ? '' : 'podium-empty'}" aria-label="${place} ${ru ? 'место' : 'place'}">
      <div class="podium-award">${awardIcon(place)}</div>
      <div class="podium-people">${players.length ? `<div class="podium-person ${players.some(seat => seat.user_id === userId) ? 'podium-you' : ''}"><span class="podium-avatar">${players.length > 1 ? players.length : players[0].avatarHtml || '✦'}</span><div class="podium-names">${players.map(seat => `<strong class="podium-name">${name(seat)}</strong>`).join('')}</div><small>${players[0].score} ${ru ? 'очков' : 'points'}</small></div>` : `<p>${ru ? 'Место свободно' : 'Unclaimed'}</p>`}</div>
      <div class="podium-plinth"><b>${place}</b><span>${awardFor(place, language)}</span></div>
    </article>`;
  }).join('');
  return `<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-finale" data-final-room="${escape(roomId)}">
    <nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><span class="finale-room">${ru ? 'Комната' : 'Room'} ${escape(roomCode)}</span></nav>
    <header class="finale-heading"><p class="eyebrow">${ru ? 'Все карты сыграны' : 'Every card has been played'}</p><h1>${ru ? 'У каждой истории<br>есть <em>свои герои.</em>' : 'Every story<br>has <em>its heroes.</em>'}</h1><p>${ru ? 'Партия завершена. Встречайте тех, кто разгадал больше тайн.' : 'The game is complete. Meet the minds who found the most secrets.'}</p></header>
    <section class="finale-podium" aria-label="${ru ? 'Пьедестал победителей' : 'Winners’ podium'}">${podium}</section>
    <section class="finale-scoreboard"><div class="panel-title"><h2>${ru ? 'Таблица героев' : 'Our heroes'}</h2><span class="count">${rounds.length} ${ru ? 'раундов' : 'rounds'}</span></div>
      <p class="finale-tie-note">${ru ? 'При равных очках — общее место и одинаковая награда.' : 'Equal scores share a place and the same award.'}</p>
      <table><caption class="visually-hidden">${ru ? 'Итоговые очки и награды' : 'Final scores and awards'}</caption><thead><tr><th>${ru ? 'Место' : 'Place'}</th><th>${ru ? 'Игрок' : 'Player'}</th><th>${ru ? 'Награда' : 'Award'}</th><th>${ru ? 'Очки' : 'Points'}</th></tr></thead><tbody>${ranking.map(seat => `<tr class="${seat.user_id === userId ? 'finale-me' : ''}"><td>${seat.place}</td><th scope="row">${name(seat)}${seat.user_id === userId ? `<small>${ru ? 'это ты' : 'you'}</small>` : ''}</th><td>${awardFor(seat.place, language)}</td><td><b>${seat.score}</b></td></tr>`).join('')}</tbody></table>
    </section>
    <section id="finaleStarAward" class="finale-star-award" aria-live="polite">${starAwardMarkup(ranking, starScores, language)}</section>
    <section class="finale-story"><span class="story-spark" aria-hidden="true">✧</span><p class="eyebrow">${ru ? 'Эпилог вашей партии' : 'Your game’s epilogue'}</p><h2>${ru ? 'Что осталось<br>между строк' : 'Between the lines'}</h2><p class="party-story" id="partyStory">${escape(story)}</p><p class="story-status" id="storyStatus" role="status">${ru ? 'Собираем образы всех ассоциаций в одну историю…' : 'Weaving every round’s imagery into one story…'}</p><div class="story-actions"><button type="button" class="text-button" id="copyPartyStory">${ru ? 'Скопировать историю' : 'Copy story'}</button><button type="button" class="text-button" id="retryPartyStory" hidden>${ru ? 'Попробовать ещё раз' : 'Try again'}</button></div></section>
    <details class="finale-history"><summary>${ru ? 'Все ассоциации партии' : 'Every clue from the game'} <span>${rounds.length}</span></summary><ol>${rounds.map(round => `<li><blockquote>${escape(round.clue)}</blockquote><small>${name(ranking.find(seat => seat.user_id === round.storyteller_id))}</small></li>`).join('')}</ol></details>
    <footer class="finale-actions">${isHost ? `<button class="primary-button" id="rematchButton">${ru ? 'Сыграть ещё раз' : 'Play again'} <b>→</b></button>` : `<p>${ru ? 'Создатель комнаты может начать новую партию для всех.' : 'The room host can start another game for everyone.'}</p>`}<a class="text-button" href="/">${ru ? 'На главную' : 'Back to home'}</a></footer>
  </main>`;
}
