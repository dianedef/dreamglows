# DreamGlows — Convex development

Verified in the authenticated Convex dashboard on 2026-09-07.

- Team: `diane-defores`
- Project: `dreamglows` (DreamGlows)
- Deployment: `dev:sensible-parakeet-353`, reference `dev/us-east`.
- Region: US East (N. Virginia), explicitly selected with CLI `--region us`.
- Cloud URL: `https://sensible-parakeet-353.convex.cloud`
- HTTP Actions URL: `https://sensible-parakeet-353.convex.site`
- Dashboard: `https://dashboard.convex.dev/t/diane-defores/dreamglows/sensible-parakeet-353`
- Observed state: created and selected for the repository CLI, never deployed.
- Local CLI coordinates live in ignored `.env.local` at the repository root.

This is the dedicated DreamGlows product-data deployment. CommandGlows remains
the owner of shared identity and entitlements. No credential or deployment key
belongs in this file. No production deployment is selected or authorized here.

Creating this deployment is not evidence of a working sync service, verified
application login, entitlement enforcement, backup, or protected access.

The operator rejected Europe and its surcharge. The team's region setting is
now `Ask every time`, verified after reloading the page. Existing projects were
not migrated. The original empty European deployment `good-frog-143` was deleted
with explicit confirmation. The dashboard retry resulted in another European
deployment `dapper-seal-161`; it was also deleted on 2026-09-07 after explicit
operator confirmation. The dashboard confirmed `Deleted deployment.`
Both European deployments are retired. Use `dev/us-east` explicitly for the
repository CLI and dashboard; do not recreate a personal default implicitly.

Backend configuration must use the verified US development coordinates. Session
issuer, audience, server-to-server access contract and secret-store binding remain
to be configured before any protected endpoint is deployed.
