const assert=require('node:assert/strict');
(async()=>{
const {rankPlayers,awardFor,fallbackStory,fitStory}=await import('../src/game-finale.mjs');
const {finaleMarkup,starAwardMarkup}=await import('../src/finale-view.mjs');
const {seatForUser,gameSeatId,sameGameSeat}=await import('../src/seat-identity.mjs');
const mixedSeats=[{id:'human-seat',user_id:'human'},{id:'bot-one',user_id:null},{id:'bot-two',user_id:null}];
assert.equal(seatForUser(mixedSeats,'human').id,'human-seat');
assert.equal(gameSeatId(mixedSeats,null,'human'),'human-seat');
assert.equal(gameSeatId(mixedSeats,'bot-one',null),'bot-one');
assert.equal(gameSeatId(mixedSeats,'bot-two',null),'bot-two');
assert(!sameGameSeat(mixedSeats,'bot-one',null,'bot-two',null));
for(let count=3;count<=10;count++){
  const roster=Array.from({length:count},(_,index)=>({user_id:`p${index}`,score:100-index*7,name:`Player ${index}`}));
  const ranked=rankPlayers(roster.reverse());
  assert.equal(ranked[0].user_id,'p0');assert.equal(ranked.at(-1).place,count);
  assert.deepEqual(ranked.slice(0,3).map(p=>awardFor(p.place)),['Медаль','Грамота','Каска']);
  if(count>3)assert.equal(awardFor(ranked[3].place),'Не везёт в картах — повезёт в любви!');
  for(const total of [1,12,Math.floor(86/count)]){
    const rounds=Array.from({length:total},(_,i)=>({id:`r${i}`,clue:`Тайна ${i}: забытый город за облаками`,storyteller_id:`p${i%count}`}));
    const story=fallbackStory(rounds);
    assert([...story].length>150);
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
const seatHistory=finaleMarkup({ranking:[{id:'seat-a',user_id:'a',name:'A',score:2,place:1},{id:'seat-b',user_id:'b',name:'B',score:1,place:2}],rounds:[{clue:'Seat clue',storyteller_participant_id:'seat-b',storyteller_id:'a'}],roomId:'room',language:'en',story:'Story',isHost:false});
assert(seatHistory.includes('<blockquote>Seat clue</blockquote><small>B</small>'));
assert.equal(starAwardMarkup([{user_id:'p',name:'P'}],{}),'');
assert.equal(starAwardMarkup([{id:'bot-one',user_id:null,name:'Bot'}],{null:{score:999}}),'');
const stars=starAwardMarkup([{user_id:'a',name:'<A>'},{user_id:'b',name:'B'}],{a:{score:5},b:{score:5},outsider:{score:999}});
assert(stars.includes('&lt;A&gt;'));assert(stars.includes('B'));assert(stars.includes('награда каждому'));assert(!stars.includes('999'));
assert.equal([...fitStory('😀'.repeat(500))].length,500);
assert([...fallbackStory(Array.from({length:28},(_,i)=>({clue:`Длинная ассоциация ${i}: поезд летит к луне`})))].length>400);
assert([...fallbackStory([{clue:'Одна короткая ассоциация'}])].length<[...fallbackStory(Array.from({length:28},(_,i)=>({clue:`Ассоциация ${i}`})))].length);
console.log('PASS: final rankings for 3–10 players, adaptive unbounded stories, escaped player content, no next-round button.');
})().catch(error=>{console.error(error);process.exitCode=1});
