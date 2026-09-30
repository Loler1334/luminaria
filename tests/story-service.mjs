import assert from 'node:assert/strict';
import { handleStory } from '../worker/story-service.mjs';

const roomId='12345678-1234-1234-1234-123456789abc';
const rounds=Array.from({length:28},(_,i)=>({id:`round-${i}`,clue:`Ассоциация ${i}`,phase:'results'}));
let member=true,finished=true,aiCalls=0,providedClues;
const fetcher=async(url)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'user'});
  if(url.includes('room_players?'))return Response.json(member?[{user_id:'user'}]:[]);
  if(url.includes('rooms?'))return Response.json([{status:finished?'finished':'playing'}]);
  if(url.includes('rounds?'))return Response.json(rounds);
  if(url.includes('luminaria_deck_state'))return Response.json([{remaining_cards:finished?0:10}]);
  throw Error('Unexpected URL');
};
const store=new Map();
const cache={async match(key){return store.get(key.url)?.clone()},async put(key,response){store.set(key.url,response.clone())}};
const env={AI:{async run(model,{messages}){aiCalls++;providedClues=JSON.parse(messages[1].content).clues;return {response:'Ночью наши слова сложились в карту исчезнувшего города. За последней дверью горел свет, хотя никто туда не входил. Мы узнали свои голоса в шелесте звёзд и поняли: пока кто-то помнит дорогу, история не заканчивается.'}}}};
const config={url:'https://example.supabase.co',key:'public-key'};
const request=(auth=true)=>new Request('https://luminaria.test/api/finale-story',{method:'POST',headers:auth?{Authorization:'Bearer token'}:{},body:JSON.stringify({roomId,language:'ru'})});
assert.equal((await handleStory(request(false),env,config,{fetcher,cache})).status,401);
finished=false;assert.equal((await handleStory(request(),env,config,{fetcher,cache})).status,409);assert.equal(aiCalls,0);
finished=true;
const results=await Promise.all([handleStory(request(),env,config,{fetcher,cache}),handleStory(request(),env,config,{fetcher,cache})]);
const first=await results[0].json();assert.equal(first.clueCount,28);assert.equal(providedClues.at(-1),'Ассоциация 27');assert.equal(aiCalls,1);assert(first.story.length<=260);
assert.equal((await (await handleStory(request(),env,config,{fetcher,cache})).json()).story,first.story);assert.equal(aiCalls,1);
member=false;assert.equal((await handleStory(request(),env,config,{fetcher,cache})).status,403);
member=true;store.clear();assert.equal((await handleStory(request(),{},config,{fetcher,cache})).status,503);
console.log('PASS: story authorization, finished-game guard, all 28 clues sent, shared cache, concurrent requests deduplicated, unavailable AI fallback response.');
