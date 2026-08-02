# FlashCards

Web application for creating and studying English–Russian flashcard sets. The backend is a Spring Boot REST API; the frontend is static HTML, CSS and JavaScript served by the same application.

## Stack

- Java 24 and Spring Boot 3.4
- Spring Web, Security, Validation and Data JPA
- JWT authentication
- PostgreSQL with Flyway migrations
- H2 for integration tests
- DeepSeek, Yandex Dictionary and Forvo integrations
- Vanilla JavaScript frontend

## Requirements

- JDK 24
- Docker Desktop or a local PostgreSQL 16 installation

The Maven Wrapper is included, so a separate Maven installation is not required.

## Configuration

The application listens on `http://localhost:8085` and expects PostgreSQL on `localhost:5432`.

Configure external service credentials before starting the backend:

```powershell
$env:YANDEX_DICTIONARY_API_KEY="your-key"
$env:DEEPSEEK_API_KEY="your-key"
$env:FORVO_API_KEY="your-key"
```

Do not commit real API keys or JWT secrets. If credentials have previously been committed, rotate them before deploying the application.

## Local startup

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Start the application:

```powershell
.\mvnw.cmd spring-boot:run
```

Open [http://localhost:8085](http://localhost:8085). Flyway applies the database migrations automatically.

To restore the optional database dump, follow [db-dumps/README.md](db-dumps/README.md).

## Tests

Run all tests:

```powershell
.\mvnw.cmd test
```

Integration tests use an isolated in-memory H2 database and cover:

- authentication requirements for protected endpoints;
- access to public and private sets;
- ownership checks for sets and cards;
- validation and the unified API error response;
- create, update, read and delete operations.

## API overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | Create an account |
| `POST` | `/api/auth/login` | Public | Obtain a JWT |
| `GET` | `/api/sets/public` | Public | List public sets |
| `GET` | `/api/sets/me` | JWT | List the current user's sets |
| `POST` | `/api/sets` | JWT | Create a set |
| `PUT` | `/api/sets/{id}` | Owner | Replace a set and its cards |
| `DELETE` | `/api/sets/{id}` | Owner | Delete a set |
| `GET` | `/api/flashcards/set/{id}` | Public or owner | Read public cards or the owner's private cards |
| `POST` | `/api/flashcards/set/{id}` | Owner | Add a card |
| `DELETE` | `/api/flashcards/{id}` | Owner | Delete a card |
| `POST` | `/api/ai/create-set` | JWT, rate-limited | Generate cards through DeepSeek |
| `POST` | `/api/dictionary/lookup` | JWT, rate-limited | Look up translations |
| `GET` | `/api/pronunciation` | JWT, rate-limited | Find pronunciation audio |

Send the token using the HTTP header:

```text
Authorization: Bearer <token>
```

## Error response

API errors use one JSON structure:

```json
{
  "timestamp": "2026-08-01T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/auth/signup",
  "fieldErrors": {
    "email": "must be a well-formed email address"
  }
}
```

## Project layout

```text
front/                         Static frontend
src/main/java/card/flash/      Backend source code
src/main/resources/db/         Flyway migrations
src/test/                      Integration tests and test configuration
compose.yaml                   Local PostgreSQL
db-dumps/                      Optional database backup
```
