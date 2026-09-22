# Running Nolto yourself

The Docker image builds and serves the **web frontend**. It also forwards WebFinger, NodeInfo and ActivityPub function URLs to an existing backend. It does not install the database, Auth, Storage, Edge Functions, email or workers. There is no published, supported all-in-one Nolto server image yet.

## Run the frontend

Requirements: Docker Engine with Compose, and a separately provisioned Nolto backend. Use your own development backend for evaluation. Never load test fixtures into a production project.

```sh
git clone https://github.com/Jtensetti/fediverse-career-nexus.git
cd fediverse-career-nexus
cp .env.example .env
# Set your backend URL and publishable/anon key in .env.
docker compose up --build -d
```

Open `http://localhost:8080`. The container binds only to localhost, runs without root or Linux capabilities and has a read-only filesystem. Put an HTTPS reverse proxy in front of port 8080 before accepting remote traffic. Rebuild after changing the public backend settings. `docker compose down` stops the frontend without touching your backend data.

Browser configuration is public by design. The image requires both build arguments; never pass a service-role key, encryption key or database password. `config/public-backend.json` provides Nolto's public connection settings for its managed build, where local environment files are unavailable. Forks must override both environment variables or replace that public configuration. Docker excludes local environment files, source-control history and backend/test files from the build context.

## Complete backend installation: remaining work

The current migration history has not been validated from an empty backend. Isolated database regression tests cover the deployed schema and recent security changes, not a fresh instance. Before offering a new public server:

- Rehearse a clean schema installation and storage policies, then verify all user/admin permissions.
- Deploy maintained functions and configure Auth callbacks, email delivery, storage, encryption keys and scheduled workers.
- Set `SITE_URL` and `FEDERATION_DOMAIN` before creating identities. Changing an established federation domain needs a migration plan.
- Replace Nolto-specific domain URLs in hosting rules and instance configuration. The container forwards protocol routes before the SPA fallback and preserves query strings and request methods.
- Verify WebFinger returns JRD JSON, actor URLs return ActivityPub JSON, and signed follows/posts/deletions work with an independent Mastodon server.
- Rehearse restoration from encrypted backups and the 30-day deletion queue. Publish your own operator details, rules and privacy notice.

See [production readiness](production-readiness.md), [federation acceptance checks](federation-launch-checklist.md) and [privacy operations](privacy-and-deletion.md). Container health only establishes that the web server answers; it does not certify backend or federation health.
