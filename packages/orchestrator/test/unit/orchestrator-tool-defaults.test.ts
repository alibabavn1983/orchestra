import { describe, expect, test } from "bun:test";
import { coreOrchestratorTools } from "../../src/command";
import {
  DEFAULT_ORCHESTRATOR_AGENT_TOOL_FLAGS,
  DEFAULT_ORCHESTRATOR_TOOL_ALLOWLIST,
  buildDefaultOrchestratorPluginToolOverrides,
} from "../../src/core/tool-defaults";

describe("orchestrator tool defaults", () => {
  test("default allowlist enables only the Task API tools", () => {
    const coreToolIds = Object.keys(coreOrchestratorTools);
    const overrides = buildDefaultOrchestratorPluginToolOverrides(coreToolIds);

    expect(Object.keys(overrides).sort()).toEqual(coreToolIds.sort());

    const enabled = Object.entries(overrides)
      .filter(([, value]) => value)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual([...DEFAULT_ORCHESTRATOR_TOOL_ALLOWLIST].sort());
  });

  test("default orchestrator agent tool flags are disabled", () => {
    expect(DEFAULT_ORCHESTRATOR_AGENT_TOOL_FLAGS).toEqual({
      bash: false,
      edit: false,
      skill: false,
      webfetch: false,
    });
  });
});
