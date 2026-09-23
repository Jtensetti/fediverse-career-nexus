# Nolto domain status and deployment boundary

The authoritative, reviewed procedure is `docs/nolto-activation.md`. Do not execute the earlier domain-reconnection proposal.

- Federation identity stays on `nolto.social` in both supported gateway modes.
- `deploy/wrangler.toml` uses Worker Routes over an existing frontend origin. It requires a proxied zone and Lovable's supported proxy mode.
- `deploy/wrangler.split.toml` uses a Custom Domain on the apex with the website on www. Lovable primary domain and backend/Auth SITE_URL must then be www; www must not redirect back to the apex.
- Do not use the route-mode `fetch(request)` fallback as a Custom Domain origin.
- Current observations on 23 September: backend WebFinger works; public WebFinger returns 404; actor URL returns SPA HTML; www redirects to the apex; DNS uses One.com.
- These observations explain current routing failures, not the exact history of an earlier attempt.
- No DNS or primary-domain change has been made. Complete the read-only checks and exact matching cutover configuration before changing traffic; preserve DNS records and stable actor IDs. Follow the owner's existing authorization for the task.
- Do not infer that an existing Lovable domain supports toggling proxy mode in place. Official documentation describes the connect flow; the currently exposed UI must be checked.
- Do not turn on MASTODON_CLIENT_ENABLED until migration, functions, canonical routing and native-client/peer acceptance tests have passed.
- Git synchronization is not proof that backend functions, migrations or DNS have been deployed. Report live probes separately from local tests.
