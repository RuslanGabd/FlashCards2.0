# Portfolio review follow-up

This records changes following the local review of commit `3e3ec7b`. It is a checklist of implemented changes and remaining operational actions, not a claim that the public deployment has already been upgraded.

| Review topic | Result |
| --- | --- |
| Reset token returned publicly | Recovery endpoints disabled; regression test asserts no token |
| Hardcoded signing secret | Required external JWT secret; random local initialization |
| Published provider credentials | Removed from current configuration; owner must revoke previous values |
| User database dump | Removed; samples are created through normal application/test flows |
| Private collection metadata and profile email | Filtering/public DTO fixed; regression tests added |
| Study mode loses selected collection | Shared navigation propagates IDs; browser regression |
| Refresh clears new draft | One-time new-draft handling; storage and browser regressions |
| Account images disappear | Additive migration, bounded raster persistence, fresh-context browser regression |
| Card ordering changes after saving | Stored positions, stable-ID updates and reload/practice regressions |
| Unclear online/local fallback | Explicit save status; failed online saves retain draft and remain failures |
| Missing logout | Logout UI and server-side session revocation; regression coverage |
| No PostgreSQL/CI/E2E checks | Disposable PostgreSQL runner, persistent browser suite and GitHub Actions |
| Reference archive and duplicate Compose | Removed from working repository; one documented setup |
| Documentation/packaging | Correct port, cross-platform instructions, Docker app and bundled frontend |
| Large client/controller files | API/storage/images/navigation modules, separate suggestions/timers, service transactions |
| Unbounded lists/provider duration | Server-side pagination/search and a batch dictionary deadline |
| Inconsistent study styles | Remaining study/text pages use the shared paper/forest palette |

Before public deployment, the owner still needs to rotate any previously active provider credentials, supply deployment secrets, back up the production database and deploy the new build. Verified email recovery, multi-instance rate limits, object storage and optimistic-lock UI remain deliberate future work described in ARCHITECTURE.md.
