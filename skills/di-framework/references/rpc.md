# RPC contracts and consumers

Inspect resolved core/rpc versions, the lockfile, compiler decorators, and transport configuration. Bundled examples support **6.0.3**; use [discovery.md](discovery.md) for other releases.


Read [rpc.ts](../examples/rpc.ts) for decorated request/reply messages, a typed service,
a memory server/client round trip and batch. Enable `experimentalDecorators`; field
numbers/types and method input/output factories supply the runtime schema. Preserve
existing field numbers when evolving a contract. A type-only client requires an explicit
service path because TypeScript generics disappear at runtime.

The published 6.0.3 RPC root imports its protobuf/Connect peers even for the memory
example. The tested set includes `@bufbuild/protobuf@2.15.0`,
`@connectrpc/connect@2.2.0`, and `@connectrpc/connect-node@2.2.0`. A missing peer is a
package loading problem, not a failed dependency registration.

Consult the [RPC guide](https://github.com/di-framework/di-framework/blob/v6.0.3/packages/di-framework-rpc/README.md)
when replacing memory with `/http`, `/grpc`, or `/socket` transports. Verify the installed
transport's peers/configuration. Test network routing, serialization failures,
timeouts/cancellation, auth interceptors and application errors for the chosen transport.
Stop servers/transports after tests. A memory round trip establishes contract wiring,
not deployment connectivity or authentication.

Run all bundled examples with `bun run check:examples` from the plugin checkout. Keep
application tests runnable with the project's existing test command after adaptation.
