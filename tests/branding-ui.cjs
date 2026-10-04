const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const css = fs.readFileSync('src/style.css', 'utf8') + '\n' + fs.readFileSync('src/branding.css', 'utf8');
    await page.route('https://brand.test/brand/*', route => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      return route.fulfill({ contentType: 'image/png', body: fs.readFileSync('public/brand/' + name) });
    });
    await page.route('https://brand.test/', route => route.fulfill({ contentType: 'text/html', body: '<main><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a></nav><div class="star-arena"><button aria-label="Catch the star">✦</button></div></main>' }));
    await page.goto('https://brand.test/');
    await page.addStyleTag({ content: css });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const state = await page.evaluate(async () => {
        const mark = document.querySelector('.brand-mark');
        const button = document.querySelector('.star-arena button');
        const image = new Image(); image.src = '/brand/logo-small.png'; await image.decode();
        const rect = button.getBoundingClientRect();
        const brand = document.querySelector('.brand').getBoundingClientRect();
        const markRect = mark.getBoundingClientRect();
        return { logo: getComputedStyle(mark).backgroundImage, hiddenText: getComputedStyle(mark).fontSize,
          logoCenterOffset: Math.abs((markRect.top + markRect.height / 2) - (brand.top + brand.height / 2)),
          width: rect.width, height: rect.height, crystal: getComputedStyle(button, '::before').clipPath,
          overflow: document.documentElement.scrollWidth > innerWidth, imageWidth: image.naturalWidth };
      });
      assert.match(state.logo, /logo-small\.png/);
      assert.equal(state.hiddenText, '0px');
      assert.ok(state.logoCenterOffset <= 1, `logo is vertically centered (offset ${state.logoCenterOffset}px)`);
      assert.equal(state.width, 52); assert.equal(state.height, 52);
      assert.match(state.crystal, /^polygon/); assert.equal(state.overflow, false);
      assert.equal(state.imageWidth, 128);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.star-arena button').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
    for (const [name, size] of [['favicon.png',64], ['apple-touch-icon.png',180]]) {
      assert.equal(await page.evaluate(async name => { const image = new Image(); image.src = '/brand/' + name; await image.decode(); return image.naturalWidth; }, name), size);
    }
    console.log('PASS: branding at 320/390/1440px, PNG decoding, unchanged star hitbox, reduced motion, no horizontal overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
