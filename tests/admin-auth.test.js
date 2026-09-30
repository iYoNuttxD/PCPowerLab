import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

process.env.ADMIN_PASSWORD = randomBytes(24).toString('hex');
const { app } = await import('../src/app.js');

test('protege APIs administrativas com sessão, logout e limite de tentativas', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const call = (path, options = {}) => globalThis.fetch(`${base}${path}`, options);

  try {
    assert.equal((await call('/health')).status, 200);
    assert.equal((await call('/components')).status, 200);
    for (const path of ['/admin/components', '/compatibility-rules', '/performance-parameters']) {
      assert.equal((await call(path)).status, 401);
      assert.equal((await call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    }
    assert.deepEqual(await (await call('/admin/session')).json(), { authenticated: false });

    const wrong = await call('/admin/unlock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' })
    });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).message, 'Senha inválida.');

    const unlocked = await call('/admin/unlock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
    });
    assert.equal(unlocked.status, 200);
    const cookieHeader = unlocked.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/);
    assert.match(cookieHeader, /SameSite=Strict/);
    assert.match(cookieHeader, /Max-Age=7200/);
    if (process.env.NODE_ENV === 'production') assert.match(cookieHeader, /Secure/);
    const cookie = cookieHeader.split(';')[0];

    assert.deepEqual(await (await call('/admin/session', { headers: { Cookie: cookie } })).json(), { authenticated: true });
    for (const path of ['/admin/components', '/compatibility-rules', '/performance-parameters']) {
      assert.equal((await call(path, { headers: { Cookie: cookie } })).status, 200);
    }

    assert.equal((await call('/admin/logout', { method: 'POST', headers: { Cookie: cookie } })).status, 200);
    assert.equal((await call('/admin/components', { headers: { Cookie: cookie } })).status, 401);

    for (let index = 0; index < 5; index += 1) {
      assert.equal((await call('/admin/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' })
      })).status, 401);
    }
    assert.equal((await call('/admin/unlock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
    })).status, 429);
  } finally {
    server.close();
  }
});
