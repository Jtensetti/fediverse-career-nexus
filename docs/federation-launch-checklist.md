# Federation acceptance

Use an existing, federation-enabled Nolto account and a separate Mastodon account. An invented username returning 404 is not a successful discovery test.

```sh
npm run check:federation -- actual_enabled_user@nolto.social
```

## Discovery and identity

- Verify DNS, TLS and host redirects for the actual deployment.
- Fetch WebFinger through `https://nolto.social/.well-known/webfinger`. Require JSON rather than a web page or redirect.
- Confirm the JRD subject is `acct:username@nolto.social` and the actor, key owner, inbox and collections use the same canonical domain.
- Resolve that address by searching from Mastodon. Check opt-out and deleted accounts do not remain discoverable locally.

The read-only check above validates WebFinger, actor and collections. Routing may use the configuration in `public/_redirects`, `vercel.json` or the optional gateway; confirm which is actually active.

## Cross-server behavior

- Follow in both directions, acknowledge Follow, retry a duplicate, unfollow and process Undo.
- Publish, edit and delete a public post in both directions. Resolve the object URL and confirm deletion tombstones. Reject private content from the public feed.
- Stop one receiving server while another remains healthy; verify retries do not resend to the successful inbox. Restart an interrupted worker and check ordering.
- Reject unsigned, tampered, stale and replayed inbox requests, as well as blocked actors and domains.
- Link an existing Nolto account to Mastodon without changing its identity. Reject reused OAuth state, wrong issuer, wrong Nolto session and duplicate identity binding.
- Import more than one CSV batch, including an invalid remote account, and display partial failure honestly.
- Verify a Move only after the destination declares the source alias. Remote servers decide whether to accept it.

## Operational checks

Monitor delivery backlog, stale processing jobs and failures. The active schedule invokes the delivery worker directly; do not re-enable the retired coordinator or database-wipe jobs. If delivery must stop, pause that schedule and registrations while retaining queued work for investigation.

Full Mastodon client APIs, remote DMs, universal account mirroring and automatic transfer of historical posts are not supported. Do not use a third-party client login or a successful link operation as proof of those features.
