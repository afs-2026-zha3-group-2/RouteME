# TODO

## REQ-001: Hello World Home Page

### Background

Project scaffolding verification: get a minimal working page running on the
target tech stack to confirm the frontend, backend, and database chain works
end to end.

### Requirement

Provide a home page that displays the text "Hello World". The text is not
hard-coded in the frontend; instead it:

1. Is stored in a SQLite database (a `greeting` table with one record).
2. Is served by the backend (Spring Boot / Java) via a `GET /api/greeting`
   endpoint that reads it from the database.
3. Is fetched by the frontend (React) home page, which calls the endpoint and
   displays the returned text.

### Tech Stack Constraints

- Frontend: React
- Backend: Spring Boot / Java
- Database: SQLite (embedded, no standalone database server required), Flyway
  migrations

### Acceptance Criteria

1. After starting the backend, the database file is created automatically and
   seeded with one "Hello World" record.
2. `GET /api/greeting` returns "Hello World".
3. After starting the frontend, visiting the home page shows the "Hello World"
   text fetched from the endpoint.

### Non-Goals

- Multi-language support or a configurable greeting management UI
- User accounts and permissions
