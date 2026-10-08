import { supabaseConfig } from '../.worker/config.mjs';
import { handleStory } from './story-service.mjs';
import { handleFeedback } from './feedback-service.mjs';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/finale-story') return handleStory(request, env, supabaseConfig);
    if (path === '/api/feedback') return handleFeedback(request, env);
    if (path === '/privacy' || path === '/privacy/' || path === '/terms' || path === '/terms/') {
      const page = path.startsWith('/privacy') ? 'privacy' : 'terms';
      const asset = await env.ASSETS.fetch(new Request(new URL(`/legal/${page}-page.txt`, request.url), request));
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(asset.body, { status: asset.status, headers });
    }
    return env.ASSETS.fetch(request);
  }
};
