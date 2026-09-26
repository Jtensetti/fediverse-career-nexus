# Engineering rules

- Account-email links use `emailLinkOrigin()` (request Origin only if SITE_URL, its www/apex twin or EMAIL_LINK_ORIGINS) — keeps www/apex/self-hosted signups working without letting a forged Origin receive tokens.
- Event start/end times are free `HH:mm` inputs validated by `TIME_PATTERN`/`isValidLocalDateTime` — minute precision without silently shifting malformed or DST-skipped times.
