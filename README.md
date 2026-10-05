# @di-framework/plugin

Official Agent Plugin and Model Context Protocol (MCP) Server for **`di-framework`**.

Equips AI coding assistants with deep knowledge of `di-framework`, version-scoped semantic documentation search, section context expansion, architectural conventions, and diagnostic tools.

---

## Supported Coding Agents

The installer supports **Cursor**, **Claude Code**, **Codex**, and **Grok**. It writes Cursor and Claude Code MCP configuration in their documented locations and registers Codex and Grok stdio servers in their TOML configuration. Other stdio MCP clients can use the manual command below; automatic installation for Claude Desktop, Junie, Hermes, Gemini CLI, and Antigravity is not implemented.

| Agent | Project configuration | User configuration (`--global`) |
| --- | --- | --- |
| Cursor | `.cursor/mcp.json` | `~/.cursor/mcp.json` |
| Claude Code | `.mcp.json` | `~/.claude.json` |
| Codex | `.codex/config.toml` | `~/.codex/config.toml` |
| Grok | `.grok/config.toml` | `~/.grok/config.toml` |

Both skills and their complete resources are installed for every selected agent:

| Agent | Project skills | User skills (`--global`) |
| --- | --- | --- |
| Cursor | `.cursor/skills` | `~/.cursor/skills` |
| Claude Code | `.claude/skills` | `~/.claude/skills` |
| Codex | `.agents/skills` | `~/.agents/skills` |
| Grok | `.grok/skills` | `~/.grok/skills` |

Cursor paths follow its [current skills documentation](https://cursor.com/docs/skills).
Project Cursor installs also write `.cursor/rules/di-framework.mdc`; global Cursor
rules are not installed. Grok rules go to `.grok/rules/di-framework.md` in either
scope. Claude Code may require approval of project MCP servers; Grok loads project
configuration after the folder is trusted.

---

## What's Included

- **Documentation tools:** `di_search_docs` resolves the target project's installed framework version (with provenance), and `di_window` expands a matching section using the same version. Missing or ambiguous version information is reported; remote endpoint fallback does not silently change the requested version.
- **Workflow guidance and scaffolding:** Distributed rules guide inspect → design → implement → verify → deliver, with task-specific framework details in the skills. `di_scaffold_provider` generates a `@Container()` service class; pass the target's resolved `frameworkVersion`. Supported scaffold versions are 6.0.3 and 6.0.1.
- **Diagnostics:** `di_inspect_graph` inspects supported source patterns and reports incomplete analysis for unsupported constructs. `di_validate_tokens` checks caller-supplied registration assertions only. Runtime resolution tests remain necessary.
- **Installer:** Merges supported agent MCP settings and distributes the bundled rules and skills.

| Skill | Tasks |
| --- | --- |
| [`di-framework`](skills/di-framework/SKILL.md) | Inspect → design → implement → verify → deliver; framework apps, transports, data, actors, AI, toolchain, and platform |
| [`principled-engineering`](skills/principled-engineering/SKILL.md) | Independent umbrella for design calibration, naming, SOLID, boundary test doubles, and Twelve-Factor practices |

The framework entry point loads only the resources relevant to the request: discovery,
bootstrap, diagnostics, composition, architecture, HTTP, static sites, GraphQL, codegen,
RPC, persistence, actors, AI, toolchain, testing, quality/CI, platform, and kube.
Runnable examples live in its `examples/`, starters and templates in `assets/`, and the
coverage helper in `scripts/`. Engineering references retain their original metadata
and [license attribution](skills/principled-engineering/LICENSE.md).

Bundled application examples target **6.0.3**; other releases require verification
against their declarations and tagged source. The inspected AI 6.0.2 packages peer
on core/auth **^5**. Platform 6.0.2 and CLI extensions 6.0.4 version independently;
inspect those installed versions separately. The 6.0.3 application CLI does not
register the `agent` or `skills` groups still listed in its README; use the `ai`
extension. Deployment runs only within the requested task.

`bun run check:examples` typechecks and executes the bundled DI, HTTP authentication/authorization, repository, and RPC examples, and runs the skill asset tests (HTTP service starter, feature test template, sample feature slice, static site), against pinned published packages. Generated scaffolds are separately compiled and tested for singleton/transient identity. These native tests do not run platform component builds or infrastructure deployments; the platform resource describes verification in the target environment.

---

## Installation

### In a Project Workspace (Recommended)
Detects Cursor (`.cursor` or `.cursorrules`), Claude Code (`.claude` or `.mcp.json`), Codex (`.codex`), and Grok (`.grok`) in your workspace. If none is present, select an agent explicitly:

```bash
npx @di-framework/plugin install
# or
bunx @di-framework/plugin install
```

### Target a Specific Agent
```bash
npx @di-framework/plugin install --agent cursor
npx @di-framework/plugin install --agent claude
npx @di-framework/plugin install --agent codex
npx @di-framework/plugin install --agent grok
npx @di-framework/plugin install --agent all
```

### Globally (Machine-Wide)
```bash
npx @di-framework/plugin install --global --agent cursor
```

The installer copies a bundled runtime, rules, and skills into `.di-framework/plugin` (or `~/.di-framework/plugin` for user installs). Registrations launch that durable CLI with `serve` using the installing Node/Bun executable, so deleting an `npx` cache does not break them. Keep that runtime executable installed; rerun installation after moving the workspace or replacing its runtime. Generated absolute paths are machine-specific.

Existing unrelated settings, servers, and skills are preserved. All configurations,
asset copies, and legacy archives are planned and validated before mutation. Invalid
or unreadable JSON/TOML and unsupported inline TOML `mcp_servers` representations
abort without writes. `--dry-run` previews configuration merges, copies, and archives
without creating files. `update` repeats the merge without duplicate registrations;
select a runner version with `npx -y @di-framework/plugin@<version> update --agent all`.

The exact 26 retired framework directories are listed in
[`bin/assets.ts`](bin/assets.ts). Complete matching folders, including user edits,
are moved from the durable runtime and selected agent destinations to
`<base>/.di-framework/skill-archives/<unique-batch>/<target>/<skill-name>`.
Targets are `runtime`, `cursor`, `claude`, `codex`, and `grok`; previous archive batches
are never overwritten. Unrelated skills, including similarly prefixed custom names,
stay in place. A repeat update creates no archive unless a retired folder reappears.
Updates launched from the durable runtime skip copies onto the same source and exclude
retired folders from redistribution. Only the plugin’s bundled skills are redistributed;
custom additions to the runtime stay there and cannot overwrite agent-owned skills. Invoke `di-framework` for tasks previously served
by an old skill name.

Installation initializes the copied MCP server and verifies discovery of all five tools before saving configurations. To repeat this check:

```bash
npx -y @di-framework/plugin check
# For a user install:
npx -y @di-framework/plugin check --global
```

The check verifies protocol startup and tool discovery, not remote documentation-service availability or tool results.

---

## MCP Server Manual Configuration

If your environment uses a manual MCP client configuration:

```json
{
  "mcpServers": {
    "di-framework": {
      "command": "npx",
      "args": ["-y", "@di-framework/plugin@latest", "serve"]
    }
  }
}
```

`serve` is required: invoking the CLI without a command displays help. For Bun, the equivalent is `bunx @di-framework/plugin serve`.

### Tested scope

`bun test` covers safe configuration merging, including permission failures. After `bun run build`, `bun test/packed-smoke.ts` packs the publishable artifact and checks MCP initialization and tool discovery under Node and Bun, generated adapter configurations, dry-run, invalid configurations, edited legacy migration, archive preservation, complete resource delivery to all four agents, repeat installation, and startup and updates from the durable runtime after deleting the source package. It also exercises `npx` with the packed artifact and deletes its cache before checking the installed server. These are protocol/configuration checks; interactive Cursor, Claude Code, Codex, and Grok UI discovery has not been automated.

---

## License

Dual-licensed under either Apache-2.0 or MIT at your option.
Bundled engineering reference material has its own
[license and attribution](skills/principled-engineering/LICENSE.md).

## Validation and supported runtimes

Development and CI use Bun 1.4.2. The bundled MCP server supports Node 20 or newer
and Bun 1.4.2 or newer; CI tests packed startup on Node 20, 22 and 24 plus Bun.
Framework examples target the exact 6.0.3 packages pinned in the lockfile.

```bash
bun install --frozen-lockfile
bun run check
bun run smoke:package
```

`check` typechecks source, CLI, tests and examples, builds the published entrypoints,
and runs the fixture and framework behavior tests. Core tests do not contact the
live documentation service. The packed smoke additionally requires npm registry
access for its isolated `npx` install. It verifies the tarball, durable installations
and MCP protocol startup. No live documentation smoke or infrastructure deployment
is part of these checks.

Pull requests run the Node matrix. Tagged releases depend on that same validation
and recheck the versioned artifacts before publication. Manual workflow runs without
a version tag validate only and cannot publish.
