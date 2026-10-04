export function rankPlayers(roster) {
  const sorted = [...roster].sort((a, b) => Number(b.score) - Number(a.score));
  let place = 0, previousScore;
  return sorted.map(seat => {
    const score = Number(seat.score) || 0;
    if (score !== previousScore) place++;
    previousScore = score;
    return { ...seat, score, place };
  });
}

export function awardFor(place, language = 'ru') {
  const awards = language === 'ru'
    ? ['Медаль', 'Грамота', 'Каска']
    : ['Medal', 'Certificate', 'Hard hat'];
  return awards[place - 1] || (language === 'ru' ? 'Не везёт в картах — повезёт в любви!' : 'Unlucky at cards — lucky in love!');
}

export function awardIcon(place) {
  const drawings = {
    1: '<path d="m25 6 15 28 8-10L39 6Z" fill="#c682ff"/><path d="m71 6-15 28-8-10 9-18Z" fill="#e5a6ff"/><circle cx="48" cy="56" r="28" fill="#f4c469" stroke="#ffebaa" stroke-width="3"/><circle cx="48" cy="56" r="21" fill="none" stroke="#b77a28"/><path d="m48 39 5 11 12 1-9 9 2 12-10-6-10 6 2-12-9-9 12-1Z" fill="#fff2bd"/>',
    2: '<rect x="18" y="12" width="60" height="69" rx="5" fill="#f8ebd1"/><rect x="24" y="18" width="48" height="56" rx="2" fill="none" stroke="#bb9560" stroke-width="2"/><path d="M33 30h30M33 39h25M33 48h20" stroke="#9994bb" stroke-width="3" stroke-linecap="round"/><path d="m57 69-3 19 9-5 8 5-3-19" fill="#ae8bd6"/><circle cx="63" cy="64" r="10" fill="#daba73"/>',
    3: '<path d="M18 66V53a30 30 0 0 1 60 0v13" fill="#e7a247"/><path d="M42 20h12v44H42Z" fill="#fbd88b"/><path d="M25 37v24M71 37v24" stroke="#b9792c" stroke-width="3"/><rect x="11" y="62" width="74" height="12" rx="6" fill="#ffce75"/><path d="M28 78h40" stroke="#ca8b45" stroke-width="3" stroke-linecap="round"/>'
  };
  return `<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">${drawings[place] || ''}</svg>`;
}

export function cleanClues(rounds) {
  return rounds.map(round => String(round.clue || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Count each clue once so a single long phrase cannot outweigh the whole party.
// Ties use total letters, then English for emoji/numeric-only games.
export function storyLanguage(rounds) {
  let russian = 0, english = 0, cyrillic = 0, latin = 0;
  for (const clue of cleanClues(rounds)) {
    const ru = (clue.match(/[а-яё]/gi) || []).length;
    const en = (clue.match(/[a-z]/gi) || []).length;
    cyrillic += ru; latin += en;
    if (ru > en) russian++; else if (en > ru) english++;
  }
  return russian === english ? (cyrillic > latin ? 'ru' : 'en') : russian > english ? 'ru' : 'en';
}

export function storySeed(clues) {
  let seed = 2166136261;
  for (const char of clues.join('\n')) seed = Math.imul(seed ^ char.codePointAt(0), 16777619);
  return (seed >>> 0) || 1;
}

export function fitStory(text, max = 400) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if ([...clean].length <= max) return clean;
  const excerpt = [...clean].slice(0, max - 1).join('');
  const sentence = Math.max(excerpt.lastIndexOf('.'), excerpt.lastIndexOf('!'), excerpt.lastIndexOf('?'));
  if (sentence >= 180) return excerpt.slice(0, sentence + 1);
  const space = excerpt.lastIndexOf(' ');
  return excerpt.slice(0, space > 150 ? space : undefined).replace(/[,;:\s]+$/, '') + '…';
}

// A local vignette keeps the finale usable if the story service is unavailable.
export function fallbackStory(rounds, language = 'ru') {
  const clues = cleanClues(rounds);
  if (!clues.length) return language === 'ru'
    ? 'Ночью за пустым столом зажглась звезда. Никто не помнил, кто её загадал. К рассвету все карты исчезли, а на последней осталась дверь. За ней кто-то тихо произнёс наши имена. Кажется, история только начинается.'
    : 'At midnight a star appeared above the empty table. Nobody remembered naming it. By dawn the cards had vanished, leaving a door. From the other side, someone whispered our names. Perhaps the story was only beginning.';
  const seed = storySeed(clues);
  const positions = [...new Set([seed % clues.length, Math.floor(clues.length / 2), clues.length - 1])];
  const fragments = positions.map(index => fitStory(clues[index], 28));
  const words = fragments.map(fragment => language === 'ru' ? `«${fragment}»` : `“${fragment}”`).join(', ');
  return fitStory(language === 'ru'
    ? `Ночью на пустых картах проступили слова: ${words}. Мы сложили их в тайный знак — и за стеной открылась дверь. Утром каждый помнил эту историю, но никто не мог объяснить, кто впустил нас обратно.`
    : `At midnight, blank cards revealed the words ${words}. We joined them into a secret sign, and a door opened in the wall. By dawn everyone remembered the story, but nobody knew who had let us back in.`);
}
