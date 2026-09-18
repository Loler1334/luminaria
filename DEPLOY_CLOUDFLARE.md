# Publishing Luminaria on Cloudflare Pages

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
