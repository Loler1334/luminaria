const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    await page.setContent(`<main class="game-page"><nav class="nav">
      <a class="brand" href="/">✦ Luminaria</a>
      <div class="game-round">Round <b>3</b><small class="round-limit"> / 8</small><span>•</span>Choose a card</div>
      <button class="language">RU</button>
      <div class="nav-tools"><button class="room-rules-button">How to play</button><button class="ghost-button deck-nav-button">Decks</button><button class="profile-entry">A</button></div>
    </nav><aside class="turn-timer">Turn time: 0:18</aside></main>`);
    for (const file of ['src/style.css', 'src/public-rooms.css', 'src/branding.css']) {
      await page.addStyleTag({ content: fs.readFileSync(file, 'utf8') });
    }
    for (const width of [320, 390, 590]) {
      await page.setViewportSize({ width, height: 800 });
      const boxes = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width }; };
        return { brand: rect('.brand'), round: rect('.game-round'), language: rect('.language'), profile: rect('.profile-entry'), rules: rect('.room-rules-button'), decks: rect('.deck-nav-button'), timer: rect('.turn-timer'), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(boxes.overflow, false, `no horizontal overflow at ${width}px`);
      assert.ok(boxes.round.y > boxes.brand.bottom, `round is below brand at ${width}px`);
      assert.ok(boxes.round.bottom < boxes.timer.y, `round is next to timer at ${width}px`);
      assert.ok(boxes.rules.y > boxes.brand.bottom && boxes.decks.y > boxes.brand.bottom, `secondary actions are on lower row at ${width}px`);
      assert.ok(boxes.language.y < boxes.round.y && boxes.profile.y < boxes.round.y, `language and profile stay on top row at ${width}px`);
      assert.ok(boxes.rules.right <= width && boxes.decks.right <= width, `buttons fit at ${width}px`);
      if (width === 390 && process.env.UI_TEST_OUTPUT_DIR) {
        await page.screenshot({ path: require('node:path').join(process.env.UI_TEST_OUTPUT_DIR, 'mobile-game-header.png') });
      }
    }
    console.log('PASS: mobile game header stays readable at 320, 390, and 590px.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
