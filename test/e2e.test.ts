import { describe, expect, test } from "bun:test";
import { createOpencode } from "@opencode-ai/sdk";
import { extractTextFromPromptResponse } from "../src/workers/prompt";

const e2eEnabled = process.env.OPENCODE_ORCH_E2E === "1";
const e2eTest = e2eEnabled ? test : test.skip;

describe("e2e (optional)", () => {
  e2eTest("can prompt a spawned opencode server and get text", async () => {
    const model = process.env.OPENCODE_ORCH_E2E_MODEL ?? "opencode/gpt-5-nano";

    const { client, server } = await createOpencode({
      hostname: "127.0.0.1",
      port: 0,
      timeout: 60_000,
      config: { model },
    });

    try {
      const session = (await client.session.create({ body: { title: "e2e" }, query: { directory: process.cwd() } }))
        .data;
      expect(session?.id).toBeTruthy();

      const res = await client.session.prompt({
        path: { id: session!.id },
        body: { parts: [{ type: "text", text: "Reply with exactly: pong" }] as any },
        query: { directory: process.cwd() },
      });

      const extracted = extractTextFromPromptResponse(res.data);
      expect(extracted.text.toLowerCase()).toContain("pong");
    } finally {
      server.close();
    }
  }, 180_000);
});

