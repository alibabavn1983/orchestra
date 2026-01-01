import { describe, expect, test } from "bun:test";
import { buildWorkerBootstrapPrompt } from "../../src/workers/prompt/worker-prompt";
import type { WorkerProfile } from "../../src/types";

const baseProfile: WorkerProfile = {
  id: "test-worker",
  name: "Test Worker",
  model: "node",
  purpose: "Test",
  whenToUse: "Test",
};

describe("buildWorkerBootstrapPrompt", () => {
  test("does not mention stream_chunk for agent backend", async () => {
    const prompt = await buildWorkerBootstrapPrompt({
      profile: { ...baseProfile, kind: "agent" },
    });

    expect(prompt.includes("stream_chunk")).toBe(false);
  });

  test("does not mention stream_chunk for subagent backend", async () => {
    const prompt = await buildWorkerBootstrapPrompt({
      profile: { ...baseProfile, kind: "subagent" },
    });

    expect(prompt.includes("stream_chunk")).toBe(false);
  });

  test("mentions stream_chunk for server backend", async () => {
    const prompt = await buildWorkerBootstrapPrompt({
      profile: { ...baseProfile, kind: "server" },
    });

    expect(prompt.includes("stream_chunk")).toBe(true);
  });
});
