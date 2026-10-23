# Local verification · 2026-10-23

The following checks ran successfully in the development cloud environment. This records local results; it does not assert that the GitHub Actions workflow or the public deployment has run the same build.

| Check | Result |
| --- | --- |
| Maven `verify`, H2 | 25 tests, zero failures/errors/skips |
| `python3 scripts/check.py postgres` | 25 tests on a fresh PostgreSQL 16 database, Flyway and Hibernate validation included |
| `npm run test:unit` | 2 storage regressions |
| `python3 scripts/check.py e2e` | 11 Chromium scenarios |
| Docker image build | Source-built executable JAR and bundled frontend |
| Container runtime smoke check | Non-root UID 10001, read-only filesystem, temporary PostgreSQL database, no source checkout mounted |

Browser scenarios cover draft recovery, selected-set navigation, image/diagram persistence in a fresh context, honest failed-save handling, login, server pagination/search, suggestions, timers, responsive pages at 320/768/1440 pixels, persisted card reordering and session revocation. The responsive checks also use an authenticated account with a long username.

Container checks exercised packaged HTML/CSS/JS, signup/login, collection creation, public profile privacy, disabled password recovery and exposed pagination headers. Screenshots were captured from this container using synthetic example data. Test databases and containers were removed afterward; the development database was preserved.

External paid providers, production secret rotation and deployment to wordsup.eu were not part of these local checks. See [security](SECURITY.md) for the required deployment actions and [architecture](ARCHITECTURE.md#limits) for design limits.
