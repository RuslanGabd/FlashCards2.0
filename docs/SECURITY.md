# Security and configuration

## Credentials

`JWT_SECRET` and `DB_PASSWORD` have no working production defaults. The local initializer creates random credentials in an ignored `.env` with restrictive file permissions and never overwrites an existing file. Docker excludes `.env` from its build context. Production credentials must be supplied through the deployment platform and must differ from local values.

Before deploying this revision, revoke/reissue any DeepSeek, Yandex and Forvo keys that were used from earlier repository versions. Rotate the JWT signing key and any reused database/account passwords. If the removed database dump contained a real account, its owner must change that password too. Historical Git commits still exist; removing a file does not revoke a key or erase history. No history rewrite or force push is performed by this change.

Provider keys are optional. Leave them unset until replacements are configured securely. Never send secret values in chat or paste them into commits/issues. The project cannot revoke credentials in a provider account on the owner's behalf.

## Authentication and recovery

- Passwords use BCrypt; public DTOs never expose hashes or email.
- JWT signatures/expiry and session versions are checked server-side; the frontend display of a token subject is not authorization.
- Logout revokes all sessions for that account, not just the current tab.
- Both password-recovery endpoints return a uniform 503 response and do not disclose whether an account exists or return tokens.
- Sign-in, sign-up and recovery have address-based limits. External APIs have authenticated-user limits. They are in-memory, single-instance limits.
- Resource modification requires ownership. Private metadata is filtered from another user's listings. Tests exercise the exact routes that previously bypassed those rules.

Browser tokens remain in localStorage for this SPA-style frontend. This makes prevention of XSS important: user text is escaped or assigned through textContent, and stored illustrations accept only bounded raster data URLs. A future cookie-based session design would require a deliberate CSRF and SameSite policy; it is not added implicitly here.

## Production operations

Use HTTPS, a trusted reverse proxy, a least-privileged database role and database backups. The default Compose setup is local development: it binds ports to loopback and its initial PostgreSQL role is the image's development administrator. Do not expose that database to the Internet or copy the local `.env` into a public image.

The image runs as a non-root user, with a read-only filesystem and temporary `/tmp` under Compose. The packaged frontend does not depend on the server's working directory. Validate migrations and the sign-in/save path after an upgrade.

For enterprise build proxies, Docker supports optional BuildKit `maven_settings` and `java_cacerts` secret mounts. They are only used during Maven execution and are not copied to the runtime image. TLS and artifact verification must remain enabled.
