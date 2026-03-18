# Task Manager API

A RESTful backend API for managing and assigning tasks between users. Built with **NestJS**, **Prisma ORM**, and **PostgreSQL** — this API supports creating tasks, assigning them to users, updating their status, and enforcing role-based access so only the right people can perform the right actions.

---

## What It Does

This API allows you to:

- **Create tasks** with a title, priority level, and an assigned user
- **List all tasks** with optional filtering by assigned user or status
- **Update task details** (title, priority) — only the person who created/assigned the task can do this
- **Update task status** (pending → in_progress → completed) — only the person the task is assigned to can do this
- **Unassign a task** — only the assigner can remove the assignee
- **Delete a task** — only the assigner can delete it

Identity is passed via a simple request header (`x-user-id`) rather than a full auth system, keeping the focus on backend logic and API design.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [NestJS](https://nestjs.com/) (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | [Prisma](https://www.prisma.io/) |
| Validation | class-validator + class-transformer |
| Runtime | Node.js (v18+ recommended) |

---

## Project Structure

```
src/
├── prisma/
│   ├── prisma.module.ts       # Makes PrismaService available app-wide
│   └── prisma.service.ts      # Connects to the database via PrismaClient
├── tasks/
│   ├── dto/
│   │   ├── create-task.dto.ts     # Validates incoming create request body
│   │   ├── update-task.dto.ts     # Validates task update body (all fields optional)
│   │   └── update-status.dto.ts   # Validates status update body
│   ├── tasks.controller.ts        # Defines HTTP routes and extracts request data
│   ├── tasks.module.ts            # Wires together controller, service, and Prisma
│   └── tasks.service.ts           # Contains all business logic
├── app.module.ts                  # Root module
└── main.ts                        # Entry point — bootstraps the app

prisma/
└── schema.prisma                  # Database schema and Prisma config

.env                               # Environment variables (DATABASE_URL)
```

---

## How It Works

### Request Flow

```
HTTP Request
     ↓
Controller  →  extracts body, params, headers
     ↓
Service     →  validates business rules, queries database via Prisma
     ↓
Prisma      →  executes type-safe SQL against PostgreSQL
     ↓
HTTP Response
```

### Identity & Access Control

There is no JWT authentication in this project. Instead, the current user's ID is passed in the `x-user-id` HTTP header with every request. The service layer uses this to enforce two distinct roles per task:

- **Assigner** (`assignedBy`) — the user who created the task. Can update details, unassign, and delete.
- **Assignee** (`assignedTo`) — the user the task is assigned to. Can only update the task's status.

Any mismatch throws a `403 Forbidden` error.

### Task Status Flow

```
pending  →  in_progress  →  completed
```

Status values are enforced at the database level via a Prisma enum and validated in the DTO layer before reaching the service.

---

## Prerequisites

Make sure you have the following installed before setting up the project:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- [PostgreSQL](https://www.postgresql.org/) running locally (or a remote connection string)
- [NestJS CLI](https://docs.nestjs.com/cli/overview): `npm i -g @nestjs/cli`

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/Kessi-ux/backend-gt-assessment.git
cd backend-gt-assessment.git
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your environment

Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

Or create it manually and add:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/task_db"
```

> Replace `yourpassword` with your actual PostgreSQL password. Replace `task_db` with your preferred database name.

### 4. Create the database

Make sure PostgreSQL is running, then create the database manually:

```sql
CREATE DATABASE task_db;
```

Or via the command line:

```bash
psql -U postgres -c "CREATE DATABASE task_db;"
```

### 5. Run Prisma migrations

This creates all the necessary tables in your database:

```bash
npx prisma migrate dev --name init
```

### 6. Generate the Prisma client

```bash
npx prisma generate
```

### 7. Start the development server

```bash
npm run start:dev
```

The API will be running at: `http://localhost:3000`

---

## API Reference

All requests that create or modify data must include the header:

```
x-user-id: <number>
```

This represents the currently acting user.

---

### Create a Task

```
POST /tasks
```

**Headers:**
```
x-user-id: 1
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Fix login bug",
  "priority": "high",
  "assignedTo": 2
}
```

**Priority values:** `low`, `medium`, `high`

**Response `201`:**
```json
{
  "id": 1,
  "title": "Fix login bug",
  "priority": "high",
  "status": "pending",
  "assignedTo": 2,
  "assignedBy": 1,
  "createdAt": "2025-01-01T10:00:00.000Z"
}
```

---

### Get All Tasks

```
GET /tasks
```

**Optional query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignedTo` | number | Filter by assigned user ID |
| `status` | string | Filter by status (`pending`, `in_progress`, `completed`) |

**Example:**
```
GET /tasks?status=pending&assignedTo=2
```

**Response `200`:** Array of task objects.

---

### Update a Task

> Only the **assigner** can update task details.

```
PATCH /tasks/:id
```

**Headers:**
```
x-user-id: 1
```

**Body (all fields optional):**
```json
{
  "title": "Fix login bug — urgent",
  "priority": "high"
}
```

---

### Update Task Status

> Only the **assignee** can update the status.

```
PATCH /tasks/:id/status
```

**Headers:**
```
x-user-id: 2
```

**Body:**
```json
{
  "status": "in_progress"
}
```

**Status values:** `pending`, `in_progress`, `completed`

---

### Unassign a Task

> Only the **assigner** can unassign a task.

```
PATCH /tasks/:id/unassign
```

**Headers:**
```
x-user-id: 1
```

Sets `assignedTo` to `null`. No request body needed.

---

### Delete a Task

> Only the **assigner** can delete a task.

```
DELETE /tasks/:id
```

**Headers:**
```
x-user-id: 1
```

---

## Error Responses

| Status Code | Meaning |
|-------------|---------|
| `400 Bad Request` | Missing or invalid fields in the request body |
| `403 Forbidden` | User does not have permission to perform this action |
| `404 Not Found` | Task with the given ID does not exist |
| `500 Internal Server Error` | Unexpected server-side error |

**Example error response:**
```json
{
  "statusCode": 403,
  "message": "Only the assigner can update this task",
  "error": "Forbidden"
}
```

---

## Testing the API

You can use [Postman](https://www.postman.com/) or [Thunder Client](https://www.thunderclient.com/) (VS Code extension) to test the endpoints.

**Quick test sequence:**

```bash
# 1. Create a task (user 1 assigns to user 2)
POST /tasks
x-user-id: 1
Body: { "title": "Write tests", "priority": "medium", "assignedTo": 2 }

# 2. View all tasks
GET /tasks

# 3. Assignee (user 2) updates the status
PATCH /tasks/1/status
x-user-id: 2
Body: { "status": "in_progress" }

# 4. Assigner (user 1) updates the title
PATCH /tasks/1
x-user-id: 1
Body: { "title": "Write unit tests" }

# 5. Assigner (user 1) deletes the task
DELETE /tasks/1
x-user-id: 1
```

---

## Useful Prisma Commands

```bash
# Apply schema changes to the database
npx prisma migrate dev

# Regenerate the Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (visual database browser)
npx prisma studio

# Reset the database (drops all data)
npx prisma migrate reset
```
---


