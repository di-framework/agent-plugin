---
name: di-framework-docs
description: Look up di-framework usage in the official docs through the plugin MCP tools. Use when an API, flag, or pattern is not settled by the local package, or when the user asks what the docs say.
---

# Documentation lookup

The `@di-framework/plugin` MCP server exposes documentation tools. Call them on the `di-framework` server. Do not guess a page body when a tool result is available.

| Tool | When |
| --- | --- |
| `di_search_docs` | Semantic search. Required: `query`. Optional: `version`, `projectPath`, `maxHits` (1–50, default 5). |
| `di_window` | Expand a hit. Required: `topic`, `cursor`. Optional: `radius` (0–5, default 1), `version`, `projectPath`. |

Pass `projectPath` as the absolute directory of the app being edited so resolution uses that lockfile. Pass the same `version` to `di_window` that the search hit reports (`window.version`). 6.0.3 maps to the `v6.0` snapshot at <https://docs.di-framework.dev/v6.0/>. Check the returned provenance. If that version is missing, read the tagged package source and README. Do not treat `latest` as compatible with the lockfile.

`cursor` is the section slug, chunk id, or index from the hit (`property-injection`, `docs_events__subscribers`, `"0"`). `topic` is the page slug (`quick-start`, `events`, `http-router`, `repositories`, `actors`, `codegen`, `graphql`, `platform`, `backing-services`, `tsc`, `best-practices`, `advanced-usage`, `ai-utils`, `cli`).

Unversioned pages such as <https://docs.di-framework.dev/platform.html> are the current site. Use them only after the tool says the resolved version is `latest`, or when the sibling docs checkout is the explicit source for an unpublished section.

Other MCP tools on the same server are not documentation: `di_scaffold_provider`, `di_inspect_graph`, and `di_validate_tokens`. Scaffold and graph rules are the `di-framework-api` skill.

Working examples are the `di-framework-examples` skill. Package skills override a doc paragraph when the installed types disagree.
