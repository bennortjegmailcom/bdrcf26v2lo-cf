# Production rollout and recovery

## Targets and release gates

`wrangler.toml` defines separate `bdrcloudinary-staging` and `bdrcloudinary-production` Workers. The staging D1 binding is `bdrcf-staging` and currently has a deliberately unusable zero UUID. The production binding is `bdrcf` with historical ID `5248bfcc-0a1a-47bc-9a26-fc8bafea2de9`; verify its ownership and contents before any remote command. Each environment needs its own Cloudflare Access application and audience tag, with the entire hostname including `/api/*` protected. `workers_dev` is disabled in both environments; configure reviewed custom domains or routes after their hostnames are known.

No remote migration, import, deployment, or production data change should run until the account, Worker names, database IDs, Access domains, audience tags, and initial admin identities have been reviewed. Never put a token or secret into chat, source control, or command arguments. Set credentials through the local Cloudflare login or a narrowly scoped environment secret.

## Staging sequence

1. Resolve Wrangler connectivity and run `npx wrangler whoami`. Check the account ID against the intended account. Create a new `bdrcf-staging` D1 database in that account, insert its returned ID into `env.staging.d1_databases`, and verify the production ID separately using read only D1 list/info commands.
2. Configure separate Access applications for staging and production. Replace the placeholder team domain and audience values in each environment. Put only verified initial admin email addresses in each `BOOTSTRAP_ADMIN_EMAILS`. Do not use a Bypass policy. Confirm every available hostname is covered.
3. Run `npm ci`, `npm run cf:typegen`, `npm run lint`, `npm test`, `npm run build`, `npm run test:worker`, `npm run deploy:check`, and `npm run deploy:check:production`. Review all failures before remote changes.
4. Apply `npm run db:migrate:staging` only after confirming the staging binding and database ID. Deploy with `npm run deploy:staging`. Test with real Access login and a denied identity. Check Reporter and supervisory permissions, report persistence after reload, every lockout transition including rejected and failed tests, concurrent transition conflict handling, offline replay after a lost acknowledgement, and logout. Record the Worker version, Access application audience, and D1 database ID used.
5. Use staging only for test data. Never bind staging to production D1, R2, or Access audience. A local Miniflare or Wrangler test does not prove remote Access configuration or D1 resource identity.

Before migrations, inspect `npx wrangler d1 migrations list DB --env staging --remote`. Confirm the binding summary from the dry run says `bdrcf-staging` and record the actual staging UUID. No current remote staging result exists.

## Production change proposal and approval

Before production execution, present the exact account ID, hostname, Worker name, Access application audience, D1 ID, migration files and SQL effect, import source and record counts, version being deployed, staging test results, backup location, and rollback instructions to the owner. Obtain explicit approval for the production deployment and each production data change.

After approval, take a D1 export or Time Travel recovery bookmark before migration or import. Verify the backup can be read. Apply `npm run db:migrate:production`, compare schema and row counts, then perform the reviewed import. Deploy with `npm run deploy:production`. Run read and write smoke tests using an approved production identity and record the resulting IDs. Keep staging data out of this process.

Example read-only preparation commands are `npx wrangler d1 migrations list DB --env production --remote`, `npx wrangler d1 time-travel info bdrcf --env production`, and `npx wrangler d1 export bdrcf --env production --remote --output=./backups/bdrcf-before-release.sql`. Keep the export outside source control with restricted access and test restoration into a separate database. Verify the exact CLI flags with the installed Wrangler help before use.

## Import checks

Inventory the source records by collection and count. Compare IDs and timestamps before import. The `/api/v1/migrate/import` route is administrator only and currently skips some existing IDs, but it is not a transactional bulk importer; prepare a reviewed, reproducible import file and test the exact file in staging first. Reconcile report, user, artisan, job ticket, audit, and notification counts and sample records after import. Do not infer full backup coverage from the API export, which currently limits reports to one year and 10,000 records.

## Monitoring

Workers Logs and Traces are enabled. Monitor HTTP 401 and 403 rates, API 5xx errors, D1 query failures, stale lockout conflicts, failed sync operations, and Access policy denials during rollout. Establish normal alert thresholds from staging and initial production use. Avoid logging assertions, user data, or attachment contents. Check D1 size and query latency and review Access audit logs daily during the first release.

## Recovery and rollback

For a code regression, stop writes if integrity is at risk and roll back to the recorded previous Worker version. A Worker rollback does **not** reverse D1 migrations or data changes. For bad data, preserve evidence and use the prechange D1 export or Time Travel point to restore to a separate recovery database first. Compare row counts and representative records, then plan a controlled cutover with owner approval. Restore Access configuration separately if it changed. Keep the old Worker version and backup until the postdeployment verification period ends.

Use `npx wrangler rollback --env production` only after recording the target version and checking compatibility with the current D1 schema. Monitor live errors with `npx wrangler tail --env production`. D1 Time Travel can restore a point within its supported window, but that restoration also discards legitimate writes after the selected point; compare and reconcile those writes before cutover.

## Documentation

- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [D1 export and import](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Worker rollback limits](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

## Open operational decisions

- Define which site roles may request, confirm, acknowledge, and release lockouts, and whether a second individual must acknowledge the positive test.
- Confirm whether final release requires an acknowledged PASS test and a separate release request. This is the provisional server rule.
- Decide whether attachments are disabled for first release or require authenticated R2 storage and a separate staging and production bucket.
- Confirm retention, backup frequency, monitoring recipients, and the authorized import source.
