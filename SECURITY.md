# Security

The maintained code is on `main`. A merge, successful build or dependency scan does not establish that the hosted deployment is secure or up to date.

## Report a vulnerability

Contact **jtensetti@protonmail.com** privately with the affected endpoint, impact and reproducible steps. Do not include real users' private data or open a public issue containing an exploit. There is no published response-time guarantee or paid bounty program.

## Authorization and data boundaries

- Administration comes from database roles and verified sessions, never a hardcoded personal identifier or user-editable metadata.
- Sensitive operations require a live session and the account's required MFA assurance. A frontend route guard alone is insufficient.
- Every exposed table needs explicit grants and RLS. Default to `SECURITY INVOKER`. A necessary `SECURITY DEFINER` routine needs a fixed empty search path, qualified names, narrowly granted execution and explicit ownership/session checks.
- Actor signing keys, token secrets and retained deletion archives are inaccessible to browser roles. Never return them through public views, RPCs, logs or exports.
- Render untrusted content through sanitization after all HTML transformations. Do not add external scripts to the application entrypoint.
- Remote HTTP requests require destination, redirect, size and timeout checks. Runtime egress controls and gateway rate limits are also needed.

## Encryption and deletion

New local private messages are encrypted and signed in the browser. Participant metadata remains visible to the server; public content cannot be private while being published. The inbox integration has no forward secrecy or independent cryptographic review. A compromised client or application host can expose plaintext while it is used.

User-requested deletion hides data immediately and queues permanent erasure after 30 days. Ordinary active data does not expire after 30 days. Limited moderator access to reported deleted text ends at the same deadline. Provider backups and copies on other servers require separate operational procedures. See [the privacy design](docs/privacy-and-deletion.md).

## Deployment requirements

Keep service credentials and encryption secrets in server secret storage. Back up keys separately and test restores. If a credential was exposed, removing it from the current tree does not revoke it or remove it from Git history.

The [current review](docs/security-review.md) records fixes and remaining work. [Launch requirements](docs/production-readiness.md) include authenticated browser acceptance, hosted rate limits, backup recovery and real federation round trips. There is no blanket acceptance of private-key exposure or authorization bypasses.
