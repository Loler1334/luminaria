const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    for (const action of ['exchange', 'skip']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<main><section class="hand-area"></section></main>');
      await page.addStyleTag({ content: fs.readFileSync('src/reroll.css', 'utf8') });
      const source = fs.readFileSync('src/reroll.js', 'utf8').replace(/^import .*\r?\n/m, '').replace('export function installRerolls', 'function installRerolls');
      await page.evaluate(({ source, action }) => {
        window.calls = [];
        window.context = { room: { id: 'room-1', status: 'playing' } };
        window.supabase = { rpc: async (name, args) => {
          calls.push({ name, args });
          if (name === 'luminaria_reroll_status') return { data: { available: !calls.some(call => call.name === 'reroll_luminaria_card'), milestone: 'milestone-5' }, error: null };
          if (name === 'luminaria_hand') return { data: Array.from({ length: 6 }, (_, i) => ({ card_id: `${String(i + 1).padStart(3, '0')}-card.webp` })), error: null };
          return { data: { ok: true, card_id: args.chosen_card_id ? '110-card.webp' : null }, error: null };
        } };
        window.changed = 0;
        window.expectedChanged = 1;
        window.cardInfo = id => ({ title: id });
        (0, eval)(source);
        installRerolls({ supabase, getContext: () => context, getLanguage: () => 'en', cardInfo, onChanged: async result => { window.lastChange = result; changed++; } });
      }, { source, action });
      await page.locator('.reroll-offer button').waitFor();
      await page.locator('.reroll-offer button').click();
      assert.equal(await page.locator('.reroll-card').count(), 6);
      assert.equal(await page.locator('.reroll-card img').first().getAttribute('src'), '/deck-thumbs/001-card.webp');
      if (action === 'exchange') {
        await page.locator('.reroll-card').nth(1).click();
        await page.locator('#confirmReroll').click();
      } else {
        await page.locator('#skipReroll').click();
      }
      await page.waitForFunction(() => calls.some(call => call.name === 'reroll_luminaria_card'));
      await page.waitForFunction(() => changed === expectedChanged);
      const call = await page.evaluate(() => calls.find(item => item.name === 'reroll_luminaria_card'));
      assert.equal(call.args.target_room_id, 'room-1');
      assert.equal(call.args.milestone_round_id, 'milestone-5');
      assert.equal(call.args.chosen_card_id, action === 'exchange' ? '002-card.webp' : null);
      assert.equal(await page.evaluate(() => lastChange.changed), action === 'exchange');
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => calls.filter(call => call.name === 'luminaria_hand').length), 1);
      await page.close();
    }
    console.log('PASS: reroll offer, six-card picker, exchange request, and optional decline on mobile viewport. Uses a simulated server.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
