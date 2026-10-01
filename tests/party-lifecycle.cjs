const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const reset=extract('function resetLiveParty(){','async function loadLiveHand');
const load=extract('async function loadLiveRound(){','function syncLiveRoundNumber');
const prepare=extract('async function prepareNextLiveRound(){','async function addLiveScoreboard');
(async()=>{
  for(let players=3;players<=7;players++){
    const saved=new Map([['pending',JSON.stringify({completedRoundId:'old-round',storytellerId:'old-leader'})]]);
    const state={liveGameEpoch:0,liveGameContext:{room:{id:'room',host_id:'host',status:'playing'},session:{user:{id:'host'}}},liveRound:{id:'old-round'},liveStorytellerId:'old-leader',liveHandCache:['old-card'],liveRoundNumber:99,liveRoundNumberForId:'old-round',liveTotalRounds:99,liveHandVersion:99,activeRoundClue:'old',activeStorytellerCard:'old',activeMoonPhase:{},preparingNextRound:false,
      resetPartyStars:()=>{},nextRoundStorageKey:()=> 'pending',localStorage:{getItem:k=>saved.get(k),removeItem:k=>saved.delete(k),setItem:(k,v)=>saved.set(k,v)},escapeHtml:x=>x};
    vm.createContext(state);vm.runInContext(reset+load,state);state.resetLiveParty();
    assert.equal(state.liveStorytellerId,null);assert.equal(state.liveRoundNumber,1);assert.equal(state.liveHandCache.length,0);assert.equal(saved.size,0);
    let release;
    const query={select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){return new Promise(resolve=>release=resolve)}};
    state.supabase={from:()=>query};
    const pending=state.loadLiveRound();state.resetLiveParty();release({data:{id:'stale',phase:'submitting',storyteller_id:'wrong'}});
    assert.equal(await pending,null);assert.equal(state.liveRound,null);
    const fresh=state.loadLiveRound();release({data:null});await fresh;
    assert.equal(state.liveStorytellerId,'host');assert.equal(state.liveRoundNumber,1);
    // Final round must end even if a previous skipped round left unused cards.
    for(const cycles of [2,3,4]){
      let finished=0,rendered=0;state.liveRoundNumber=players*cycles;
      state.supabase.rpc=()=>({single:async()=>({data:{remaining_cards:players-1,cards_per_player:players*cycles}})});
      state.loadLiveRound=async()=>({id:'last',phase:'results'});
      state.showGameFinished=()=>{finished++};state.demoShowGame=state.showLiveRoundWaiting=()=>{rendered++};
      vm.runInContext(prepare,state);await state.prepareNextLiveRound();
      assert.equal(finished,1);assert.equal(rendered,0);assert.equal(state.preparingNextRound,false);
    }
  }
  console.log('PASS: rematch reset, stale previous-party response, first host recovery, final-round cap with leftover cards for 3–7 players.');
})().catch(error=>{console.error(error);process.exitCode=1});
