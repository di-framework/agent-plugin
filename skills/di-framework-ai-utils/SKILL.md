---
name: di-framework-ai-utils
description: Build in-process agents with @di-framework/ai-utils Agent Skills, file tools, and instruction discovery. Use for SkillsAgent, SkillsToolbox, SKILL.md catalogs, AGENTS.md, .aiignore, or skill-index search.
---

# Agents (`@di-framework/ai-utils`)

This package loads `SKILL.md` catalogs and jailed tools inside your process. It is not a hosted skills API. Chat models, `@Agent`, and `@Tool` live in `@di-framework/ai`; read `di-framework-ai` for those. CLI `di-framework ai` is `@di-framework/cli-plugin-ai`; read `di-framework-cli-extensions`. Guide: <https://docs.di-framework.dev/ai-utils.html>. Examples: `examples/framework/ai-skills`, `ai-skills-scale`, `ai-plugins`.

The sibling checkout publishes **6.0.2**. Peers are `@di-framework/ai` **^6** and `@di-framework/core` **^5**. Do not bump the core peer to 6 to match the package number. The package exports TypeScript source. Examples run with Bun. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` only for a live provider call. Tests use `FakeChatModel` or `ScriptedChatModel`.

## Build

Prefer builders. Free-function aliases remain (`createSkillsAgent`, `createSkillsToolbox`, `skillsTool`).

```typescript
const agent = SkillsAgent.builder()
  .chatModel(new OpenAiChatModel({ model: 'gpt-4o-mini' }))
  .system('You help with TypeScript code review.')
  .workspace(process.cwd())
  .instructionDiscovery({ workingDirectory: 'src' })
  .aiIgnore('read-write')
  .write()
  .shell()
  .build();
```

`SkillsToolbox.builder().buildTools()` attaches the same tools to an existing `ChatClient`. `SkillsTool.builder()` builds the `Skill` tool only.

Default tools: `Skill`, `Read`, `ListDirectory`, `Glob`, `Grep`, `TodoWrite`. Opt in to `Write`/`Edit` (`.write()`), `Bash` (`.shell()`), `AskUserQuestion` (`.askUser()`), web (`.web()`), memory (`.memories()`), and nested `Task` (`.task()`). Pass `false` to `glob` / `grep` / `list` / `todos` to omit those.

File tools jail to `workspace` ∪ skill directories ∪ `extraAllowedDirectory`. After a skill with `allowed-tools` activates, other tools are denied by name. `Bash` jails `cwd` only. It is not a container. Use `confirmShell` when a person must approve each command. `WebSearch` needs `BRAVE_API_KEY` or `.web({ braveApiKey })`. `Task` subagents do not receive `AskUserQuestion` or nested `Task`.

## Discovery

Automatic roots are `<workspace>/.agents/skills` and `~/.agents/skills`. `sourceMode('merge')` (default) places explicit directories and packages first. `sourceMode('replace')` uses only those explicit sources. The first definition of a duplicate name wins.

`addPackage` reads `package.json#skills`, then `.agents/skills` and `skills` under that package. No vendor path is loaded implicitly. Folder name must match frontmatter `name`. Invalid skills fail closed. Discovery embeds `name` and `description`; activation loads the body and the skill directory.

`discoverAgentInstructions` walks `AGENTS.md` from the workspace root down to the working directory and does not walk above the workspace. `.aiIgnore('discovery' | 'read' | 'read-write')` enforces the root `.aiignore` on direct file tools.

Catalogs above the default threshold of 50 need a semantic index. Build it with `di-framework ai skills index build` (extension) or `SkillsIndex` from this package. `@huggingface/transformers` is an optional peer for the default embedder. `@di-framework/repo` is an optional peer only for `SkillSearchConnection.fromStorageAdapter`.

## Repository plans

`auditAgentConfiguration` and the migrate planner do not write. Applying a plan requires that same plan executed with `dryRun: false` (CLI: `--apply` on that invocation). Targets are neutral `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/**`, and `.aiignore`. Collisions are reported. Vendor layouts are not created. Plugin discovery (`.agents/plugins`) validates bundles and does not auto-wire MCP.
