import { achievementArt, rankArt } from './progression-art.mjs';

export const ACHIEVEMENTS = [
  ['subtle_hint','✧','Тонкий намёк','Subtle Hint','Ведущего угадал ровно один игрок за столом от 4 участников.','Exactly one player guessed your card at a table of four or more.'],
  ['puppeteer','♟','Кукловод','Puppeteer','Все остальные угадывающие выбрали твою ловушку.','Every other guesser chose your decoy.'],
  ['mind_reader','◈','Телепат','Mind Reader','Угадать карту ведущего 5 раундов подряд в одной партии.','Find the storyteller’s card in five consecutive rounds.'],
  ['flawless_storyteller','✦','Идеальный рассказчик','Flawless Storyteller','Каждая твоя ассоциация в партии попала в золотую середину.','Every clue you gave in a game hit the sweet spot.'],
  ['lone_detective','⌕','Одинокий детектив','Lone Detective','Только ты нашёл карту ведущего.','You alone found the storyteller’s card.'],
  ['rise_of_machines','⚙','Восстание машин','Rise of the Machines','Три бота проголосовали за твою ловушку в одном раунде.','Three bots voted for your decoy in one round.'],
  ['safety_first','⛑','Каска безопасности','Safety First','Трижды занять третье место.','Finish in third place three times.'],
  ['plot_twist','↝','С чистого листа','Plot Twist','Сыграть полученной при обмене картой как ведущий и набрать очки.','Score storyteller points with a freshly swapped card.'],
  ['brevity','❞','Слово не воробей','Brevity is the Soul','Удачная ассоциация ведущего из одного слова до 5 букв.','Hit the sweet spot with a one-word clue of up to five letters.'],
  ['polyglot','⌘','Полиглот','Polyglot','Завершить партии на русском и английском.','Finish games in both Russian and English.'],
  ['five_worlds','✺','Пять миров','Five Worlds','Доиграть партию на каждой из пяти колод.','Complete a game with each of the five decks.'],
  ['editor_in_chief','✎','Шеф-редактор','Editor-in-Chief','Собрать 10 финальных историй.','Collect ten final stories.']
];

const RANKS = [
  [1,'✦','Ловец искр','Spark Catcher'],
  [5,'🧭','Искатель смыслов','Meaning Seeker'],
  [12,'🎭','Мастер иллюзий','Master of Illusions'],
  [22,'🔮','Ловец чужих снов','Dreamweaver'],
  [35,'📜','Архитектор историй','Story Architect'],
  [50,'👑','Хранитель Люминарии','Keeper of Luminaria']
];

export const xpForLevel = level => 100 * Math.max(0,level - 1) + 25 * Math.max(0,level - 1) ** 2;
export const rankForLevel = (level, language = 'ru') => {
  const rank = [...RANKS].reverse().find(item => level >= item[0]) || RANKS[0];
  const id = ['spark','meaning','illusion','dream','architect','keeper'][RANKS.indexOf(rank)];
  return {id,icon:rank[1],art:rankArt(id),name:rank[language === 'en' ? 3 : 2]};
};
export const achievementFor = (id, language = 'ru') => {
  const item=ACHIEVEMENTS.find(entry=>entry[0]===id);
  return item?{id,icon:item[1],art:achievementArt(id),name:item[language==='en'?3:2],description:item[language==='en'?5:4]}:null;
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function progressionChip(progress,language='ru') {
  if (!progress) return '';
  const rank=rankForLevel(progress.level,language);
  return `<span class="progression-chip"><span class="progression-level">${Number(progress.level)||1}</span><span class="progression-rank">${rank.art} ${escape(rank.name)}</span></span>`;
}

export function progressionPins(progress,language='ru') {
  return (progress?.pinned_badges||[]).slice(0,3).map(id=>{
    const badge=achievementFor(id,language);
    return badge?`<span class="progression-pin" data-tooltip="${escape(badge.name)} — ${escape(badge.description)}" title="${escape(badge.name)} — ${escape(badge.description)}" aria-label="${escape(badge.name)}: ${escape(badge.description)}" tabindex="0">${badge.art}</span>`:'';
  }).join('');
}

export function progressionModalMarkup(progress,language='ru',{guest=false}={}) {
  const ru=language==='ru', level=Number(progress?.level)||1, xp=Number(progress?.xp)||0;
  const rank=rankForLevel(level,language), next=xpForLevel(level+1), previous=xpForLevel(level);
  const percent=Math.max(0,Math.min(100,Math.round((xp-previous)/(next-previous)*100)));
  const unlocked=new Set((progress?.achievements||[]).map(item=>item.id));
  const pinned=new Set(progress?.pinned_badges||[]);
  return `<div class="progression-overlay" id="progressionOverlay"><section class="progression-dialog" role="dialog" aria-modal="true" aria-labelledby="progressionTitle"><button class="progression-close" type="button" aria-label="${ru?'Закрыть':'Close'}">×</button><p class="eyebrow">✦ ${ru?'Твоя история':'Your journey'}</p><div class="progression-rank-heading"><span class="rank-crest">${rank.art}</span><div><h2 id="progressionTitle">${escape(rank.name)}</h2><p class="progression-level-line">${ru?'Уровень':'Level'} ${level} · ${xp} XP</p></div></div>${guest?`<div class="progression-guest-callout"><span>${ru?'Войди в аккаунт, чтобы сохранять опыт, ранги и закреплять достижения в лобби.':'Sign in to save XP and ranks and pin achievements in the lobby.'}</span><button id="progressionSignIn" type="button">${ru?'Войти':'Sign in'}</button></div>`:''}<div class="progression-bar" role="progressbar" aria-valuenow="${xp-previous}" aria-valuemax="${next-previous}"><span style="width:${percent}%"></span></div><p class="progression-next">${next-xp} XP ${ru?'до следующего уровня':'to the next level'}</p><div class="progression-stats"><span><b>${Number(progress?.games_played)||0}</b>${ru?'партий':'games'}</span><span><b>${Number(progress?.wins)||0}</b>${ru?'побед':'wins'}</span><span><b>${Number(progress?.traps_sprung)||0}</b>${ru?'поймано':'trapped'}</span></div><h3>${ru?'Достижения':'Achievements'} <small>${unlocked.size}/12</small></h3><p class="progression-help">${guest?(ru?'Рассмотри награды и узнай, как их открыть.':'Explore the awards and learn how to unlock them.'):(ru?'Нажми на открытое достижение, чтобы закрепить его в лобби (до трёх).':'Tap an unlocked achievement to pin it in the lobby (up to three).')}</p><div class="progression-achievements">${ACHIEVEMENTS.map(item=>{
    const badge=achievementFor(item[0],language),owned=unlocked.has(item[0]);
    return `<button type="button" class="progression-achievement ${owned?'is-unlocked':''} ${pinned.has(item[0])?'is-pinned':''}" data-badge-id="${item[0]}" aria-disabled="${!owned}" title="${escape(badge.description)}"><span class="achievement-icon">${badge.art}</span><span><strong>${escape(badge.name)}</strong><small>${escape(badge.description)}</small>${pinned.has(item[0])?`<em class="pin-check">${ru?'Закреплено ✦':'Pinned ✦'}</em>`:''}</span></button>`;
  }).join('')}</div></section></div>`;
}

export function finaleProgressionMarkup(progress,language='ru') {
  if (!progress?.game) return '';
  const ru=language==='ru', game=progress.game;
  const level=Number(progress.level)||1, xp=Number(progress.xp)||0;
  const next=xpForLevel(level+1), previous=xpForLevel(level);
  const percent=Math.max(0,Math.min(100,Math.round((xp-previous)/(next-previous)*100)));
  return `<section class="finale-progression"><p class="eyebrow">✦ ${ru?'Твой путь продолжается':'Your journey continues'}</p><div class="finale-rank-art">${rankForLevel(level,language).art}</div><strong>+${Number(game.xp_gained)||0} XP</strong><span>${ru?'Уровень':'Level'} ${level} · ${escape(rankForLevel(level,language).name)}</span><div class="progression-bar"><span style="width:${percent}%"></span></div>${(game.achievements_unlocked||[]).map(id=>{const badge=achievementFor(id,language);return badge?`<p class="finale-new-badge">${badge.art} ${ru?'Новое достижение':'New achievement'}: ${escape(badge.name)}</p>`:''}).join('')}</section>`;
}
