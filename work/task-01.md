# Task 01 — Worker Kind + Execution Mode (Config/Schema/Types)

## Goal

Introduce a user-configurable definition of each worker as:

- `kind: "server"` — spawned `opencode serve` (current default)
- `kind: "agent"` — in-process worker using OpenCode client sessions (current `backend:"agent"` behavior)
- `kind: "subagent"` — in-process worker whose session is a **child** session of the parent (new)

Also introduce a per-worker execution mode:

- `execution: "foreground" | "background"`

And a workflow UX policy (task-03 consumes this):

- `workflows.ui.execution: "step" | "auto"`
- `workflows.ui.intervene: "never" | "on-warning" | "on-error" | "always"`

## Before

- Worker profiles support `backend?: "server" | "agent"` only.
- No formal concept of “subagent” (child session) exists in config/types/schema.
- Workflows exist, but determinism/pausing/intervention is not a first-class configurable UX policy.

## After

- Worker profiles accept `kind` and `execution`.
- `backend` remains supported and maps to `kind` (compatibility layer):
  - `backend:"server"` → `kind:"server"`
  - `backend:"agent"` → `kind:"agent"`
  - If both are specified and conflict, config parsing fails with a clear error.
- A new workflow UX policy is parsed and validated (no behavior changes yet; task-03 will implement it).

## Files affected (planned)

- `packages/orchestrator/src/types/index.ts`
- `packages/orchestrator/src/config/orchestrator.ts`
- `packages/orchestrator/schema/orchestrator.schema.json`
- `packages/orchestrator/test/unit/orchestrator-config.test.ts`
- `docs/architecture.md` (terminology update)
- `docs/prompts.md` or `docs/standards.md` (document new terms; ensure “skill” naming stays correct)

## Data structures (planned)

### TypeScript

- Add:
  - `export type WorkerKind = "server" | "agent" | "subagent"`
  - `export type WorkerExecution = "foreground" | "background"`
- Extend `WorkerProfile`:
  - `kind?: WorkerKind`
  - `execution?: WorkerExecution`
  - (keep) `backend?: WorkerBackend` for backwards compatibility (deprecated in docs, still parsed)
- Extend `OrchestratorConfig.workflows` with:
  - `ui?: { execution?: "step" | "auto"; intervene?: "never" | "on-warning" | "on-error" | "always" }`

### JSON config (example)

```json
{
  "profiles": [
    { "id": "docs", "kind": "subagent", "execution": "foreground" },
    { "id": "coder", "kind": "subagent", "execution": "background" },
    { "id": "vision", "kind": "server", "execution": "background" }
  ],
  "workflows": {
    "ui": { "execution": "step", "intervene": "on-error" }
  }
}
```

## System diagram (config ownership after task-01)

```mermaid
flowchart LR
  CFG[.opencode/orchestrator.json\n(worker profiles)] --> PARSE[Config parser]
  PARSE --> TYPES[Typed OrchestratorConfig]
  TYPES --> RUNTIME[Worker pool + workflow engine]
  OPEN[OpenCode config\n(opencode.json)] -->|unchanged here| RUNTIME
```

## Standards to abide by

- Backwards compatible: existing `backend` configs must keep working unchanged.
- Parsing must be strict: unknown keys are rejected where schema says `additionalProperties:false`.
- Terminology: “worker profile” != “skill”.
- Tests required for behavior changes to parsing/validation.

## Testing plan

- Extend `packages/orchestrator/test/unit/orchestrator-config.test.ts`:
  - `kind` accepted for profiles/workers entries.
  - `execution` accepted and defaults correctly.
  - `backend` still works and maps correctly.
  - conflicting `backend` vs `kind` fails.
  - `workflows.ui` validates.

## Definition of done

- Schema updated and validates new fields.
- Parser updated and returns typed config with new fields normalized.
- Unit tests added/updated and passing.

## Branching

- Create branch: `feat/workflow-subagents-task-01`
- Merge to main only after QC commands pass:
  - `bun run lint && bun run typecheck && bun run test:plugin && bun run build:plugin`

