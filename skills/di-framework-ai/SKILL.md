---
name: di-framework-ai
description: Build chat clients, tools, memory, retrieval, MCP, and agents, or train an ONNX workspace with di-ml. Use for @di-framework/ai, @di-framework/ai-utils, @di-framework/ml, the di-ml CLI, or the ai repository.
---

# AI libraries

The `di-framework/ai` repository publishes three surfaces. The sibling checkout
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
repo. Read the `di-framework-cli-extensions` skill for that command tree. Chat, RAG, and
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

Agent Skills, jailed file tools, instruction discovery, index search, and
plan-before-apply repository migrations are the `di-framework-ai-utils` skill.

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
