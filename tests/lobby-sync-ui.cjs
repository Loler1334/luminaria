const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://lobby.test/', route => route.fulfill({ contentType: 'text/html', body: '<main></main>' }));
    await page.goto('https://lobby.test/');
    const source = fs.readFileSync('src/main.js', 'utf8');
    const lobby = source.slice(source.indexOf('function showLiveLobby(room,player,session)'), source.indexOf('function updateRoomVisibilityControls(room)'));
    const sync = fs.readFileSync('src/round-state.js', 'utf8');
    await page.evaluate(({ lobby, sync }) => {
      (0, eval)(sync.replace(/export /g, ''));
      window.$ = selector => document.querySelector(selector);
      window.language = 'ru';window.liveRoomChannel = null;window.liveProfileCache = new Map();window.savingLobbySettings = false;
      window.room = { id: 'r', code: 'ABC123', host_id: 'host', status: 'lobby' };
      window.session = { user: { id: 'host' } };window.player = { name: 'Host' };
      window.liveGameContext = { room, session, player };
      window.roster = [{ user_id: 'host', is_ready: false, profile: { nickname: 'Host' } }];
      window.loadLiveRoster = async () => roster;
      window.roomInviteUrl = (origin, code) => `${origin}/?room=${code}`;
      window.avatarMarkup = () => '✦';window.selectedDeckCards = () => Array(110);
      window.selectedRoundOption = n => n >= 3 ? {} : null;
      window.renderRoundSelector = window.updateRoomVisibilityControls = window.installRoomVisibilityControls = window.addDeckSelector = () => {};
      window.showGame = () => { document.body.innerHTML = '<main>PLAYING</main>'; };
      window.showGameFinished = () => { document.body.innerHTML = '<main>FINISHED</main>'; };
      window.showClosedRoom = () => { document.body.innerHTML = '<main>CLOSED</main>'; };
      window.exitRemovedLobby = () => { document.body.innerHTML = '<main>REMOVED</main>'; };
      window.events = [];
      window.supabase = {
        from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => {
          const data = { ...room };
          if (window.delayRoom) await new Promise(resolve => window.releaseRoom = resolve);
          return { data };
        } }),
        channel: () => ({ on(type, filter, callback) { events.push(callback); return this; }, subscribe() { return this; }, unsubscribe() {} })
      };
      (0, eval)(lobby);
      showLiveLobby(room, player, session);
    }, { lobby, sync });
    await page.waitForFunction(() => $('#liveCount').textContent === '1 / 10');
    // No Realtime callback: execute the same refresh used by the polling timer.
    await page.evaluate(async () => {
      roster = ['host', 'p2', 'p3'].map(user_id => ({ user_id, is_ready: true, profile: { nickname: user_id } }));
      await refreshLiveLobby();
    });
    assert.equal(await page.locator('#liveCount').textContent(), '3 / 10');
    assert.equal(await page.locator('.player-row').count(), 3);
    assert.equal(await page.locator('.status-dot.is-ready').count(), 3);
    assert.equal(await page.locator('#startButton').isDisabled(), false);
    await page.evaluate(async () => { roster[1].is_ready = false; await refreshLiveLobby(); });
    assert.equal(await page.locator('#startButton').isDisabled(), true);

    for (const mode of ['missing', 'rejected', 'success']) {
      await page.evaluate(mode => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'missing' ? undefined : {
          writeText: async text => { if (mode === 'rejected') throw Error('Denied'); window.copied = text; }
        } });
      }, mode);
      await page.locator('#copyInvite').click();
      if (mode === 'success') {
        await page.waitForFunction(() => $('#copyInvite').textContent === 'Скопировано!');
        assert.equal(await page.locator('.manual-invitation').count(), 0);
        assert.equal(await page.evaluate(() => copied), 'https://lobby.test/?room=ABC123');
      } else {
        await page.waitForFunction(() => !!document.querySelector('.manual-invitation input'));
        assert.equal(await page.locator('#copyInvite').textContent(), 'Скопировать');
        assert.equal(await page.evaluate(() => { const input = $('.manual-invitation input'); return input.selectionEnd - input.selectionStart === input.value.length; }), true);
      }
    }
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    });
    await page.locator('#shareInvite').click();
    assert.equal(await page.locator('.manual-invitation input').inputValue(), 'https://lobby.test/?room=ABC123');
    assert.equal(await page.locator('#shareInvite').textContent(), 'Поделиться ссылкой');

    await page.evaluate(async () => { room.status = 'closed'; await refreshLiveLobby(); });
    assert.equal(await page.locator('main').textContent(), 'CLOSED');
    await page.evaluate(async () => { room.status = 'lobby'; showLiveLobby(room, player, session); await refreshLiveLobby(); room.status = 'playing'; await refreshLiveLobby(); });
    assert.equal(await page.locator('main').textContent(), 'PLAYING');
    await page.evaluate(async () => { room.status = 'lobby'; showLiveLobby(room, player, session); await refreshLiveLobby(); room.status = 'finished'; await refreshLiveLobby(); });
    assert.equal(await page.locator('main').textContent(), 'FINISHED');
    await page.evaluate(async () => { room.status = 'lobby'; roster = []; showLiveLobby(room, player, session); await refreshLiveLobby(); });
    assert.equal(await page.locator('main').textContent(), 'REMOVED');

    // Delayed response from a previous screen must not overwrite the current one.
    await page.evaluate(() => { delayRoom = true; showLiveLobby(room, player, session); });
    await page.waitForFunction(() => !!window.releaseRoom);
    await page.evaluate(async () => {
      const oldRefresh = refreshLiveLobby;
      document.body.innerHTML = '<main>NEW SCREEN</main>';
      delayRoom = false;releaseRoom();await oldRefresh();
    });
    assert.equal(await page.locator('main').textContent(), 'NEW SCREEN');
    assert.deepEqual(errors, []);
    console.log('PASS: lobby polling restores roster/readiness; closed/playing/removed transitions; stale response ignored; clipboard missing/denied/success and share fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
