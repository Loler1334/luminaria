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
const env={AI:{run:async(model,{prompt})=>{assert(prompt.length<=2048);assert(prompt.includes('BEGIN'));assert(prompt.endsWith('THE END'));aiCalls++;if(fail)throw Error('Unavailable');return {image:'A'.repeat(1200)}}}};
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

assert(illustrationPrompt('short story').endsWith('short story'));
assert(illustrationPrompt('🌕'.repeat(3000)).length<=2048);
