# Task 3: Basic System Thinking

---

## 1. Scaling

### What problems might occur if the Task API receives thousands of requests per minute?

---

### Problem 1: Database Overload

The most immediate bottleneck will be the PostgreSQL database. Every API call — fetching tasks, creating them, updating status — hits the database. With thousands of requests per minute, the database will struggle to handle that many concurrent connections and queries simultaneously.

Prisma uses a connection pool under the hood, but PostgreSQL has a hard limit on how many connections it can hold open at once (typically 100 by default). When that pool is exhausted, new requests will queue up or fail entirely with a connection timeout error.

This gets worse for write-heavy operations like `create`, `update`, and `delete`, which require exclusive locks on rows and can cause queries to block each other.

---

### Problem 2: A Single Server Becomes a Single Point of Failure

Currently the API runs as a single NestJS process on one server. If that server receives more traffic than it can handle, response times will spike and the process may crash entirely — taking down the entire API.

Even before it crashes, a single Node.js process is limited to one CPU core by default (due to Node's single-threaded event loop). This means CPU-bound tasks will create a processing bottleneck, and the server cannot take advantage of multi-core machines without additional configuration.

If this one server goes down for any reason — a crash, a deployment, a hardware failure — the entire API is unavailable. There is no fallback.

---

### Problem 3: No Rate Limiting — API is Open to Abuse

Without rate limiting, a single client (or a bad actor) can send thousands of requests per second, consuming all available server resources and starving out legitimate users. This is known as a resource exhaustion attack, and it doesn't even need to be malicious — a misconfigured client in a loop can cause the same effect.

Since our API currently identifies users by a simple `x-user-id` header (which anyone can set to any value), there is no friction stopping a user from hammering endpoints repeatedly.

---

### Problem 4: No Caching — Repeated Reads Hit the Database Every Time

`GET /tasks` is likely the most frequently called endpoint. Every call to it currently goes directly to PostgreSQL. If 500 users refresh their task list every few seconds, that is hundreds of identical (or near-identical) database reads per minute — many of which return the same data.

Without a caching layer, the database does redundant work constantly, even when the underlying data has not changed.

---

## 2. Performance Improvements

### Technique 1: Add a Caching Layer (Redis)

Introduce Redis as an in-memory cache for frequently read data. When `GET /tasks` is called, check Redis first. If the data is there and still fresh (TTL not expired), return it immediately without touching the database. Only query PostgreSQL on a cache miss, then store the result in Redis for subsequent requests.

This dramatically reduces database load for read-heavy traffic, since memory reads are orders of magnitude faster than disk-backed database queries.

Cache invalidation strategy: whenever a task is created, updated, or deleted, clear or update the relevant cache keys so stale data is never served.

---

### Technique 2: Database Indexing

Right now, Prisma queries the `Task` table without any indexes beyond the primary key (`id`). When filtering tasks with `GET /tasks?assignedTo=2&status=pending`, PostgreSQL performs a full table scan — it reads every row to find matches.

Adding database indexes on the columns most commonly used in `WHERE` clauses makes these lookups dramatically faster:

```sql
-- In your Prisma schema, add:
@@index([assignedTo])
@@index([status])
@@index([assignedBy])
```

Indexes matter most as the table grows. At 100 rows the difference is invisible. At 1 million rows, an unindexed query can be 100x slower.

---

### Technique 3: Horizontal Scaling with a Load Balancer

Instead of running one instance of the API, run multiple instances (on the same or different machines) behind a load balancer (e.g. Nginx or AWS ALB). The load balancer distributes incoming requests across all instances, so no single process is overwhelmed.

NestJS applications are stateless by design (no session data stored in memory between requests), which makes this straightforward — any instance can handle any request.

This also eliminates the single point of failure: if one instance crashes, the load balancer routes traffic to the healthy ones automatically.

---

### Technique 4: Rate Limiting

Add rate limiting middleware at the API gateway or directly in NestJS (using `@nestjs/throttler`) to cap how many requests a single client can make within a time window. For example: a maximum of 100 requests per minute per user ID or IP address.

This protects the API from both accidental abuse (runaway clients) and intentional attacks, and ensures fair resource distribution across all users.

---

### Technique 5: Pagination for List Endpoints

`GET /tasks` currently returns all matching tasks in a single response. As the dataset grows, this response can become enormous — slow to query, slow to serialize, and slow to transmit.

Add `limit` and `offset` (or cursor-based) pagination so clients only fetch what they need:

```
GET /tasks?status=pending&limit=20&offset=0
```

This keeps query times predictable regardless of how large the table grows.

---

## 3. Production Monitoring

### Response Time (Latency)

Track p50, p95, and p99 response times for each endpoint. The average (p50) tells you what a typical user experiences. The p95 and p99 tell you what your slowest users experience — these outliers often reveal real problems like slow queries or resource contention that averages hide.

**Alert threshold:** If p95 response time exceeds 500ms consistently, investigate immediately.

---

### Error Rate

Monitor the percentage of requests returning `4xx` and `5xx` status codes. A sudden spike in `500` errors typically means a deployment broke something or the database is unreachable. A spike in `403` errors might indicate someone is probing the API with incorrect user IDs.

Track these separately — `4xx` errors are usually client mistakes, `5xx` errors are your problem.

**Alert threshold:** If the `5xx` error rate exceeds 1% of total requests, trigger an alert.

---

### Database Performance

Monitor:
- **Query execution time** — slow queries (anything over 100ms) should be logged and investigated. Prisma supports query logging out of the box.
- **Active connections** — if the connection pool is consistently maxed out, it is a sign the database cannot keep up with traffic.
- **Deadlocks and lock wait time** — a surge in locks suggests write contention between concurrent requests.

---

### CPU and Memory Usage

A Node.js process that is consistently running at 80%+ CPU is a signal that it is approaching its processing limit. Memory that grows continuously without dropping is a sign of a memory leak — the process will eventually crash.

Monitor both per-instance and across the entire fleet. If all instances are pegged simultaneously, it is a traffic problem. If only one is, it may be a code or configuration issue on that machine.

---

### Throughput (Requests Per Minute)

Track total requests per minute across all endpoints. This gives you a baseline of normal traffic patterns, which makes anomalies easy to spot. A sudden 10x spike in traffic might mean you've gone viral — or that something is stuck in a retry loop.

---

### Uptime / Health Check

Expose a `GET /health` endpoint that returns `200 OK` when the server is running and connected to the database. Use an external monitoring tool (e.g. UptimeRobot, Datadog, or AWS CloudWatch) to ping this endpoint every minute. If it fails to respond, trigger an alert immediately.

This is the simplest and most important monitor — it tells you whether your API is alive at all.

---

### Summary Table

| Metric | What It Tells You | Alert When... |
|--------|-------------------|---------------|
| p95 Response Time | How slow your worst-case users experience the API | > 500ms sustained |
| 5xx Error Rate | Something is broken server-side | > 1% of requests |
| Database Query Time | Whether queries are slow or unindexed | Any query > 100ms |
| DB Connection Pool Usage | Whether the DB can keep up with demand | > 80% of pool used |
| CPU Usage | Whether the server is approaching capacity | > 80% sustained |
| Memory Usage | Whether there is a memory leak | Continuously growing |
| Requests Per Minute | Normal traffic baseline and anomaly detection | Sudden unexplained spikes |
| Health Check Uptime | Whether the API is alive | Any failed ping |
