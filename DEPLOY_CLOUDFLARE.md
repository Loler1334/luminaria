# Publishing Luminaria on Cloudflare Workers

The current site uses a Worker with static assets. Use `npm run build` followed
by `npx wrangler deploy` (or the connected Cloudflare Workers Git build).
The build uses the existing `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` variables for both the frontend and the story
service. It writes ignored `.worker/config.mjs` with public Supabase configuration;
no service-role key is needed or accepted.

`wrangler.jsonc` configures the `ASSETS` and `AI` bindings. Only `/api/*` runs
through the Worker; cards and frontend files retain static asset delivery.
The authenticated `/api/finale-story` endpoint verifies room membership and
game completion, then reads all completed-round clues through the user's RLS
permissions. Workers AI writes a short epilogue. Successful stories are cached
by room, final round, clue content and language; the UI also caches the result
for its browser session. A rematch uses a new final-round identifier.

If Workers AI is unavailable or its quota is exhausted, the final scores still
work: players see a labelled local vignette, all original clues, and a retry
button. Model inference uses the Cloudflare account's Workers AI allowance.
Do not put private access tokens in build variables with a `VITE_` prefix.

Relevant Cloudflare documentation:
- [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Static assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)

## Earlier static-only Pages setup

The steps below apply to the static frontend only. Pages deployment without a
corresponding API function will show the fallback vignette instead of the AI story.

1. Create a GitHub repository and upload this project to it. Do not upload the
   local `.env` file.
2. In Cloudflare, open **Workers & Pages** → **Create application** → **Pages**
   → **Import an existing Git repository**.
3. Select the repository and use these build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Before the first production build, add these variables in **Settings** →
   **Variables and Secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Copy their values from the local `.env` file. Never use a Supabase service
   role key in a Vite variable.
5. Deploy. Cloudflare will issue a `pages.dev` URL. Add it to Supabase:
   **Authentication** → **URL Configuration** → **Site URL** and **Redirect URLs**.
6. Create a room from the deployed URL, then test the invitation in a separate
   browser profile or on a phone. The same URL will now work outside your PC.

For future changes, pushing to the connected Git branch creates a new deploy.
