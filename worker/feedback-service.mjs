const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' }
});

const feedbackLimit = 5;
const feedbackWindowMs = 10 * 60 * 1000;
const maxFeedbackLength = 1000;

async function readBoundedBody(request, limit) {
  if (!request.body) return '';
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export function createFeedbackService({ fetcher = fetch, now = Date.now, attempts = new Map() } = {}) {
  return async function handleFeedback(request, env) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const origin = request.headers.get('Origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Same-origin request required' }, 403);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ error: 'Feedback is not configured yet' }, 503);

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 2048) return json({ error: 'Request too large' }, 413);
    let payload;
    try {
      const raw = await readBoundedBody(request, 2048);
      if (raw === null) return json({ error: 'Request too large' }, 413);
      payload = JSON.parse(raw);
    } catch { return json({ error: 'Invalid request' }, 400); }

    // Quietly accept honeypot submissions without forwarding them.
    if (typeof payload.website === 'string' && payload.website.trim()) return json({ ok: true }, 202);
    const message = typeof payload.message === 'string'
      ? [...payload.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()].slice(0, maxFeedbackLength).join('')
      : '';
    if (message.length < 5) return json({ error: 'Please add a little more detail' }, 400);

    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return json({ error: 'Request could not be verified' }, 403);
    const timestamp = now();
    for (const [key, history] of attempts) {
      const fresh = history.filter(time => timestamp - time < feedbackWindowMs);
      if (fresh.length) attempts.set(key, fresh);
      else attempts.delete(key);
    }
    const history = attempts.get(ip) || [];
    if (history.length >= feedbackLimit) return json({ error: 'Please try again later' }, 429);
    if (attempts.size >= 10000 && !attempts.has(ip)) return json({ error: 'Please try again later' }, 429);
    attempts.set(ip, [...history, timestamp]);

    try {
      const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: `Luminaria feedback\n\n${message}`,
          disable_web_page_preview: true
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) return json({ error: 'Feedback could not be delivered' }, 502);
      return json({ ok: true }, 202);
    } catch {
      return json({ error: 'Feedback could not be delivered' }, 502);
    }
  };
}

export const handleFeedback = createFeedbackService();
