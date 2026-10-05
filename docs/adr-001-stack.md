# ADR 001: Keep the first StudyNow architecture inside one process

## Status

Accepted for Crit 8. Revisit when real-time fan-out or write contention becomes
measurable rather than hypothetical.

## Context

The course deployment provides one 256 MB Fly machine and one persistent volume
mounted at `/data`. Crit 8 requires a stranger to complete the core interaction
and find its trace after reloads, restarts and redeploys. Later crits add
real-time delivery and server-side observability.

## Options considered

1. Astro SSR with SQLite on the Fly volume.
2. A client-side React application with an Express API and SQLite.
3. A managed database or hosted backend beside the Fly application.

Option 2 adds a second rendering and state boundary before StudyNow has a need
for client-owned state. Option 3 conflicts with the supplied one-machine,
one-volume deployment shape and would make local verification less faithful.

## Decision

Use Astro's Node adapter for server-rendered pages and form endpoints, with
`better-sqlite3` as the persistent source of truth. Core actions must work
without browser JavaScript. Add server-sent events inside the same process for
Crit 9 unless measurement shows that this cannot deliver updates within the
brief's one-second window.

## Consequences

The app has one deployable unit, one permission boundary and a database that is
easy to inspect and back up. WAL mode and a busy timeout make small concurrent
bursts reasonable. The design does not support horizontal replicas sharing the
same file, and CPU-heavy model work must not block request handling. If the
project outgrows those limits, a later ADR must identify the observed failure
and justify a replacement rather than switching for theoretical scale.
