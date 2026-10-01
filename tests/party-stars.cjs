const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
const code=source.slice(source.indexOf('let liveStarPartyId=null;'),source.indexOf('function saveLiveChat'));
(async()=>{const saved=new Map();let first='party1';const query={select(){return this},eq(){return this},order(){return this},limit(){return this},async maybeSingle(){return {data:{id:first}}}};
const ctx=vm.createContext({liveChatRoomId:'room',liveGameContext:{room:{id:'room',status:'playing'}},liveGameEpoch:0,liveStarScores:{},finaleStarRanking:[],localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},supabase:{from:()=>query},liveChatChannel:{send(){}},renderStarScores(){}});
vm.runInContext(code,ctx);await ctx.syncStarParty();const oldKey=ctx.starStorageKey();saved.set(oldKey,JSON.stringify({p:{score:99,partyId:'party1'}}));
await ctx.syncStarParty();assert.equal(ctx.starStorageKey(),oldKey);
ctx.resetPartyStars();assert.equal(ctx.starStorageKey(),null);assert.equal(Object.keys(ctx.liveStarScores).length,0);assert(!saved.has(oldKey));
for(const id of ['party2','party3']){first=id;await ctx.syncStarParty();assert(ctx.starStorageKey().endsWith(id));assert.equal(Object.keys(ctx.liveStarScores).length,0);ctx.resetPartyStars()}
assert(source.includes('item?.partyId!==liveStarPartyId'));assert(source.includes('partyId!==liveStarPartyId'));console.log('PASS: star reset over three parties, separate storage, old broadcast/click guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
