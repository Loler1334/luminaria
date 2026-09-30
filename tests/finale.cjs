const assert=require('node:assert/strict');
(async()=>{
const {rankPlayers,awardFor,fallbackStory,fitStory}=await import('../src/game-finale.mjs');
const {finaleMarkup}=await import('../src/finale-view.mjs');
for(let count=3;count<=7;count++){
  const roster=Array.from({length:count},(_,index)=>({user_id:`p${index}`,score:100-index*7,name:`Player ${index}`}));
  const ranked=rankPlayers(roster.reverse());
  assert.equal(ranked[0].user_id,'p0');assert.equal(ranked.at(-1).place,count);
  assert.deepEqual(ranked.slice(0,3).map(p=>awardFor(p.place)),['Медаль','Грамота','Каска']);
  if(count>3)assert.equal(awardFor(ranked[3].place),'Повезло быть счастливыми');
  for(const total of [1,12,Math.floor(86/count)]){
    const rounds=Array.from({length:total},(_,i)=>({id:`r${i}`,clue:`Тайна ${i}: забытый город за облаками`,storyteller_id:`p${i%count}`}));
    const story=fallbackStory(rounds);
    assert([...story].length<=260);assert([...story].length>150);
    const markup=finaleMarkup({ranking:ranked,rounds,roomId:'room',roomCode:'ABCDEF',userId:'p0',language:'ru',story,isHost:true});
    assert(!markup.includes('nextLiveRound'));assert(!markup.includes('Следующий раунд'));
    assert(markup.includes(`Тайна ${total-1}`));assert.equal((markup.match(/<li>/g)||[]).length,total);
  }
}
assert.deepEqual(rankPlayers([{score:41},{score:40},{score:30},{score:30},{score:30},{score:27}]).map(p=>p.place),[1,2,3,3,3,4]);
assert.deepEqual(rankPlayers([{score:0},{score:0},{score:0}]).map(p=>p.place),[1,1,1]);
assert.deepEqual(rankPlayers([]),[]);
const unsafe=finaleMarkup({ranking:[{name:'<img onerror="alert(1)">',score:1,place:1,user_id:'p'}],rounds:[{clue:'<script>bad</script>'}],roomId:'room',language:'ru',story:'<b>story</b>',isHost:false});
assert(!unsafe.includes('<script>'));assert(!unsafe.includes('<img onerror='));assert(unsafe.includes('&lt;script&gt;'));
assert([...fitStory('😀'.repeat(300))].length<=260);
console.log('PASS: final rankings for 3–7 players, tied awards, all clues, bounded stories, escaped player content, no next-round button.');
})().catch(error=>{console.error(error);process.exitCode=1});
