const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
const code=source.slice(source.indexOf('let liveStarPartyId=null;'),source.indexOf('function saveLiveChat'));
(async()=>{const saved=new Map();let first='party1';const query={select(){return this},eq(){return this},order(){return this},limit(){return this},async maybeSingle(){return {data:{id:first}}}};
const ctx=vm.createContext({liveChatRoomId:'room',liveGameContext:{room:{id:'room',status:'playing'}},liveGameEpoch:0,liveStarScores:{},finaleStarRanking:[],localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},supabase:{from:()=>query},liveChatChannel:{send(){}},renderStarScores(){}});
vm.runInContext(code,ctx);await ctx.syncStarParty();const oldKey=ctx.starStorageKey();saved.set(oldKey,JSON.stringify({p:{score:99,partyId:'party1'}}));
await ctx.syncStarParty();assert.equal(ctx.starStorageKey(),oldKey);
ctx.resetPartyStars();assert.equal(ctx.starStorageKey(),'luminaria-stars-pending-room');assert.equal(Object.keys(ctx.liveStarScores).length,0);assert(!saved.has(oldKey));
for(const id of ['party2','party3']){first=id;await ctx.syncStarParty();assert(ctx.starStorageKey().endsWith(id));assert.equal(Object.keys(ctx.liveStarScores).length,0);ctx.resetPartyStars()}
assert(source.includes('item?.partyId!==liveStarPartyId'));assert(source.includes('epoch!==liveGameEpoch||context!==liveGameContext'));
// The first round does not exist yet: clicks must work immediately.
first=null;query.maybeSingle=async()=>({data:first?{id:first}:null});
ctx.liveGameContext.session={user:{id:'p'}};ctx.liveGameContext.player={name:'Player'};
const handlers={};const star={dataset:{},disabled:false,isConnected:true,style:{setProperty(){}},addEventListener:(name,fn)=>handlers[name]=fn};
const hits={textContent:''};ctx.$=selector=>selector==='#catchStar'?star:hits;
ctx.setInterval=()=>1;ctx.clearInterval=()=>{};ctx.console=console;
vm.runInContext(source.slice(source.indexOf('function bindWaitingMinigame(){'),source.indexOf('async function addWaitingScoreboard')),ctx);
ctx.bindWaitingMinigame();await ctx.syncStarParty();
assert.equal(star.disabled,false);
const click=()=>handlers.pointerdown({preventDefault(){}});
click();click();assert.equal(ctx.liveStarScores.p.score,2);
assert(saved.has('luminaria-stars-pending-room'));
first='first-round';await ctx.syncStarParty();
assert.equal(ctx.liveStarScores.p.score,2);assert.equal(ctx.liveStarScores.p.partyId,'first-round');
assert(!saved.has('luminaria-stars-pending-room'));
click();assert.equal(ctx.liveStarScores.p.score,3);
ctx.liveGameEpoch++;ctx.resetPartyStars();click();assert.equal(Object.keys(ctx.liveStarScores).length,0);
console.log('PASS: star reset over three parties, separate storage, old broadcast/click guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
