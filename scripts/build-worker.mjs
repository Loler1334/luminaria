import { loadEnv } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const values = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const url = values.VITE_SUPABASE_URL;
const key = values.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase build variables are required for the story service.');
if (!url.startsWith('https://')) throw new Error('Supabase requires an HTTPS URL.');
if (key.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable key, never a secret key.');
if (key.split('.').length === 3) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (payload.role !== 'anon') throw new Error('Only an anon/publishable key may be included in the build.');
}
await mkdir('.worker', { recursive: true });
await writeFile('.worker/config.mjs', `export const supabaseConfig = ${JSON.stringify({ url, key })};\n`);
