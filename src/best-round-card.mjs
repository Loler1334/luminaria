export function roundHighlights(rounds, submissions, votes) {
  return rounds.map((round, index) => {
    const cards = submissions.filter(card => card.round_id === round.id);
    const ballots = votes.filter(vote => vote.round_id === round.id);
    const storytellerCard = cards.find(card => card.player_id === round.storyteller_id);
    const correct = ballots.filter(vote => vote.submission_id === storytellerCard?.id).length;
    const trap = Math.max(0, ...cards.filter(card => card.id !== storytellerCard?.id)
      .map(card => ballots.filter(vote => vote.submission_id === card.id).length));
    const intrigue = correct > 0 && correct < ballots.length;
    return { round, index, cards, votes: ballots, correct, trap,
      score: (intrigue ? 100 : 0) + (correct === 1 && trap >= 2 ? 40 : 0) + trap * 10 + Math.min(ballots.length - correct, 9) };
  });
}

export function bestRoundIndex(highlights) {
  if (!highlights.length) return -1;
  return highlights.reduce((best, item, index) => item.score > highlights[best].score ? index : best, 0);
}

export function visibleRoundCards(highlight) {
  const teller = highlight.cards.find(card => card.player_id === highlight.round.storyteller_id);
  const other = highlight.cards.filter(card => card.id !== teller?.id)
    .sort((a, b) => highlight.votes.filter(vote => vote.submission_id === b.id).length - highlight.votes.filter(vote => vote.submission_id === a.id).length);
  return [teller, ...other].filter(Boolean).slice(0, 4);
}

const loadImage = src => new Promise(resolve => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

function lines(ctx, text, maxWidth, maxLines) {
  const result = []; let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { result.push(line); line = word; }
    else line = next;
  }
  if (line) result.push(line);
  if (result.length > maxLines) result.splice(maxLines - 1, result.length, `${result[maxLines - 1].slice(0, 34)}…`);
  return result;
}

function clipped(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  while (text.length && ctx.measureText(`${text}…`).width > width) text = text.slice(0, -1);
  return `${text}…`;
}

export async function renderBestRoundCard(highlight, { language = 'ru', name, cardUrl, roundNumber }) {
  const ru = language === 'ru';
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#282443'); bg.addColorStop(0.6, '#171b35'); bg.addColorStop(1, '#0c1227');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = '#f0c47e'; ctx.font = '700 34px Arial, sans-serif'; ctx.fillText('✦ LUMINARIA', 68, 82);
  ctx.fillStyle = '#aeb7d4'; ctx.font = '24px Arial, sans-serif';
  ctx.fillText(`${ru ? 'ЛУЧШИЙ РАУНД' : 'BEST ROUND'}  ·  ${roundNumber}`, 68, 135);
  ctx.fillStyle = '#fff2df'; ctx.font = '600 48px Georgia, serif';
  const clueLines = lines(ctx, `“${highlight.round.clue}”`, 930, 3);
  clueLines.forEach((line, index) => ctx.fillText(line, 68, 190 + index * 54, 930));
  ctx.fillStyle = '#bfc4da'; ctx.font = '25px Arial, sans-serif';
  ctx.fillText(`${ru ? 'Ведущий' : 'Storyteller'}: ${name(highlight.round.storyteller_id).slice(0, 38)}`, 68, 345, 930);
  const cards = visibleRoundCards(highlight);
  const images = await Promise.all(cards.map(card => loadImage(cardUrl(card.card_id))));
  cards.forEach((card, index) => {
    const x = 68 + (index % 2) * 480, y = 380 + Math.floor(index / 2) * 430;
    const teller = card.player_id === highlight.round.storyteller_id;
    ctx.fillStyle = '#232940'; ctx.fillRect(x, y, 445, 407);
    ctx.strokeStyle = teller ? '#edbd71' : '#676b86'; ctx.lineWidth = teller ? 6 : 2; ctx.strokeRect(x, y, 445, 407);
    const image = images[index];
    if (image) {
      const ratio = Math.min(425 / image.naturalWidth, 294 / image.naturalHeight);
      const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
      ctx.drawImage(image, x + (445 - width) / 2, y + 10 + (294 - height) / 2, width, height);
    } else { ctx.fillStyle = '#a5acc9'; ctx.font = '25px Arial, sans-serif'; ctx.fillText(ru ? 'Карта недоступна' : 'Card unavailable', x + 68, y + 165); }
    ctx.fillStyle = teller ? '#f1c985' : '#f4edfb'; ctx.font = '600 25px Arial, sans-serif';
    ctx.fillText(name(card.player_id).slice(0, 24), x + 16, y + 332, 413);
    const voters = highlight.votes.filter(vote => vote.submission_id === card.id).map(vote => name(vote.voter_id));
    ctx.fillStyle = '#b7c1d7'; ctx.font = '20px Arial, sans-serif';
    const voterText = voters.length ? `${ru ? 'Выбрали' : 'Picked by'}: ${voters.join(', ')}` : (ru ? 'Никто не выбрал' : 'No votes');
    ctx.fillText(clipped(ctx, voterText, 413), x + 16, y + 377);
  });
  ctx.fillStyle = '#d8d2e7'; ctx.font = '22px Arial, sans-serif';
  ctx.fillText(`${ru ? 'Угадали карту ведущего' : 'Found the storyteller card'}: ${highlight.correct} / ${highlight.votes.length}`, 68, 1255);
  ctx.fillStyle = '#9faac7'; ctx.font = '19px Arial, sans-serif';
  ctx.fillText(`${ru ? 'Показано карт' : 'Cards shown'}: ${cards.length} / ${highlight.cards.length}`, 68, 1287);
  ctx.fillStyle = '#edbd71'; ctx.font = '700 23px Arial, sans-serif'; ctx.fillText('luminaria.cc', 68, 1322);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png'));
}
