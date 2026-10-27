const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.setContent('<main></main>');
await page.addStyleTag({content:fs.readFileSync('src/style.css','utf8')+'\n'+fs.readFileSync('src/finale.css','utf8')});
const source=fs.readFileSync('src/main.js','utf8');
const finale=source.slice(source.indexOf('let openingFinale=null;'),source.indexOf('\nasync function restartLiveRoom()'));
const results=source.slice(source.indexOf('async function showLiveResults(round)'),source.indexOf('\nrouteLiveRound=serialRefresh'));
const observer=source.slice(source.indexOf('const liveResultsObserver='),source.indexOf('\nasync function createLiveRoom'));
await page.evaluate(({finale,results,observer,helpers,view,roundState})=>{
 window.language='ru';window.$=selector=>document.querySelector(selector);
 window.escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 window.liveGameContext={room:{id:'room',code:'WYBTMN',host_id:'player-0'},session:{user:{id:'player-0'}}};
 window.liveRoundNumber=18;
 window.cardAssetVersion=()=>'';window.availableCards=new Set(['001-card.webp']);window.deckPool=['001-card.webp'];
 window.avatarMarkup=()=> '✦';window.seatAvatarMarkup=()=> '✦';window.seatBotBadge=()=>'';window.restartLiveRoom=async()=>{window.rematched=true};window.showInlineGameError=message=>{throw Error(message)};window.syncStarParty=async()=>{};window.liveStarScores={};
 window.loadLiveRoster=async()=>window.roster;
 window.gameSeatId=(seats,seatId,userId)=>seatId||seats.find(seat=>seat.user_id===userId)?.id||userId;
 window.seatForGameRef=(seats,seatId,userId)=>seats.find(seat=>seat.id===seatId)||seats.find(seat=>seat.user_id===userId);
 window.roundHighlights=()=>[];
 window.addLiveScoreboard=async()=>{};window.prepareNextLiveRound=async()=>{};
 window.supabase={from:()=>({select(){return this},eq(){return this},order(){return this},in(){this.historyCards=true;return this},then(resolve){return Promise.resolve({data:this.historyCards?[]:window.rounds,error:null}).then(resolve)}}),rpc:()=>({single:async()=>({data:{remaining_cards:0},error:null})}),auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}};
 window.fetch=async(url,options)=>{if(url.includes('illustration')){if(JSON.parse(options.body).language!==storyLanguage(window.rounds))throw Error('Wrong story language');const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;return Response.json({image:canvas.toDataURL()})}return Response.json({story:'Когда луна утонула в чашке, лес заговорил голосами забытых друзей. Мы сложили их слова в ключ и открыли дверь за горизонтом. Там стоял накрытый стол — на одно место больше. Но никто не вспомнил, кого мы всё это время ждали.'})};
 (0,eval)(helpers.replace(/export /g,''));(0,eval)(view.replace(/^import .*\r?\n/gm,'').replace(/export /g,''));(0,eval)(roundState.replace(/export /g,''));
 (0,eval)(finale);(0,eval)(results);(0,eval)(observer);
},{finale,results,observer,helpers:fs.readFileSync('src/game-finale.mjs','utf8'),view:fs.readFileSync('src/finale-view.mjs','utf8'),roundState:fs.readFileSync('src/round-state.js','utf8')});
for(let count=3;count<=10;count++){
 await page.evaluate(async count=>{
   window.roster=Array.from({length:count},(_,i)=>({id:`seat-${i}`,user_id:`player-${i}`,score:[41,40,30,30,30,27,20][i],profile:{nickname:['182мужик182','Kistya','Дориан Ятс','Друзь','Semen','camilian','Последний игрок'][i]},displayName:['182мужик182','Kistya','Дориан Ятс','Друзь','Semen','camilian','Последний игрок'][i]}));
   window.rounds=Array.from({length:Math.floor(86/count)},(_,i)=>({id:`r${i}`,clue:i===Math.floor(86/count)-1?'<img src=x onerror=alert(1)>':`Тайна ${i+1}: город, который умеет летать`,storyteller_id:`player-${i%count}`}));
   document.body.innerHTML='<main class="results-page"><section class="scores"></section></main>';
   await showLiveResults({room_id:'room',phase:'results',clue:'<img src=x onerror=alert(1)>'});
 },count);
 assert.equal(await page.locator('.result-clue img').count(),0);
 assert.match(await page.locator('.result-clue').innerText(),/<img src=x onerror=alert\(1\)>/);
 assert.equal(await page.locator('.next-storyteller').count(),0);
 await page.locator('#nextLiveRound').waitFor();
 assert.match(await page.locator('#nextLiveRound').innerText(),/Результаты игры|Final game results/);
 await page.locator('#nextLiveRound').evaluate(button=>button.click());
 await page.waitForFunction(()=>document.querySelector('#storyStatus')?.textContent==='История по ассоциациям всей партии.').catch(async error=>{console.error('Finale transition diagnostic:',await page.locator('body').innerText(),errors);throw error});
 assert.equal(await page.locator('.game-finale').count(),1);
 await page.waitForFunction(()=>!document.querySelector('#finaleShareCard').hidden);
 assert.equal(await page.locator('#shareFinaleCard').isVisible(),true);
 assert.equal(await page.locator('#retryFinaleIllustration').isVisible(),false);
 assert.equal(await page.locator('.finale-scoreboard tbody tr').count(),count);
 assert.equal(await page.locator('#nextLiveRound').count(),0);
 assert.equal(await page.locator('.next-storyteller').count(),0);
 assert.equal(await page.locator('.finale-history li').count(),Math.floor(86/count));
 assert.equal(await page.locator('.podium-place-3 .podium-name').count(),Math.min(count-2,3));
 const snapshot=await page.locator('.game-finale').innerHTML();
 await page.evaluate(()=>showGameFinished());
 assert.equal(await page.locator('.game-finale').innerHTML(),snapshot);
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>390).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,10)}));if(overflow.scroll>390)console.log(overflow);assert(overflow.scroll<=390);
}
await page.screenshot({path:require('node:path').join(process.env.UI_TEST_OUTPUT_DIR||'output','finale-mobile.png'),fullPage:true});
await page.setViewportSize({width:1280,height:1000});
await page.screenshot({path:require('node:path').join(process.env.UI_TEST_OUTPUT_DIR||'output','finale-desktop.png'),fullPage:true});
await page.evaluate(()=>{window.ClipboardItem=class{constructor(items){this.items=items}};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.copiedCard=items[0].items['image/png']}}});navigator.share=()=>{throw Error('Desktop share sheet should not open')}});
await page.locator('#shareFinaleCard').click();
assert(await page.evaluate(()=>copiedCard instanceof Blob&&copiedCard.type==='image/png'));
assert.match(await page.locator('#illustrationStatus').innerText(),/скопирована/);
await page.locator('#rematchButton').click();assert(await page.evaluate(()=>rematched));
await page.evaluate(()=>{const humans=[{id:'seat-human',user_id:'player-0',name:'Игрок',score:4,place:2,avatarHtml:'✦'}];const bots=[{id:'seat-bot-one',user_id:null,is_bot:true,name:'Лунный Архивариус',score:7,place:1,avatarHtml:'☽'},{id:'seat-bot-two',user_id:null,is_bot:true,name:'Звёздный Плут',score:2,place:3,avatarHtml:'✺'}];document.body.innerHTML=finaleMarkup({ranking:[...humans,...bots],rounds:[],roomId:'room',roomCode:'WYBTMN',userId:'player-0',language:'ru',story:'Конец',isHost:false})});
assert.equal(await page.locator('.finale-scoreboard .bot-badge').count(),2);
assert.equal(await page.locator('[data-live-profile-id="null"]').count(),0);
assert.match(await page.locator('.finale-scoreboard').innerText(),/Лунный Архивариус/);
assert.deepEqual(errors,[]);
console.log('PASS: actual final-round renderer for 3–10 players, no winner error or next-round action, tie podium, full history, idempotent concurrent finale, mobile width, rematch.');
}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
