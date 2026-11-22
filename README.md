# Flock

Persistent, programmable Pi agents with distinct personalities, accessible from any client.

Flock is in the design stage. This repository records the intended architecture; it does not yet contain an implementation.

## Goals

- Declare agents in TypeScript: model, instructions, personality, permitted tools, extensions, triggers, and lifecycle behavior.
- Run agents locally and on Cloudflare, with one Durable Object per persistent cloud agent instance.
- Keep agents independent of their clients. Disconnecting a terminal or app must not end the agent's work.
- Preserve the behavior of the existing `pi-extensions` setup rather than silently dropping extensions in the cloud.
- Give each agent an email address using Cloudflare Email Routing and Email Sending.
- Let agents author tools and modify their own behavior through versioned, inspectable changes.
- Support multiple personalities and an eventual iOS companion app, inspired by Grok-style character interactions.

Transferring an existing local session to the cloud is deferred. Local execution remains a goal, but session migration is not part of the first implementation.

## Agent model

**Definition:** TypeScript source describing an agent's initial configuration and behavior.

**Instance:** A persistent identity with an email address, memories, personality revisions, installed tool and extension versions, and conversations.

**Conversation:** A session belonging to an instance. Conversation histories stay separate; shared memory is explicit.

**Execution location:** Where the agent runs. Attaching a new client does not move execution or create a new identity.

## Backend and clients

The backend owns session history, pending inputs, approvals, execution state, and workspace revisions. Terminal, web, and eventual iOS clients use the same authenticated session protocol.

Clients need snapshots and resumable event streams, ordered mutations, and deduplicated command IDs. Pending approvals must survive disconnection. Multiple clients may observe an instance without starting competing execution loops.

A future local/cloud handoff must checkpoint state and transfer execution ownership. It must not allow both locations to execute the same work. Divergent offline histories require an explicit branch or reconciliation.

## Cloud runtime and extension compatibility

Cloudflare's Agents SDK provides `PiHarness` backed by Pi Durable, with SQLite persistence and lifecycle wake-ups. Its extension registry is not the same API as the installed Pi coding-agent extension API.

Existing extensions use Node filesystem and process APIs, Git, worker threads, macOS sandboxing, and terminal-specific integrations. Worker isolates cannot run all of these unchanged.

The runtime choice needs a compatibility prototype:

- Run Pi Durable in the agent DO and adapt extensions to portable capabilities; or
- Keep the existing Node Pi extension runtime in a Cloudflare container controlled by the agent DO, with explicit persistence and recovery integration.

Desktop-specific operations need a local companion or a supported replacement. UI rendering belongs in clients. Unsupported capabilities must be reported, not silently disabled. Arbitrary JavaScript closures and subprocesses are not portable session state.

Pin compatible Pi and Agents SDK versions. Validate session-format compatibility before upgrades or migration; do not assume a downgrade can read newer persisted state.

## Code and state

- **Agent DO:** Instance metadata, conversations, execution records, and shared agent memory.
- **Tool/resource DOs:** Independently shared or long-lived mutable tool state. Simple instance-local tool state can stay in the agent DO.
- **R2:** Large payloads and attachments where object storage is appropriate.
- **Cloudflare Artifacts:** Generated source, tools, extension bundles, and revision history.

Artifacts is Git-backed repository storage. Temporary working checkouts are allowed, but durable code checkpoints must identify revisions pushed to Artifacts. Repository management bindings do not replace Git operations for writing source.

Use `durability` for explicit tool workflows, outboxes, and lifecycle operations where appropriate. Do not wrap the entire Pi execution loop in an independent retry loop. Cloudflare Lifecycle and Durability must not independently own the same DO's physical alarm; integration or separate objects are required.

## Self-evolution

Agents may revise personality, instructions, memories, tools, and lifecycle scripts. Executable changes follow a publish process: write a revision, validate and test it, then activate it at a safe boundary. Running work retains its pinned code versions.

Keep revision history and rollback for compatible application changes. Runtime storage migrations may require rolling forward instead.

Permissions are controlled separately from agent-authored code. Self-modification must not grant additional access to secrets, storage, network destinations, or other agents. Generated tools run with explicit capabilities and resource limits.

## Email

An address belongs to the persistent instance, not to an individual run or connected client. Inbound mail enters a durable inbox with thread metadata and deduplication. Outbound mail uses a recorded delivery workflow.

Treat mail content as untrusted input, not administrative authorization. Sending is an external side effect: an uncertain outcome must be reconciled or reviewed rather than blindly retried. Verify Email Sending onboarding and recipient restrictions before enabling outbound mail.

## Initial scope

1. Define the TypeScript agent contract and validate extension compatibility with representative existing extensions.
2. Build persistent cloud instances and conversations with reconnectable client access.
3. Add tool execution, Artifacts-backed code, email, and versioned evolution incrementally.

An iOS app and existing local-session migration are later work. Avoid building migration machinery before the backend and persistence contracts are established.

## References

- [Pi harness on Cloudflare](https://developers.cloudflare.com/agents/harnesses/pi/)
- [Pi Durable extensions](https://developers.cloudflare.com/agents/harnesses/pi/extensions/)
- [Cloudflare Artifacts](https://developers.cloudflare.com/artifacts/)
- [Cloudflare Email Service](https://developers.cloudflare.com/email-service/)
- [pi-extensions](https://github.com/avenceslau/pi-extensions)
- [durability](https://github.com/avenceslau/durability)
