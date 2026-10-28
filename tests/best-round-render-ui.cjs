const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const source = fs.readFileSync('src/best-round-card.mjs', 'utf8')
      .replace(/^import .*\r?\n/m, '').replace(/export /g, '');
    const result = await page.evaluate(async source => {
      (0, eval)(source);
      const image = document.createElement('canvas'); image.width = 100; image.height = 150;
      image.getContext('2d').fillRect(0, 0, 100, 150);
      const cardUrl = () => image.toDataURL();
      const cards = Array.from({ length: 10 }, (_, index) => ({ id: `c${index}`, card_id: `card-${index}`, ownerSeatId: `p${index}` }));
      const highlight = { round: { clue: 'Кто-то слишком внимательно следит за полётами' }, storytellerSeatId: 'p0', cards, votes: [{ submission_id: 'c0', voterSeatId: 'p1' }], correct: 1 };
      const blob = await renderBestRoundCard(highlight, { name: id => id, cardUrl, roundNumber: 3 });
      const bitmap = await createImageBitmap(blob);
      return { width: bitmap.width, height: bitmap.height, size: blob.size };
    }, source);
    assert.equal(result.width, 1080);
    assert.equal(result.height, 2640, 'ten cards occupy five complete rows');
    assert.ok(result.size > 10000);
    console.log('best-round canvas renders all ten cards');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
