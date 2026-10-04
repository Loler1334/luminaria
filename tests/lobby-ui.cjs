const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://test.local/',r=>r.fulfill({body:'<main></main>',contentType:'text/html'}));await page.goto('https://test.local/');
 const source=fs.readFileSync('src/main.js','utf8').replace(/\r\n/g,'\n');
 const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 await page.addStyleTag({content:fs.readFileSync('src/style.css','utf8')+'\n'+fs.readFileSync('src/lobby-settings.css','utf8')});
 await page.evaluate(({helpers,settings,waiting,profile,handlers})=>{
  window.$=s=>document.querySelector(s);window.language='ru';window.escapeHtml=s=>s;window.avatarMarkup=()=> '✦';
  window.liveGameContext={room:{id:'room',host_id:'p0',round_cycles:2},session:{user:{id:'p0'}},player:{name:'Alice'}};
  window.roster=Array.from({length:6},(_,i)=>({user_id:'p'+i,is_ready:true,score:i,profile:{nickname:'Player '+i}}));
  window.loadLiveRoster=async()=>roster;window.selectedDeckCards=()=>Array(100);window.selectedDeckId=()=> 'moon';window.decks={moon:{cards:Array(100)}};
  window.supabase={rpc:async(name,args)=>({data:name==='luminaria_round_waiting'?roster.map((p,i)=>({user_id:p.user_id,has_submitted:i<3,has_voted:i===1})):null}),auth:{getSession:async()=>({data:{session:liveGameContext.session}})},from:()=>({upsert:async value=>{window.saved=value;return {error:null}}})};
  window.liveHandCache=[];window.liveStorytellerId='p0';window.liveRound=null;window.liveRoundNumber=1;window.applyLiveProfileUpdate=()=>{};window.liveChatChannel=null;
  window.bindWaitingMinigame=()=>{};window.ensureLiveChat=()=>{};window.addDeckSelector=()=>{};window.showInlineGameError=e=>{throw Error(e)};
  window.safeAvatar=p=>p.avatar;window.cachePlayer=()=>{};window.navProfileCache=null;window.liveProfileCache=new Map();window.addAuthButton=()=>{};
  window.compressAvatar=async()=>{window.crops++;return window.cancelCrop?null:'data:image/jpeg;base64,AAAA'};window.crops=0;
  window.alert=e=>{throw Error(e)};
  for(const code of [helpers.replace(/export /g,''),settings,waiting,profile,handlers])(0,eval)(code);
 },{helpers:fs.readFileSync('src/round-options.mjs','utf8'),settings:slice('let lobbyRoster=[];','const originalShowLobby='),waiting:slice('function showLiveRoundWaiting()','function bindWaitingMinigame')+slice('async function addWaitingScoreboard()','async function routeLiveRound()'),profile:slice('async function openProfileSetup(session)','const renderProfileSetup='),handlers:slice("document.addEventListener('change',async event=>{\n  const input=event.target;if(input?.id!=='profileAvatarUpload')",'function hydrateAvatarImages()')});
 await page.evaluate(()=>document.body.innerHTML='<main><section class="lobby-grid"></section><button id="startButton">Start</button></main>');
 await page.evaluate(()=>renderRoundSelector(roster));assert.equal(await page.locator('#roundCycles option').textContent(),'12 раундов · 2 круга');
 await page.evaluate(()=>{selectedDeckCards=()=>Array(108);renderRoundSelector(roster)});assert.equal(await page.locator('#roundCycles option').count(),1);
 await page.evaluate(()=>{liveGameContext.session.user.id='p1';renderRoundSelector(roster)});assert.ok(await page.locator('#roundCycles').isDisabled());
 await page.evaluate(()=>showLiveRoundWaiting());await page.waitForFunction(()=>document.querySelector('#waitingScore').textContent.includes('Player'));
 assert.match(await page.locator('#awaitedStoryteller').innerText(),/Player 0/);
 assert.ok(await page.evaluate(()=>Boolean(document.querySelector('#waitingScore').compareDocumentPosition(document.querySelector('.waiting-minigame'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 await page.screenshot({path:'output/waiting-mobile.png',fullPage:true});
 for(let n=3;n<=10;n++){
  await page.evaluate(async n=>{roster=Array.from({length:n},(_,i)=>({user_id:'p'+i,profile:{nickname:'Player '+i}}));document.body.innerHTML='<main><section class="vote-header"></section></main>';liveRound={id:'r',phase:'voting',storyteller_id:'p0'};await updateLivePhaseProgress()},n);
  assert.equal(await page.locator('.phase-waiting span').count(),n-1);assert.equal(await page.locator('.phase-waiting .done').count(),1);
  assert.ok(!(await page.locator('.phase-waiting').innerText()).includes('Player 0'));
 }
 await page.evaluate(()=>{liveGameContext.session.user.user_metadata={};liveGameContext.session.user.id='p0'});
 for(let i=0;i<5;i++){
  await page.evaluate(()=>openProfileSetup(liveGameContext.session));
  await page.locator('#profileNickname').fill('Alice '+i);
  await page.locator('#profileAvatarUpload').setInputFiles({name:'same-avatar.png',mimeType:'image/png',buffer:Buffer.from('image')});
  await page.waitForFunction(()=>!!document.querySelector('#profileAvatarUpload').dataset.avatar);
  assert.equal(await page.locator('#profileAvatarUpload').inputValue(),'');
  await page.locator('#profileSetupForm button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('#profileSetupDialog'));
 }
 assert.equal(await page.evaluate(()=>crops),5);
 await page.evaluate(()=>openProfileSetup(liveGameContext.session));
 await page.locator('#profileAvatarUpload').setInputFiles({name:'same-avatar.png',mimeType:'image/png',buffer:Buffer.from('image')});
 await page.waitForFunction(()=>!!document.querySelector('#profileAvatarUpload').dataset.avatar);
 await page.evaluate(()=>cancelCrop=true);
 await page.locator('#profileAvatarUpload').setInputFiles({name:'same-avatar.png',mimeType:'image/png',buffer:Buffer.from('image')});
 await page.waitForFunction(()=>crops===7);assert.equal(await page.locator('#profileAvatarUpload').getAttribute('data-avatar'),'data:image/jpeg;base64,AAAA');
 assert.deepEqual(errors,[]);console.log('PASS: lobby capacity/host access, named waiting for 3–10 players, score above stars, five profile saves, same-file reselect and cancelled crop.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
