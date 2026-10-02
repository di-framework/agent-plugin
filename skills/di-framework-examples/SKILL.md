---
name: di-framework-examples
description: Find di-framework usage patterns in the examples repository. Use when the user asks for a sample, a working reference, or how an example app wires a feature.
---

# Examples repository

Samples live in the `examples` repo (`di-framework/examples` in this workspace, <https://github.com/di-framework/examples>). They depend on published `@di-framework/*` packages. Read the nearest `README.md` and the example's `package.json` before copying an API. Ignore `node_modules`, `dist`, and `.di-framework`.

| Tree | Look here for |
| --- | --- |
| `framework/basic`, `services`, `advanced` | Container, features, composition |
| `framework/http-router` | `TypedRouter` routes |
| `framework/graphql` | `@di-framework/graphql` portals and types |
| `framework/auth`, `authz` | Authentication and resource policies |
| `framework/config` | `@di-framework/config` |
| `framework/events` | `@di-framework/events` |
| `framework/counter-actor` | Local `@di-framework/actors` |
| `framework/ai-chat` | `@di-framework/ai` chat client |
| `framework/ai-skills`, `ai-skills-scale`, `ai-plugins` | `@di-framework/ai-utils` skills, indexes, plugins |
| `framework/cf-worker`, `deno-http`, `deno-sandboxes` | Non-Bun runtimes |
| `platform/kube-apps` | wasmCloud bindings, postgres, schema-migrations, actors, cron, queues |
| `platform/wasmcloud-actor-counter` | Actors inside a component (`"actors": true`) |
| `platform/plugin-workspace` | `di-framework platform` deploy manifest |
| `platform/receipt-worker`, `scheduled-worker`, `checkout-inventory`, `warehouse` | Workers, schedules, multi-service platform apps |
| `adapters/` | Foreign-platform adapters (Cloud Foundry when present) |
| `agents/` | Larger agent apps (legal, ml-researcher, tui, baseball) |

Match the question to one example, then read its `src/` entry, `di-framework.config.json` when present, and tests. Do not treat a kube smoke app as the portable pattern when `framework/` already shows the same API on Bun.

When the example and the installed package disagree, the resolved package types win. Use `di_search_docs` (see `di-framework-docs`) for the narrative that matches that version.
