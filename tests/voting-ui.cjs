// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its module path.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try{
const page=await browser.newPage();
await page.route('**/deck-preview/**',route=>route.abort());
await page.setContent('<main></main>');
const source=fs.readFileSync('src/main.js','utf8');
const fn=source.slice(source.indexOf('async function showLiveVoting(round)'),source.indexOf('\nrouteLiveRound=',source.indexOf('async function showLiveVoting(round)')));
await page.evaluate(({fn,helper})=>{
 window.language='ru';window.$=s=>document.querySelector(s);
 window.availableCards=new Set(['001-card.webp']);window.deckPool=['001-card.webp'];
 window.loadLiveRoster=async()=>[];window.updateLivePhaseProgress=async()=>{};
 window.openCardPreview=options=>{window.slides=options.items};
 window.showInlineGameError=message=>{window.lastError=message};
 window.advanceLiveRound=async()=>{if(Object.keys(votes).length===playerCount-1)phase='results'};
 window.routeLiveRound=async()=>{};
 window.supabase={from:table=>{
   const filters={};
   return {select(){return this},eq(key,value){filters[key]=value;return this},
     maybeSingle:async()=>({data:votes[filters.voter_id]||null,error:null}),
     then(resolve){return Promise.resolve({data:cards,error:null}).then(resolve)},
     async insert(vote){
       await new Promise(resolve=>setTimeout(resolve,5));
       if(failNext){failNext=false;return {error:{code:'network'}}}
       if(votes[vote.voter_id])return {error:{code:'23505'}};
       votes[vote.voter_id]={submission_id:vote.submission_id};
       if(loseResponse){loseResponse=false;return {error:{code:'timeout'}}}
       return {error:null};
     }
   };
 }};
 (0,eval)(helper.replace(/export /g,''));(0,eval)(fn);
}, {fn,helper:fs.readFileSync('src/round-state.js','utf8')});
let scenarios=0;
for(let count=3;count<=10;count++)for(const roundNumber of [1,2,7,12,20]){
 const host=roundNumber%count;
 const round={id:`round-${count}-${roundNumber}`,room_id:'room',storyteller_id:`player-${host}`,clue:'test'};
 await page.evaluate(count=>{
   window.playerCount=count;window.votes={};window.phase='voting';window.failNext=false;window.loseResponse=false;
   window.cards=Array.from({length:count},(_,i)=>({id:`submission-${i}`,player_id:`player-${i}`,card_id:'001-card.webp'}));
 },count);
 const players=Array.from({length:count},(_,i)=>i).filter(i=>i!==host);
 for(const [index,player] of players.entries()){
   await page.evaluate(async({round,player})=>{window.liveGameContext={session:{user:{id:`player-${player}`}}};await showLiveVoting(round)}, {round,player});
   assert.equal(await page.locator('.vote-card').count(),count-1);
   await page.locator('.vote-card').first().click();await page.evaluate(()=>slides[0].onToggle());
   if(index===players.length-1){
     // One vote is still missing: a failed write must stay retryable.
     await page.evaluate(()=>{window.failNext=true;window.lastError=null});
     await page.locator('#castLiveVote').click();await page.waitForFunction(()=>lastError!==null);
     assert.equal(await page.locator('#castLiveVote').isDisabled(),false);
     assert.equal(await page.evaluate(()=>Object.keys(votes).length),count-2);
     assert.equal(await page.evaluate(()=>phase),'voting');
   }
   // Lost response after a successful write must recover the saved vote.
   await page.evaluate(()=>{window.loseResponse=true});
   await page.locator('#castLiveVote').click();
   await page.waitForFunction(()=>document.querySelector('#castLiveVote').classList.contains('is-ready'));
   await page.evaluate(round=>showLiveVoting(round),round);
   assert.equal(await page.locator('#castLiveVote').isDisabled(),true);
   assert.equal(await page.locator('.vote-card.selected').count(),1);
   assert.equal(await page.locator('.vote-card:disabled').count(),count-1);
 }
 assert.equal(await page.evaluate(()=>Object.keys(votes).length),count-1);
 assert.equal(await page.evaluate(()=>phase),'results');
 scenarios++;
}
console.log(`PASS: ${scenarios} voting scenarios, 3–10 players, rotating storytellers, failed final vote retry, lost response recovery, persisted votes after rerender. Uses a simulated server.`);
}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
