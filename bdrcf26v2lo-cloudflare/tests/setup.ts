import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { setLocalDatabase } from '../src/db/d1';
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../migrations/0001_initial_d1_schema.sql', import.meta.url), 'utf8'));
setLocalDatabase(() => ({
  prepare(query: string) {
    const statement = db.prepare(query);
    const bound = (args: any[]) => ({
      bind: (...values: any[]) => bound(values),
      async all() { return { results: statement.all(...args) }; },
      async first() { return statement.get(...args) || null; },
      async run() { return statement.run(...args); },
    });
    return bound([]);
  },
}));
export const issuer = 'https://bdr-test.cloudflareaccess.com';
Object.assign(process.env, { CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: 'bdr-test-audience', BOOTSTRAP_ADMIN_EMAILS: 'test@bdr.com' });
const { publicKey, privateKey } = await generateKeyPair('RS256');
const key = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === `${issuer}/cdn-cgi/access/certs`) return Response.json({ keys: [key] });
  return realFetch(input, init);
};
export function accessToken(email = 'test@bdr.com', audience = 'bdr-test-audience', expiry = '1h', tokenIssuer = issuer) {
  return new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(email).setIssuer(tokenIssuer).setAudience(audience).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
}
export const token = await accessToken();
