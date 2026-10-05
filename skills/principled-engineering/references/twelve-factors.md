# Twelve-Factor App (distilled)

Adapted from the Wikipedia article "Twelve-Factor App methodology", CC BY-SA 4.0 (see
../LICENSE.md). Methodology by Adam Wiggins and Heroku developers, c. 2011, for building
software-as-a-service apps that are portable and resilient. Widely cited as a baseline to adapt or
extend; critics note it is shaped by Heroku's platform.

| # | Factor | Rule | In practice |
| --- | --- | --- | --- |
| I | Codebase | One codebase in version control, many deploys. | One repo per app; shared code becomes a versioned library. |
| II | Dependencies | Declare and isolate all dependencies; no implicit system tools. | Lockfile plus virtualenv/container; runs on a clean machine after one install step. |
| III | Config | Deploy-varying config lives in the environment. | Credentials, hostnames, flags in env vars; the repo could be open-sourced without leaking a secret. |
| IV | Backing services | Treat databases, queues, caches, APIs as attached resources. | Swapping local for managed Postgres changes only a URL. |
| V | Build, release, run | Strictly separate the three stages. | Build an artifact; release = artifact + config with an ID; run from a release; roll back by pointing at an older release. |
| VI | Processes | Stateless, share-nothing processes; state in backing services. | No sticky sessions, no in-memory cache across requests, no local disk as a store. |
| VII | Port binding | Export the service by binding a port. | Listen on `$PORT` with an embedded server; a router forwards traffic. |
| VIII | Concurrency | Scale out via the process model. | Process types (web, worker, scheduler) scaled independently under the platform's manager; no daemonising or PID files. |
| IX | Disposability | Fast startup, graceful shutdown. | Seconds to start; on `SIGTERM` finish in-flight work or return jobs to the queue; jobs idempotent. |
| X | Dev/prod parity | Keep environments as similar as possible. | Same backing service types and versions everywhere; deploy hours after writing; authors deploy. |
| XI | Logs | Treat logs as event streams. | Unbuffered to stdout, one event per line (JSON ideal); the platform routes and stores. |
| XII | Admin processes | Run one-off tasks as processes in the same release. | Migrations and consoles ship with the release, use the same config, live in the repo. |
