# Breakdown Reporter — Cloudflare Workers + D1

React/Vite frontend and Express API hosted together on Cloudflare Workers. Records are stored in the `DB` D1 binding. Browser storage is a read cache and offline report queue, not the shared database. No Firebase credentials or JWT_SECRET are required.

## Install and check

Use Node.js 22.12+ and npm (package-lock.json is authoritative).

```sh
npm ci
npm run cf:typegen
npm run lint
npm test
npm run deploy:check
npm run test:worker
```

## Configure Cloudflare

1. Use a **Worker**, not a Pages project. The Worker name is `bdrcloudinary`; change it if needed. The frontend is served from `dist`, and `/api/*` always goes to Express.
2. Verify the historical production `database_id` in `wrangler.toml` belongs to your account and the intended `bdrcf` database. Create a separate `bdrcf-staging` D1 database and replace the staging zero UUID before any remote command.
3. Create a Cloudflare Zero Trust **self-hosted Access application** covering the app hostname, including `/api/*` and the field-report portal. Add an Allow policy for your users and choose an identity provider or email one-time PIN. Do not configure a Bypass policy.
4. Set `CF_ACCESS_TEAM_DOMAIN` to `https://YOUR-TEAM.cloudflareaccess.com`, `CF_ACCESS_AUD` to the Access application's Audience (AUD) tag, and `BOOTSTRAP_ADMIN_EMAILS` to your administrator email in `wrangler.toml`. These identifiers are not secrets. The bootstrap list grants Admin only when a verified identity first creates a profile; subsequent roles come from D1. If the profile already exists, update it through a current admin or a reviewed D1 change.
5. Follow [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for the staging migration and deployment sequence. Protect any enabled workers.dev or preview hostname with its own Access application and correct audience, or disable those routes. The API itself verifies Access tokens and denies requests without valid identity, even on a direct hostname.

```sh
npx wrangler login
npm run db:migrate:staging
npm run deploy:staging
```

Remote migration updates the selected environment's D1 database. Review its ID before running it. Existing SQLite records are not copied automatically; export/import is an explicit administrator operation through `/api/v1/migrate`.

In Workers Builds, use `npm run build` for the build command and `npx wrangler deploy` for deployment. Do not use `wrangler pages deploy`.

## Local development

```sh
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

On PowerShell, use `Copy-Item .dev.vars.example .dev.vars`. Edit `.dev.vars` with your Access identifiers. Wrangler uses local D1 state; no production data is written. Local browser authentication needs a valid Access assertion (for API requests) or an Access-protected development hostname/tunnel configured for the same application. There is deliberately no development login bypass. The automated tests generate and verify real signed fixture tokens without contacting Cloudflare.

A separate `.env` is unnecessary for the Cloudflare deployment. `.dev.vars` is local and ignored by Git. Keep `VITE_BDR_API_URL` unset for this same-origin deployment. A separate frontend origin requires an explicitly designed Access/CORS setup.

## Authentication and data flow

Cloudflare Access signs the identity assertion. The API validates its RS256 signature, issuer, audience, expiry, and required claims using Access's published keys. Untrusted email headers, literal test tokens, unsigned payloads, and browser-selected users cannot authenticate. The UI obtains its user from `/api/v1/me` and logout uses Access logout. New nonadmin identities remain unapproved until an administrator approves them in D1. User mutation and migration endpoints enforce administrator permission; self-service updates are limited to employee number, shift, display hours, and notification sound.

Field report submissions are acknowledged only after API persistence. Lockout reads and transitions, including positive-test submission/acknowledgement, use `/api/v1/lockouts` with identity supplied by the server. Lockout writes require connectivity. Offline report actions remain queued on failure or when no handler exists; successful actions are removed individually. Report creation retries use stable IDs derived from the signed-in user and `/sync` operation ID, so lost responses and concurrent retries return the same stored record.

## Remaining scope

R2 upload/download routes are not implemented. New inline image/audio attachments are rejected by the API and upload controls are disabled for the first release. Existing embedded attachments in imported records remain readable. Shared workgroup, section, resolution status, and operator lists use D1 `app_settings`, with browser storage serving as a cache. Lockout writes use a conditional D1 update to reject stale concurrent actions. Site specific permissions and the final release rule require operational approval before field use.

## References

- [Express on Workers](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/)
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
