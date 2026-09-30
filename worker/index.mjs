import { supabaseConfig } from '../.worker/config.mjs';
import { handleStory } from './story-service.mjs';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/finale-story') return handleStory(request, env, supabaseConfig);
    return env.ASSETS.fetch(request);
  }
};
