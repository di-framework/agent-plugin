# AI libraries

The `di-framework/ai` repository publishes three surfaces. The inspected sibling checkout
is workspace **6.0.2**. Inspect the target's resolved versions; `@di-framework/ai`
and `@di-framework/ai-utils` peer on `@di-framework/core` and `@di-framework/auth`
**^5**, while those AI packages themselves are 6.x. Do not bump the peers to 6
to match the AI package number.

| Path | Package | Role |
| --- | --- | --- |
| `packages/ai` | `@di-framework/ai` | Chat, providers, tools, memory, RAG, MCP, workflows, A2A |
| `packages/ai-utils` | `@di-framework/ai-utils` | Agent Skills, instruction discovery, file and shell tools |
| `packages/ml` | `di-ml` and `@di-framework/ml` | ONNX trainer and the TypeScript inference session |

`di-framework ai` is the CLI extension in `cli-extensions`, not a script in this
repo. Read [toolchain.md](toolchain.md) for that command tree. Chat, RAG, and
agent edits stay in `packages/ai` and `packages/ai-utils`. Before editing the
trainer, the `di-ml` CLI, or `@di-framework/ml`, read `packages/ml/AGENTS.md`
and the matching `.agents/skills/<name>/SKILL.md`.

Both TypeScript packages export source. Examples run with Bun. Set
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` only when calling a real provider.
`createChatModel()` reads `PROVIDER`, `AUTH`, and optional `MODEL`.

## Application APIs

Prefer the factories already used by the app. Imperative clients use
`ChatClient` and `createChatModel` or `OpenAiChatModel` / `AnthropicChatModel`.
Annotation clients use `configureAi`, `@AiService`, `@Agent`, `@Tool`, and
`@ToolSet`. Parameter decorators are factories: `@UserMessageAnn()`,
`@MemoryId()`, `@ToolParam()`. Names that collide with runtime types are
exported with an `Ann` suffix (`SystemMessageAnn`, `ChatModelAnn`, and the
others listed in `packages/ai/README.md`).

Tools use `functionToolCallback` with a JSON Schema, or `@Tool` methods on a
bean passed to `configureAi({ toolBeans })`. `ChatAgent` plus
`MessageWindowChatMemory` keeps an in-process window; pass a stable
`conversationId` per conversation.

`ContextCompressionAdvisor` needs an application `TokenCounter` and
`ContextCompressor`. The package does not estimate tokens or call a hidden model.
`FakeChatModel` and `ScriptedChatModel` cover tests. Do not call a provider
from a unit test.

Agent Skills, jailed file tools, instruction discovery, index search, and repository migration plans are covered below.

## di-ml

`di-ml` fine-tunes an ONNX graph from a directory workspace. It is not ONNX
Runtime on-device training. Commands are `di-ml init [dir]` and
`di-ml <workspace>` only. Train takes no extra flags. Outputs go to
`<workspace>/dist/`. One Accel backend is chosen at process start with
`DI_ML_ACCEL=cpu|metal|auto`. Graph code must not `cfg` on Metal or CUDA.
Embedding losses sit after ONNX outputs. Exit status is `0` success, `2` usage,
`3` failure.

`npm install @di-framework/ml` installs the TypeScript session (`0.1.0` on
`latest`). The trainer binary is a platform-suffixed prerelease, for example
`@di-framework/ml@6.0.1-darwin-aarch64`. From the ai repository:
`cargo run -p di-ml-cli -- <workspace>`.

## Repository checks

From the ai repository:

```sh
bun install
bun test
bun run typecheck
bun run lint
```

Package tests: `bun test packages/ai/tests` or `bun test packages/ai-utils/tests`.
Trainer changes also need `cargo test` and `bun test` in `packages/ml/infer`.
Follow `.agents/skills/verify-di-ml/SKILL.md` before calling a trainer change
verified. `packages/ml/docs/eval.md` describes the capability scorecard.

## Agents (`@di-framework/ai-utils`)

`@di-framework/ai-utils` loads `SKILL.md` catalogs and jailed tools inside your process. CLI `di-framework ai` comes from the extension in [toolchain.md](toolchain.md). Guide: <https://docs.di-framework.dev/ai-utils.html>. Examples: `examples/framework/ai-skills`, `ai-skills-scale`, `ai-plugins`.

AI-utils 6.0.2 additionally peers on `@di-framework/ai` **^6**; keep the core/auth **^5** distinction described above. Test agents with `FakeChatModel` or `ScriptedChatModel`.

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
