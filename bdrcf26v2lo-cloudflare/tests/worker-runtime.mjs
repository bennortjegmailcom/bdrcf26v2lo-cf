import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const issuer = 'https://runtime-test.cloudflareaccess.com';
const jwk = { ...await exportJWK(publicKey), kid: 'runtime-key', alg: 'RS256', use: 'sig' };
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, scriptPath: '.wrangler/test-build/worker.js',
  compatibilityDate: '2026-09-14', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'],
  bindings: { CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: 'runtime-aud', BOOTSTRAP_ADMIN_EMAILS: 'admin@example.com' },
  outboundService: async request => {
    assert.equal(request.url, `${issuer}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json' } });
  },
}));
try {
  const db = await mf.getD1Database('DB');
  const schema = readFileSync('migrations/0001_initial_d1_schema.sql', 'utf8').replace(/--[^\n]*/g, '');
  await db.batch(schema.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
  const token = await new SignJWT({ email: 'admin@example.com' }).setProtectedHeader({ alg: 'RS256', kid: 'runtime-key' })
    .setSubject('runtime-admin').setIssuer(issuer).setAudience('runtime-aud').setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const send = (path, method = 'GET', body) => mf.dispatchFetch(`https://example.com/api/v1${path}`, {
    method, headers: { 'cf-access-jwt-assertion': token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const me = await send('/me');
  assert.equal(me.status, 200, await me.clone().text());
  assert.equal((await me.json()).data.role, 'Admin');
  const created = await send('/reports', 'POST', { equipment: 'Runtime pump', equipmentNumber: 'RT-1', reportedFault: 'Leaking seal', urgency: 3, workGroup: 'Mechanical' });
  assert.equal(created.status, 201, await created.clone().text());
  const id = (await created.json()).data.id;
  const fetched = await send(`/reports/${id}`);
  assert.equal(fetched.status, 200, await fetched.clone().text());
  assert.equal((await fetched.json()).data.equipmentNumber, 'RT-1');
  const unauthorized = await mf.dispatchFetch('https://example.com/api/v1/me');
  assert.equal(unauthorized.status, 401);
  const missing = await mf.dispatchFetch('https://example.com/api/v1/missing');
  assert.equal(missing.status, 404);
  console.log('PASS: real Workers runtime, Access RSA validation, D1 migration, user provisioning, report create/read, 401 and API 404');
} finally { await mf.dispose(); }
