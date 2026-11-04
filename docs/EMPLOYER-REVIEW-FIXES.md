# Employer review follow-up · 2026-11-04

The six reproducible issues found when reviewing commit `0aee115` have been addressed. This records source changes and isolated checks; it does not claim that the public site has already been deployed.

| Finding | Change | Regression coverage |
| --- | --- | --- |
| Two editor tabs overwrite different collections | Remote/local target IDs belong to the current tab. Saved draft context retains its own IDs; browser-wide legacy keys never select the live PUT target. | Two remote tabs, two guest tabs |
| Failed/slow loading permits saving a previous draft | Loading/error states block editing and saving; explicit retry loads the requested target. | Failed load, retry, delayed load and guarded programmatic save |
| Single-card API bypasses collection limits | Append and replacement share card/image limits and lock the parent collection during the transaction. | 501st card, image budget on append/replacement, concurrent requests for the last place |
| Null card elements cause HTTP 500 | Container-element validation rejects null with HTTP 400 before mutation. | Invalid create/update preserve existing data |
| Malformed preferences stop flashcards | Typed safe reads, validated preference fields and optional storage access preserve study interaction. Failed local annotation saves remain failures. | Invalid JSON, incorrect value/field types, unavailable storage |
| Proxy address creates one global login bucket | Client IP comes from `CF-Connecting-IP` only when the immediate peer is explicitly trusted; invalid values fall back to the peer and arbitrary XFF is ignored. | Separate trusted clients, spoofed headers, malformed literals, canonical IPv6, disabled trust by default |
| AI failure creates placeholder definitions silently | Failure stays visible in the dialog. Local extraction is an explicit choice; unknown definitions stay empty and cannot pass save validation. | Provider failure, explicit local action, incomplete save rejection and successful AI response |

The first two rows are two manifestations of the editor-target finding from the review.

## Verification

- Maven `verify`: **33 H2 tests**, zero failures/errors/skips.
- Disposable PostgreSQL 16 suite: **33 tests**, zero failures/errors/skips, including the concurrent append case.
- Frontend storage suite: **4 tests**.
- Chromium browser suite: **20 scenarios**.
- Source-built Docker image: successful build and startup with a read-only filesystem and a disposable PostgreSQL database. Additional HTTP/browser smoke checks confirmed editor isolation, blocked writes after loading failure, rejected null/501st cards, public study without storage, explicit AI failure handling and separate trusted-proxy login limits. Paid integrations were disabled and AI responses mocked.

Temporary databases, containers and processes were removed. Development/production user records were not used for these checks.

## Deployment setting for Cloudflare Tunnel

Header trust is **disabled by default**. For native cloudflared on the same computer as Java, supply:

```dotenv
TRUSTED_PROXY_CIDRS=127.0.0.1/32,::1/128
```

If starting Java from IntelliJ, add this to that run configuration's environment variables. If using the local launcher or Compose, set it in private `.env`. Docker connectors may need a different immediate peer address; configure the exact trusted peer and keep the origin port private. See [README](../README.md#cloudflare-tunnel-and-client-rate-limits) and [security](SECURITY.md).

Pull, rebuild and restart the application to apply the backend changes. These changes do not require a new database migration and do not delete existing collections. Password recovery, same-collection optimistic conflict handling, distributed rate limiting and toolchain modernization remain separate documented work.
