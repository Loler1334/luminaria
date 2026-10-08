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
      return env.ASSETS.fetch(new Request(new URL(`/${page}/index.html`, request.url), request));
    }
    return env.ASSETS.fetch(request);
  }
};
