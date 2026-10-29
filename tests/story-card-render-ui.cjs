const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const source = fs.readFileSync('src/main.js', 'utf8');
  const start = source.indexOf('const makeShareCard=storyText=>');
  const end = source.indexOf('const loadIllustration=async', start);
  assert.ok(start >= 0 && end > start, 'share card renderer is present');
  const renderer = source.slice(start, end).trim().replace(/^const makeShareCard=/, '').replace(/;$/, '');
  const helper = fs.readFileSync('src/story-share-card.mjs', 'utf8').match(/export function storyCardTextLayout\([\s\S]+?\n\}/)?.[0].replace('export ', '');
  assert.ok(helper);
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    const result = await page.evaluate(async ({ renderer, helper }) => {
      const source = document.createElement('canvas');source.width=400;source.height=800;
      const art=source.getContext('2d');art.fillStyle='#ed534b';art.fillRect(0,0,400,150);
      art.fillStyle='#a0cbdc';art.fillRect(0,150,400,500);
      art.fillStyle='#4ac969';art.fillRect(0,650,400,150);
      const shareCardImage={src:source.toDataURL('image/png')};
      const ranking=[{name:'Ogogo'},{name:'Звёздный Плут'},{name:'Лунный Архивариус'}];
      const partyLanguage='ru';
      const storyCardTextLayout=Function(`${helper}; return storyCardTextLayout`)();
      const makeShareCard=Function('shareCardImage','ranking','partyLanguage','storyCardTextLayout',`return (${renderer})`)(shareCardImage,ranking,partyLanguage,storyCardTextLayout);
      const story='Чаепитие началось в пустом замке. Радуга прогуляла школу и спряталась в чайнике, а хозяин вместо сахара высыпал туда звёзды. К утру гости сияли так ярко, что чайник потребовал солнцезащитные очки.';
      const blob=await makeShareCard(story);
      const url=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});
      const image=new Image();image.src=url;await image.decode();
      return {url,width:image.width,height:image.height};
    }, { renderer, helper });
    assert.equal(result.width,1080);assert.ok(result.height>=1400);
    const bytes=Buffer.from(result.url.split(',')[1],'base64');
    if(process.env.UI_TEST_OUTPUT_DIR)fs.writeFileSync(path.join(process.env.UI_TEST_OUTPUT_DIR,'story-share-card.png'),bytes);
    console.log('PASS: complete story card PNG renders at full resolution with portrait art.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
