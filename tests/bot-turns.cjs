const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
  const source=fs.readFileSync('src/main.js','utf8');
  const code=source.slice(source.indexOf('let botAdvanceTimer='),source.indexOf('function isCurrentStoryteller'));
  let now=1000,pending=null,calls=0,refreshes=0,starts=0,delay=0;
  const state={
    Date:{now:()=>now},setTimeout:(fn,ms)=>{pending=fn;delay=ms;return 1},
    liveGameEpoch:0,liveRoundNumber:2,liveGameContext:{room:{id:'room'},hasBots:true},
    loadLiveRoster:async()=>[{id:'bot',is_bot:true}],
    supabase:{rpc:(name)=>{
      if(name==='luminaria_deck_state')return {single:async()=>({data:{remaining_cards:5,cards_per_player:3},error:null})};
      if(name==='start_next_turn'){starts++;return Promise.resolve({data:{id:'room',awaiting_storyteller:true},error:null})}
      calls++;return Promise.resolve({data:{advanced:true},error:null});
    }},
    routeLiveRound:async()=>{refreshes++},showInlineGameError:message=>{throw Error(message)},
    language:'ru',console
  };
  vm.createContext(state);vm.runInContext(code,state);
  const room={id:'room',status:'playing',awaiting_storyteller:false};
  const round={phase:'submitting'};
  state.scheduleBotAdvance(room,round);state.scheduleBotAdvance(room,round);
  assert.equal(calls,0);assert.equal(typeof pending,'function');
  await pending();assert.equal(calls,1);assert.equal(refreshes,1);
  pending=null;state.scheduleBotAdvance(room,round);assert.equal(pending,null,'A refresh should not start an immediate duplicate');
  now+=1000;state.scheduleBotAdvance(room,{phase:'voting'});assert.equal(typeof pending,'function');
  await pending();assert.equal(calls,2);
  now+=1000;state.scheduleBotAdvance({id:'room',status:'finished'},round);assert.equal(calls,2);
  const resultRoom={id:'room',status:'playing',awaiting_storyteller:false,current_storyteller_participant_id:'bot'};
  state.scheduleBotAdvance(resultRoom,{phase:'results'});
  assert.equal(delay,2500,'Results stay visible briefly before the bot takes over');
  await pending();assert.equal(starts,1);assert.equal(calls,3);assert.equal(refreshes,3);
  now+=1000;pending=null;state.liveRoundNumber=3;
  state.scheduleBotAdvance(resultRoom,{phase:'results'});
  await pending();assert.equal(starts,1,'The final round must not auto-start another turn');
  console.log('PASS: bot turns coalesce duplicate refreshes and resume after a phase change.');
})().catch(error=>{console.error(error);process.exitCode=1});
