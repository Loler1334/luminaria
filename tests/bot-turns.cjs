const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
  const source=fs.readFileSync('src/main.js','utf8');
  const code=source.slice(source.indexOf('let botAdvanceTimer='),source.indexOf('function isCurrentStoryteller'));
  let now=1000,pending=null,calls=0,refreshes=0;
  const state={
    Date:{now:()=>now},setTimeout:fn=>{pending=fn;return 1},
    liveGameEpoch:0,liveGameContext:{room:{id:'room'},hasBots:true},
    supabase:{rpc:async()=>{calls++;return {data:{advanced:true},error:null}}},
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
  console.log('PASS: bot turns coalesce duplicate refreshes and resume after a phase change.');
})().catch(error=>{console.error(error);process.exitCode=1});
