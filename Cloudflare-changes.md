# Cloudflare backend changes

- Replaced the handwritten Express response shim with Cloudflare's supported HTTP server adapter; bindings flow through request-local context.
- Configured a Worker entry point, static SPA hosting, API routing, D1 migration scripts, generated types, logging and tracing. Preserved the supplied D1 ID for account verification before deployment.
- Corrected D1 parameter binding in repository lookups. Removed Node-only SQLite imports from the Worker dependency graph; optional Node mode explicitly enables its adapter.
- Replaced unauthenticated token minting, literal-token acceptance, unsigned JWT decoding, hardcoded secrets and trusted email headers with verified Cloudflare Access RS256 assertions. UI identity now comes from /me.
- Added admin enforcement for user creation/deletion, role changes and data import/export; restricted non-admin self-service fields. Removed silent browser-data migration.
- Connected field-report persistence and lockout operations to the API; added backend positive-test request/acknowledgement support and retained field-report draft status.
- Preserved failed/unsupported/concurrently queued offline actions and wired report replay handlers. Lockouts require connectivity.
- Removed the process-local 100-requests-per-15-minute limiter that conflicts with dashboard polling. Configure any rate limits in Cloudflare for the expected polling workload.
- Removed unused Firebase and unused required R2 configuration. Attachments remain embedded JSON; R2 transfer routes are not included.
- Removed stale Bun and Netlify configuration; updated installation/deployment documentation and npm lockfile; npm is the documented package manager.

Validation: 41 automated tests passed, npm audit reported zero vulnerabilities after compatible dependency patches, TypeScript passed, Vite production build and Wrangler dry-run passed. The bundled Worker also ran in workerd through Miniflare with a real D1 binding and signed RSA Access fixtures: provisioning, report write/read, missing-session rejection and API 404 passed. Test identity keys are ephemeral; no Cloudflare account was contacted by the runtime fixture.

Not deployed. The owner must configure Access identifiers, bootstrap administrator email, confirm the D1 ID and apply remote migrations. Existing data/bdr.sqlite is left untouched in the working copy and excluded from the source delivery ZIP; no production data was migrated. Remaining browser-only operator/settings lists and existing safety workflow/concurrency policies are described in README.md.
