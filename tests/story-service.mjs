import assert from 'node:assert/strict';
import { handleStory, missingStoryClues } from '../worker/story-service.mjs';
import { storyLanguage, fallbackStory, unquoteStoryClues } from '../src/game-finale.mjs';

assert.equal(storyLanguage([{clue:'Moonlit forest'},{clue:'Sleeping dragon'}]),'en');
assert.equal(storyLanguage([{clue:'Лунный лес'},{clue:'Спящий дракон'}]),'ru');
assert.equal(storyLanguage([{clue:'Moon'},{clue:'Forest'},{clue:'Очень длинная русская ассоциация'}]),'en');
assert.equal(storyLanguage([{clue:'123 ✨'}]),'en');
assert.equal(unquoteStoryClues('Он увидел «сонную улитку» и сказал: «Пора домой!»', [{clue:'Сонную улитку'}]),'Он увидел сонную улитку и сказал: «Пора домой!»');

const roomId='12345678-1234-1234-1234-123456789abc';
const rounds=Array.from({length:28},(_,i)=>({id:`round-${i}`,clue:`Ассоциация ${i}`,phase:'results'}));
let member=true,finished=true,roomLanguage=null,players=[],aiCalls=0,providedClues,persistedStory=null,providedTokenLimit=0,providedPrompt='';
const fetcher=async(url,options={})=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'user'});
  if(url.includes('room_players?'))return Response.json(url.includes('select=id,is_bot')?players:(member?[{user_id:'user'}]:[]));
  if(url.includes('rooms?'))return Response.json([{status:finished?'finished':'playing',language:roomLanguage}]);
  if(url.includes('rounds?'))return Response.json(rounds);
  if(url.includes('luminaria_deck_state'))return Response.json([{remaining_cards:finished?0:10}]);
  if(url.includes('/finale_stories?'))return Response.json(persistedStory?.finalRoundId===rounds.at(-1).id?[{story:persistedStory.story}]:[]);
  if(url.endsWith('/rpc/publish_luminaria_finale_story')){const body=JSON.parse(options.body);assert.equal(body.expected_final_round_id,rounds.at(-1).id);if(persistedStory?.finalRoundId!==body.expected_final_round_id)persistedStory={finalRoundId:body.expected_final_round_id,story:body.generated_story};return Response.json(persistedStory.story)}
  throw Error('Unexpected URL');
};
const store=new Map();
const cache={async match(key){return store.get(key.url)?.clone()},async put(key,response){store.set(key.url,response.clone())}};
const env={AI:{async run(model,{messages,max_tokens}){aiCalls++;providedClues=JSON.parse(messages[1].content).clues;providedTokenLimit=max_tokens;providedPrompt=messages[0].content;return {response:'Ночью ожили таблички: '+providedClues.join(', ')+'. Они отменили рассвет, съели будильник и назначили королём пустую кастрюлю. Король запретил тишину, и вселенная навсегда заговорила голосом чайника.'}}}};
const config={url:'https://example.supabase.co',key:'public-key'};
const request=(auth=true)=>new Request('https://luminaria.test/api/finale-story',{method:'POST',headers:auth?{Authorization:'Bearer token'}:{},body:JSON.stringify({roomId,language:'ru'})});
assert.equal((await handleStory(request(false),env,config,{fetcher,cache})).status,401);
finished=false;assert.equal((await handleStory(request(),env,config,{fetcher,cache})).status,409);assert.equal(aiCalls,0);
finished=true;
const results=await Promise.all([handleStory(request(),env,config,{fetcher,cache}),handleStory(request(),env,config,{fetcher,cache})]);
const first=await results[0].json();assert.equal(first.clueCount,28);assert.equal(providedClues.at(-1),'ассоциация 27');assert.equal(aiCalls,1);assert(first.story.length>400);assert(providedPrompt.includes('примерно 252 слов'));assert(providedPrompt.includes('максимум 315 слов'));assert(providedPrompt.includes('причинную связь'));assert(providedTokenLimit>=1176);
assert.equal((await (await handleStory(request(),env,config,{fetcher,cache})).json()).story,first.story);assert.equal(aiCalls,1);
assert.equal(persistedStory.finalRoundId,'round-27');
const oldStory=persistedStory.story;
rounds.splice(0,rounds.length,...Array.from({length:18},(_,i)=>({id:`rematch-${i}`,clue:`Новая ассоциация ${i}`,phase:'results'})));
const second=await (await handleStory(request(),env,config,{fetcher,cache})).json();
assert.equal(second.clueCount,18);assert.equal(providedClues.at(-1),'новая ассоциация 17');
assert.notEqual(second.story,oldStory);
assert.equal(persistedStory.finalRoundId,'rematch-17');assert.equal(aiCalls,2);
assert.equal((await (await handleStory(request(),env,config,{fetcher,cache})).json()).story,second.story);
assert.equal(aiCalls,2);assert.equal(oldStory,first.story);
store.clear();const anotherClient=await handleStory(request(),env,config,{fetcher,cache});assert.equal((await anotherClient.json()).story,second.story);assert.equal(aiCalls,2);
member=false;assert.equal((await handleStory(request(),env,config,{fetcher,cache})).status,403);
member=true;store.clear();persistedStory=null;assert.equal((await handleStory(request(),{},config,{fetcher,cache})).status,503);
for(const round of rounds)round.clue='Moonlit forest';
const englishEnv={AI:{async run(model,{messages}){assert(messages[0].content.includes('in English'));return {response:'Under the moon, the Moonlit forest folded its branches into a door. We stepped through and found the stars asleep among the roots, each dreaming of a different world.'}}}};
const englishResult=await handleStory(request(),englishEnv,config,{fetcher,cache});
assert.equal(englishResult.status,200);
assert((await englishResult.json()).story.startsWith('Under the moon'));
store.clear();persistedStory=null;
roomLanguage='en';
for(const round of rounds)round.clue='Лунный лес';
let roomPrompt='';
const roomEnglish=await handleStory(request(),{AI:{async run(model,{messages}){roomPrompt=messages[0].content;return {response:'A short story without all the clues.'}}}},config,{fetcher,cache});
assert.equal(roomEnglish.status,503);
assert(roomPrompt.includes('in English'));
roomLanguage=null;
for(const round of rounds)round.clue='Moonlit forest';
store.clear();persistedStory=null;roomLanguage='en';players=[{id:'human-seat',is_bot:false},{id:'bot-seat',is_bot:true}];
rounds.splice(0,rounds.length,{id:'human-round',clue:'Чаепитие',phase:'results',storyteller_participant_id:'human-seat'},
  {id:'bot-round',clue:'The rainbow skipped school',phase:'results',storyteller_participant_id:'bot-seat'});
let mixedPrompt='',mixedClues;
const mixed=await handleStory(request(),{AI:{async run(model,{messages}){mixedPrompt=messages[0].content;mixedClues=JSON.parse(messages[1].content);return {response:'Чаепитие началось в пустом замке. Радуга прогуляла школу и спряталась в чайнике, а хозяин замка вместо сахара высыпал туда звёзды. К утру все гости сияли так ярко, что чайник потребовал солнцезащитные очки.'}}}},config,{fetcher,cache});
assert.equal(mixed.status,200);assert.equal((await mixed.json()).language,'ru');assert(mixedPrompt.includes('русским языком'));assert.deepEqual(mixedClues.botClues,['The rainbow skipped school']);
rounds.splice(0,rounds.length,...Array.from({length:18},(_,i)=>({id:`rematch-${i}`,clue:'Moonlit forest',phase:'results'})));players=[];roomLanguage=null;
console.log('PASS: story authorization, compact adaptive length, all clues sent, canonical cross-client story, shared cache, concurrency and fallback handling.');

// A cut-off or oversized draft must be rewritten, never persisted as-is.
for (const badDraft of [
  {response:'Король внезапно увидел 突然 и заговорил с чайником. Эта странная история закончилась тем, что чайник стал королём, а король отправился мыть посуду.'},
  {response:'The kettle swallowed the entire royal palace and demanded a refund. The king crowned a teaspoon, folded the kingdom into a napkin and paid the bill.'},
  {response:'The king summoned a flying kettle and then'},
  {response:'A finished sentence. '.repeat(100)},
  {response:'A sentence ending in punctuation.',finish_reason:'length'},
  {response:'The king was just about to explain everything…'}
]) {
  store.clear();persistedStory=null;let attempts=0;
  const repaired='In the Moonlit forest, the kettle swallowed the royal palace and demanded a refund. The king crowned a teaspoon, which abolished gravity, folded the kingdom into a napkin and finally paid the bill.';
  const repairEnv={AI:{async run(model,{messages}){attempts++;if(attempts===1)return badDraft;assert(messages.at(-1).content.includes('not a continuation'));return {response:repaired}}}};
  const response=await handleStory(request(),repairEnv,config,{fetcher,cache});
  assert.equal(response.status,200);assert.equal(attempts,2);assert.equal(persistedStory.story,repaired);
}
store.clear();persistedStory=null;
const failed=await handleStory(request(),{AI:{run:async()=>({response:'A broken fragment without an ending'})}},config,{fetcher,cache});
assert.equal(failed.status,503);assert.equal(persistedStory,null);
console.log('PASS: incomplete, oversized and token-exhausted drafts are rewritten; repeated failure is never saved.');

store.clear();persistedStory=null;let quoteAttempts=0;
const quoted=await handleStory(request(),{AI:{async run(){quoteAttempts++;return {response:quoteAttempts===1
  ? 'The city council placed “Moonlit forest” inside a glass jar and charged every visitor for breathing. The jar escaped, stole the mayor’s shoes, and declared the council a collection of teaspoons.'
  : 'The Moonlit forest escaped its glass jar, stole the mayor’s shoes, and billed the city council for breathing. The council paid with teaspoons, so the forest opened a cutlery shop and hired the mayor as its dishwasher.'}}}},config,{fetcher,cache});
assert.equal(quoted.status,200);assert.equal(quoteAttempts,2);assert(!persistedStory.story.includes('“Moonlit forest”'));

assert.deepEqual(missingStoryClues('«ЛЁД И ПЛАМЯ» встретили КОТА!', ['лёд и пламя','кота']),[]);
assert.deepEqual(missingStoryClues('Котик увидел Ассоциация 10.', ['Кот','Ассоциация 1']),['Кот','Ассоциация 1']);
assert.deepEqual(missingStoryClues('🌕 появился.', ['🌕','☀️']),['☀️']);
store.clear();persistedStory=null;
const omitted=await handleStory(request(),{AI:{run:async()=>({response:'The kettle swallowed the entire royal palace and demanded a refund. The king crowned a teaspoon, folded the kingdom into a napkin and paid the bill.'})}},config,{fetcher,cache});
assert.equal(omitted.status,503);assert.equal(persistedStory,null);
console.log('PASS: missing clues trigger rewrite; incomplete coverage is never published; phrase boundaries, case and punctuation checked.');

store.clear();persistedStory=null;
const markerDraft=rounds.map((_,index)=>`[[clue:${index}]]`).join(', ')+': the kettle swallowed the king and abolished the kingdom forever.';
const markerResult=await handleStory(request(),{AI:{run:async()=>({choices:[{finish_reason:'stop',message:{content:markerDraft,reasoning_content:'Must not be shown'}}]})}},config,{fetcher,cache});
assert.equal(markerResult.status,200);assert(!persistedStory.story.includes('[[clue:'));
assert.deepEqual(missingStoryClues(persistedStory.story,rounds.map(round=>round.clue)),[]);
const fallbackClues=Array.from({length:18},(_,i)=>({clue:`Длинная неизменённая ассоциация номер ${i}`}));
assert.deepEqual(missingStoryClues(fallbackStory(fallbackClues),fallbackClues.map(round=>round.clue)),[]);
console.log('PASS: markers expand to original clues; the offline vignette also preserves all 18 phrases.');

assert.deepEqual(missingStoryClues('Он съел съедобную корону, заплакал каменными слезами и заиграл на печальной гармонике.', ['Съедобная корона','Каменные слёзы','Печальная гармоника']),[]);
