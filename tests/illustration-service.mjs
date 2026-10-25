import assert from 'node:assert/strict';
import { handleIllustration, illustrationPrompt } from '../worker/illustration-service.mjs';

const roomId='12345678-1234-1234-1234-123456789abc';
const image='data:image/jpeg;charset=utf-8;base64,'+'A'.repeat(1200);
let member=true, savedImage=null, claim=true, fail=false, aiCalls=0, releases=0, finalRoundId='final-1';
const fetcher=async(url, options={})=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'user'});
  if(url.includes('room_players?'))return Response.json(member?[{user_id:'user'}]:[]);
  if(url.includes('rooms?'))return Response.json([{status:'finished'}]);
  if(url.includes('rounds?'))return Response.json([{id:finalRoundId,phase:'results'}]);
  if(url.includes('finale_stories?'))return Response.json([{story:'BEGIN '+ 'A moonlit story. '.repeat(500)+' THE END',illustration:savedImage}]);
  const args=JSON.parse(options.body);
  assert.equal(args.expected_final_round_id,finalRoundId);
  if(url.endsWith('claim_luminaria_finale_illustration'))return Response.json(claim);
  if(url.endsWith('publish_luminaria_finale_illustration')){savedImage=args.generated_illustration;return Response.json(savedImage)}
  if(url.endsWith('release_luminaria_finale_illustration')){releases++;return Response.json(true)}
  throw Error(`Unexpected request: ${url}`);
};
const scene='A young villager plays a small harmonica beside a cooking pot. A cloud descends into the pot as he plays. The pot and cloud fill the foreground beside an old village well.';
let sceneCalls=0;
const env={AI:{run:async(model,input)=>{
  if(model.includes('gpt-oss')){sceneCalls++;assert(JSON.parse(input.messages[1].content).story.includes('THE END'));return {choices:[{message:{content:scene},finish_reason:'stop'}]}}
  assert.equal(input.prompt,illustrationPrompt(scene));assert(input.prompt.length<=2048);aiCalls++;if(fail)throw Error('Unavailable');return {image:'A'.repeat(1200)}
}}};
const call=()=>handleIllustration(new Request('https://test.local/api/finale-illustration',{
  method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({roomId,language:'en'})
}),env,{url:'https://db.test',key:'public'},{fetcher});
member=false;assert.equal((await call()).status,403);assert.equal(aiCalls,0);
member=true;
assert.equal((await (await call()).json()).image,image);assert.equal(aiCalls,1);
assert.equal((await (await call()).json()).image,image);assert.equal(aiCalls,1,'Saved image must avoid another AI call');
savedImage=null;claim=false;assert.equal((await call()).status,202);assert.equal(aiCalls,1);
claim=true;fail=true;assert.equal((await call()).status,503);assert.equal(releases,1);
fail=false;finalRoundId='final-2';
const responses=await Promise.all([call(),call()]);
assert.equal(aiCalls,3,'Concurrent requests for the new party must share one AI call');
for(const response of responses)assert.equal((await response.json()).image,image);
console.log('PASS: illustration membership, saved image reuse, pending claim, failure release/retry, new party and concurrent generation.');

assert.equal(sceneCalls,3,'Cached and concurrent requests must not repeat scene generation');
assert(illustrationPrompt('A'.repeat(1400)).length<=2048);

savedImage=null;
env.AI.run=async(model)=>model.includes('gpt-oss')?{response:scene}:{image:'A'.repeat(1409624)};
assert.equal((await call()).status,200,'Valid detailed FLUX image above the former limit must be saved');
savedImage=null;
env.AI.run=async(model)=>model.includes('gpt-oss')?{response:scene}:{image:'A'.repeat(2800000)};
assert.equal((await call()).status,503,'Limit must include the data URI prefix');
console.log('PASS: detailed images accepted; full data URI size remains bounded.');

for (const draft of ['', 'A'.repeat(1401), 'Описание сцены на русском', '<think>private reasoning</think> '+scene]) {
  let imageCalls=0;
  env.AI.run=async(model)=>{if(model.includes('gpt-oss'))return {response:draft};imageCalls++;return {image:'A'.repeat(1200)}};
  const before=releases;
  assert.equal((await call()).status,503);
  assert.equal(imageCalls,0,'Invalid scene must not be sent to image model');
  assert.equal(releases,before+1,'Scene failure must release the generation claim');
}
console.log('PASS: full story adapted to a bounded English scene; invalid scenes release claim without generating an unrelated image.');
