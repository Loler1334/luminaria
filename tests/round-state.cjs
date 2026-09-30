const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
const {votingOrder,serialRefresh}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/round-state.js')).toString('base64'));
const submissions=Array.from({length:6},(_,i)=>({id:`submission-${i}`,player_id:`player-${i}`}));
const positions=new Set();
for(let round=1;round<=120;round++){
 const shuffled=votingOrder(submissions,`round-${round}`);
 assert.deepEqual(shuffled,votingOrder([...submissions].reverse(),`round-${round}`));
 assert.equal(new Set(shuffled.map(card=>card.id)).size,6);
 positions.add(shuffled.findIndex(card=>card.player_id==='player-0'));
 for(let player=1;player<6;player++)assert.equal(shuffled.filter(card=>card.player_id!==`player-${player}`).length,5);
}
assert.equal(positions.size,6,'Storyteller must appear in all six positions across rounds');
let active=0,maxActive=0,calls=0,release;
const gate=new Promise(resolve=>release=resolve);
const refresh=serialRefresh(async()=>{active++;maxActive=Math.max(maxActive,active);calls++;if(calls===1)await gate;active--});
const first=refresh();const second=refresh();refresh();release();await Promise.all([first,second]);
assert.equal(maxActive,1);assert.equal(calls,2);
let attempt=0;const retry=serialRefresh(async()=>{if(++attempt===1)throw Error('network')});
await assert.rejects(retry());await retry();assert.equal(attempt,2);
console.log('PASS: six-player ordering across 120 rounds, stable refresh/reload order, coalesced concurrent refreshes, recovery after errors.');
})().catch(error=>{console.error(error);process.exitCode=1});
