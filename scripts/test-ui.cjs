const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

try { require.resolve(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch {
  console.error('UI tests require Playwright. Install it locally or set PLAYWRIGHT_MODULE to its absolute module path. Set PLAYWRIGHT_CHANNEL=msedge to use installed Edge.');
  process.exit(1);
}
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'luminaria-ui-'));
console.log(`UI screenshots: ${output}`);
for (const test of ['mobile-game-header-ui', 'story-card-render-ui', 'lobby-sync-ui', 'lobby-ui', 'voting-ui', 'reroll-ui', 'finale-ui', 'branding-ui']) {
  const result = spawnSync(process.execPath, [`tests/${test}.cjs`], {
    stdio: 'inherit', env: { ...process.env, UI_TEST_OUTPUT_DIR: output }
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status || 1);
}
