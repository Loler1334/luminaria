import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

for (const page of ['privacy', 'terms', 'ru']) {
  for (const suffix of ['', '/']) {
    let assetPath;
    const response = await worker.fetch(new Request(`https://luminaria.cc/${page}${suffix}`), {
      ASSETS: {
        fetch(request) {
          assetPath = new URL(request.url).pathname;
          return Promise.resolve(new Response('<!doctype html><title>Legal page</title>', {
            headers: { 'content-type': 'text/plain; charset=utf-8' }
          }));
        }
      }
    });
    assert.equal(assetPath, `/legal/${page}-page.txt`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(await response.text(), /Legal page/);
  }
}
console.log('PASS: legal and Russian landing URLs serve HTML through non-redirecting asset paths.');
