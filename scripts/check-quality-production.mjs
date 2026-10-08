import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

// Run only after the real frontend production build. This verifies HTTP serving,
// not React hydration, focus, geometry or browser behavior.
// This changes the backend prefix to test routing only; a deployed custom-prefix
// frontend must separately be built with matching VITE_API_BASE_URL.
await access(new URL('../frontend/dist/index.html', import.meta.url));
process.env.NODE_ENV = 'production';
process.env.API_PREFIX = '/quality-api/v2';
const { app } = await import('../src/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const path of ['/quality-api/v2/missing', '/quality-api/v2', '/api/v1/missing']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, `API must not receive SPA HTML: ${path}`);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal((await response.json()).success, false);
  }
  const health = await fetch(origin + '/quality-api/v2/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).success, true);
  for (const path of ['/summary', '/components', '/image-credits', '/shared/share-001', '/quality-api/v2-other']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.match(html, /id="root"/);
    const bundle = html.match(/src="([^"]+\.js)"/)[1];
    const script = await fetch(origin + bundle);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type'), /javascript/);
    assert.ok((await script.text()).length > 10000);
  }
  const credits = await fetch(origin + '/images/components/ATTRIBUTION.md');
  assert.equal(credits.status, 200);
  assert.match(await credits.text(), /CC BY/);
  const catalog = (await (await fetch(origin + '/quality-api/v2/components')).json()).data;
  let photos = 0;
  const imagePaths = new Set();
  for (const component of catalog) {
    const image = component.image?.imagePath;
    if (!image) continue;
    const response = await fetch(origin + image);
    assert.equal(response.status, 200, `${component.id} image missing`);
    assert.match(response.headers.get('content-type'), /image\//);
    assert.ok((await response.arrayBuffer()).byteLength > 100);
    photos += 1;
    imagePaths.add(image);
  }
  assert.equal(photos, catalog.filter(component => component.active !== false).length, 'Every active product must serve an actual photo');
  assert.ok(imagePaths.size > 0);
  console.log(`Production HTTP passed: custom API prefix + JSON errors + 5 SPA routes + image attribution document + actual bundles + ${photos}/${catalog.length} products with verified photography (${imagePaths.size} intact/derived source files). No browser executed.`);
} finally {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}
