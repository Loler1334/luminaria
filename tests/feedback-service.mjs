import assert from 'node:assert/strict';
import { createFeedbackService } from '../worker/feedback-service.mjs';

const makeRequest = ({ method = 'POST', origin = 'https://luminaria.cc', ip = '203.0.113.4', body = { message: 'Please add a new game mode.' } } = {}) => new Request('https://luminaria.cc/api/feedback', {
  method,
  headers: { Origin: origin, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {})
});

const sent = [];
const service = createFeedbackService({ fetcher: async (url, options) => {
  sent.push({ url, options, payload: JSON.parse(options.body) });
  return Response.json({ ok: true });
}, now: (() => { let time = 1000; return () => time++; })() });
const env = { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: 'test-chat' };

assert.equal((await service(makeRequest({ method: 'GET' }), env)).status, 405);
assert.equal((await service(makeRequest({ origin: 'https://evil.example' }), env)).status, 403);
assert.equal((await service(makeRequest({ body: { message: 'x'.repeat(3000) } }), env)).status, 413);
assert.equal((await service(makeRequest(), env)).status, 202);
assert.equal((await service(new Request('https://luminaria.cc/api/feedback', { method: 'POST', headers: { Origin: 'https://luminaria.cc', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Should reject missing client address.' }) }), env)).status, 403);
assert.equal(sent.length, 1);
assert.equal(sent[0].url, 'https://api.telegram.org/bottest-token/sendMessage');
assert.equal(sent[0].payload.chat_id, 'test-chat');
assert.equal(sent[0].payload.parse_mode, undefined);
assert.doesNotMatch(sent[0].payload.text, /203\.0\.113\.4/);

const noConfig = createFeedbackService() ;
assert.equal((await noConfig(makeRequest(), {})).status, 503);
const beforeHoneypot = sent.length;
assert.equal((await service(makeRequest({ ip: '203.0.113.5', body: { message: 'spam bait', website: 'bot filled this' } }), env)).status, 202);
assert.equal(sent.length, beforeHoneypot);
assert.equal((await service(makeRequest({ ip: '203.0.113.6', body: { message: 'no' } }), env)).status, 400);

for (let i = 0; i < 4; i++) assert.equal((await service(makeRequest({ ip: '203.0.113.7' }), env)).status, 202);
assert.equal((await service(makeRequest({ ip: '203.0.113.7' }), env)).status, 202);
assert.equal((await service(makeRequest({ ip: '203.0.113.7' }), env)).status, 429);

const failed = createFeedbackService({ fetcher: async () => new Response('failed', { status: 500 }) });
assert.equal((await failed(makeRequest(), env)).status, 502);
console.log('PASS: feedback validates origin, payload and bot configuration; honeypot drops spam; per-IP throttling works; messages go to Telegram as plain text without forwarding IP.');
