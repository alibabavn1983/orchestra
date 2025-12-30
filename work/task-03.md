# Task 03 — Workflow-First Determinism (Step Gates + Intervene Policy)

## Goal

Make “workflow-first determinism” the default UX pattern:

- Run workflows as explicit step sequences.
- Provide configurable intervention policy and “pause points”.
- Standardize wakeups/shortcuts so users can inspect and intervene without losing the main thread.

This task is mandatory (always-on direction), and it should work across all workers.

## Before

- Workflows run, but the orchestrator does not have a unified “gate/pause/intervene” policy.
- “Background vs foreground” is ad-hoc:
  - Some async work is done via `ask_worker_async` and job registry.
  - Vision uses placeholder injection + wakeup notices.
- The user experience is not consistently deterministic step-by-step across all workers.

## After

- Workflow runner supports:
  - `execution: "step"`: run exactly one step at a time, then pause until user continues.
  - `execution: "auto"`: run all steps unless intervene policy triggers a pause.
- Intervene policy controls pausing:
  - `never`: never pause unless fatal error
  - `on-warning`: pause when a step emits a warning
  - `on-error`: pause on step error (default)
  - `always`: pause after every step
- The orchestrator injects consistent “step boundary” notices into the parent session:
  - step started
  - step finished (success/error) + duration + references
  - next action (continue, open subagent, trace, dashboard)

## Files affected (planned)

- `packages/orchestrator/src/types/index.ts`
- `packages/orchestrator/src/workflows/runner.ts`
- `packages/orchestrator/src/workflows/engine.ts`
- `packages/orchestrator/src/command/workflows.ts`
- `packages/orchestrator/src/command/workers.ts`
- `packages/orchestrator/src/command/ux.ts`
- `packages/orchestrator/src/core/jobs.ts`
- `packages/orchestrator/src/core/orchestrator-events.ts`
- `packages/orchestrator/src/ux/event-publisher.ts`
- `packages/orchestrator/src/workflows/triggers.ts` (reuse wakeup injection pattern)
- `packages/orchestrator/test/unit/workflows-engine.test.ts`
- `packages/orchestrator/test/integration/workflow-triggers.test.ts`
- `docs/architecture.md`
- `docs/prompts.md`

## Data structures (planned)

### Workflow UX policy

Add to workflow config (introduced in task-01):

```ts
type WorkflowExecutionMode = "step" | "auto";
type WorkflowIntervenePolicy = "never" | "on-warning" | "on-error" | "always";
type WorkflowUiPolicy = { execution?: WorkflowExecutionMode; intervene?: WorkflowIntervenePolicy };
```

### Step state + gating

Represent paused workflows with a stable run record:

- `runId`
- `workflowId`
- `status: "running" | "paused" | "success" | "error"`
- `currentStepIndex`
- `lastStepResult` (success/error, warning, duration, jobId)

## System diagram (step-gated loop)

```mermaid
flowchart TD
  START[run_workflow] --> STEP[Run step N]
  STEP --> EVAL{Intervene policy triggers?}
  EVAL -->|no| NEXT[Advance to step N+1]
  EVAL -->|yes| PAUSE[Pause + inject notice\n(+ commands)]
  PAUSE --> CONTINUE[User runs continue]
  CONTINUE --> NEXT
  NEXT --> DONE{more steps?}
  DONE -->|yes| STEP
  DONE -->|no| FINISH[Complete workflow]
```

## Standards to abide by

- Determinism is the default for workflows; “auto” must still be predictable and debuggable.
- Each step must be attributable:
  - worker id
  - job id (if background)
  - timestamps/duration
- Wakeup injection must be opt-out via `ui.wakeupInjection:false` (existing config).
- Do not break existing workflow triggers (vision/memory) behavior.

## Testing plan

- Unit tests:
  - step gating state machine (pause/continue)
  - intervene policy outcomes for success/warning/error
- Integration tests:
  - workflow emits `orchestra.workflow.*` events consistently
  - wakeup injection writes expected no-reply notices to parent session when enabled

## Definition of done

- A workflow can run deterministically step-by-step with explicit “continue” actions.
- Subagent workers can be entered mid-workflow to intervene, then return and continue.
- All QC checks pass.

## Branching

- Create branch: `feat/workflow-subagents-task-03`
- Merge to main only after QC commands pass:
  - `bun run lint && bun run typecheck && bun run test:plugin && bun run build:plugin`

