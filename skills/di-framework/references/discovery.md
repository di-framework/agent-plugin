# Documentation lookup

The `@di-framework/plugin` MCP server exposes documentation tools. Call them on the `di-framework` server. Do not guess a page body when a tool result is available.

| Tool | When |
| --- | --- |
| `di_search_docs` | Semantic search. Required: `query`. Optional: `version`, `projectPath`, `maxHits` (1–50, default 5). |
| `di_window` | Expand a hit. Required: `topic`, `cursor`. Optional: `radius` (0–5, default 1), `version`, `projectPath`. |

Pass `projectPath` as the absolute directory of the app being edited so resolution uses that lockfile. Pass the same `version` to `di_window` that the search hit reports (`window.version`). 6.0.3 maps to the `v6.0` snapshot at <https://docs.di-framework.dev/v6.0/>. Check the returned provenance. If that version is missing, read the tagged package source and README. Do not treat `latest` as compatible with the lockfile.

`cursor` is the section slug, chunk id, or index from the hit (`property-injection`, `docs_events__subscribers`, `"0"`). `topic` is the page slug (`quick-start`, `events`, `http-router`, `repositories`, `actors`, `codegen`, `graphql`, `platform`, `backing-services`, `tsc`, `best-practices`, `advanced-usage`, `ai-utils`, `cli`).

Unversioned pages such as <https://docs.di-framework.dev/platform.html> are the current site. Use them only after the tool says the resolved version is `latest`, or when the sibling docs checkout is the explicit source for an unpublished section.

Other MCP tools on the same server are not documentation: `di_scaffold_provider`, `di_inspect_graph`, and `di_validate_tokens`. Scaffold and graph limits are covered in [diagnostics.md](diagnostics.md); registration behavior is in [composition.md](composition.md).

Working examples are listed below. Installed types override narrative guidance where they disagree.

## Examples repository

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

When the example and the installed package disagree, the resolved package types win. Use `di_search_docs` as described above for narrative guidance matching that version.
