# Database dump

Dump file:

```powershell
db-dumps\quizlet_db_dump_20260801-154357.sql
```

Restore after starting PostgreSQL with `compose.yaml`:

```powershell
docker compose up -d postgres
docker cp db-dumps\quizlet_db_dump_20260801-154357.sql flashcards-postgres:/tmp/quizlet_db_dump.sql
docker exec -i flashcards-postgres psql -U quizlet_user -d quizlet_db -f /tmp/quizlet_db_dump.sql
```

If the container on another PC is named differently, replace `flashcards-postgres` with the actual container name from:

```powershell
docker ps
```
