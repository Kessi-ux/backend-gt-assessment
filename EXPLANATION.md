# EXPLANATION.md

## 1. How I Approached the Implementation

I started by understanding the core requirement: tasks need two distinct actors — someone who assigns and someone who receives. I built around that relationship first, then layered the endpoints on top.

I set up NestJS with Prisma and PostgreSQL, defined the schema, ran the migration, then built outward: DTOs for validation, service for business logic, controller for routing. One concern at a time.

---

## 2. Why I Structured the Code the Way I Did

I separated concerns deliberately:

- **DTOs** handle what comes in — they reject bad data before it reaches the service
- **Service** handles what happens — all business rules and database queries live here
- **Controller** handles routing only — it extracts data from the request and passes it down

This makes each layer easy to read, test, and change independently. The `PrismaModule` is kept separate and exported so any future module can use the database without duplicating setup.

---

## 3. Assumptions Made

- There is no authentication system. User identity is passed via the `x-user-id` header and trusted as-is.
- A user can assign a task to themselves (no restriction on `assignedTo === assignedBy`).
- Priority is a free string validated to `low`, `medium`, or `high` — not stored as a database enum to keep the schema flexible.
- Status can only move forward logically, but no strict transition enforcement was implemented (e.g. you can jump from `pending` to `completed` directly).
- The `assignedTo` field is nullable — a task without an assignee is valid.

---

## 4. What I Would Improve Given More Time

- **Swagger/OpenAPI documentation** — document every endpoint, request body, and response schema so the API is self-describing and easy to test without Postman setup
- **Authentication** — replace the `x-user-id` header with proper JWT-based auth
- **Strict status transitions** — enforce that status can only move in a defined order (`pending → in_progress → completed`), not arbitrarily
- **Pagination** — add `limit` and `offset` to `GET /tasks` to handle large datasets
- **Unit and integration tests** — cover the service layer with Jest tests, especially the permission logic

---

## 5. Tools and AI Assistance Used

- **ChatGPT** and **Claude AI** were used during development for guidance on NestJS patterns, Prisma syntax, and structuring the service layer.
- All code was reviewed and understood before being used. I can explain every line.
- **Prisma documentation** was referenced for schema definition and migration commands.
- **NestJS documentation** was referenced for module structure and validation setup.