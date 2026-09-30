const assert=require('node:assert/strict');
(async()=>{
 const {roundOptions,selectedRoundOption}=await import('../src/round-options.mjs');
 const expected={3:[6,9,12,15,18,21,24,27,30,33],4:[8,12,16,20,24],5:[10,15,20],6:[12],7:[14]};
 for(let n=3;n<=7;n++){
  assert.deepEqual(roundOptions(n,100).map(o=>o.rounds),expected[n]);
  for(let cards=0;cards<=500;cards++)for(const option of roundOptions(n,cards)){
   assert.ok(option.cards<=cards);assert.equal(option.rounds%n,0);assert.ok(option.cycles>=2);
   const turns=Array(n).fill(0);for(let r=0;r<option.rounds;r++)turns[r%n]++;
   assert.ok(turns.every(t=>t===option.cycles));
  }
 }
 assert.deepEqual(roundOptions(2,100),[]);assert.deepEqual(roundOptions(8,100),[]);
 assert.deepEqual(roundOptions(7,97),[]);assert.equal(roundOptions(7,98)[0].rounds,14);
 assert.equal(roundOptions(6,107).at(-1).rounds,12);assert.equal(roundOptions(6,108).at(-1).rounds,18);
 assert.equal(selectedRoundOption(7,100,11).rounds,14);
 assert.equal(selectedRoundOption(3,100,2).rounds,6);
 console.log('PASS: complete fair cycles for 3–7 players, 0–500 cards, capacity boundaries and roster changes.');
})();
