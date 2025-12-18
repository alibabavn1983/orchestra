import type { Config, Provider, Model } from "@opencode-ai/sdk";

export type ModelCatalogEntry = {
  /** Full ID in provider/model format */
  full: string;
  providerID: string;
  modelID: string;
  name: string;
  status: Model["status"];
  capabilities: Model["capabilities"];
  limit: Model["limit"];
  cost: Model["cost"];
  providerSource: Provider["source"];
};

export function isFullModelID(value: string): boolean {
  return value.includes("/");
}

export function parseFullModelID(value: string): { providerID: string; modelID: string } {
  const [providerID, ...rest] = value.split("/");
  return { providerID, modelID: rest.join("/") };
}

export function fullModelID(providerID: string, modelID: string): string {
  return `${providerID}/${modelID}`;
}

export function flattenProviders(providers: Provider[]): ModelCatalogEntry[] {
  const out: ModelCatalogEntry[] = [];
  for (const provider of providers) {
    const models = provider.models ?? {};
    for (const [modelID, model] of Object.entries(models)) {
      out.push({
        full: fullModelID(provider.id, modelID),
        providerID: provider.id,
        modelID,
        name: (model as any).name ?? modelID,
        status: (model as any).status ?? "active",
        capabilities: (model as any).capabilities ?? {
          temperature: true,
          reasoning: false,
          attachment: false,
          toolcall: false,
          input: { text: true, audio: false, image: false, video: false, pdf: false },
          output: { text: true, audio: false, image: false, video: false, pdf: false },
        },
        limit: (model as any).limit ?? { context: 0, output: 0 },
        cost: (model as any).cost ?? { input: 0, output: 0, cache: { read: 0, write: 0 } },
        providerSource: provider.source,
      });
    }
  }
  return out;
}

export function filterProviders(providers: Provider[], scope: "configured" | "all"): Provider[] {
  if (scope === "all") return providers;
  return providers.filter((p) => p.id === "opencode" || p.source !== "api");
}

export function resolveModelRef(
  input: string,
  providers: Provider[]
): { full: string; providerID: string; modelID: string } | { error: string; suggestions?: string[] } {
  const raw = input.trim();
  if (!raw) return { error: "Model is required." };

  if (isFullModelID(raw)) {
    const parsed = parseFullModelID(raw);
    const provider = providers.find((p) => p.id === parsed.providerID);
    if (!provider) {
      return { error: `Unknown provider "${parsed.providerID}".`, suggestions: providers.map((p) => p.id).slice(0, 20) };
    }
    if (!(parsed.modelID in (provider.models ?? {}))) {
      const suggestions = Object.keys(provider.models ?? {}).slice(0, 20).map((m) => fullModelID(provider.id, m));
      return {
        error: `Model "${parsed.modelID}" not found for provider "${provider.id}".`,
        suggestions,
      };
    }
    return { full: raw, providerID: parsed.providerID, modelID: parsed.modelID };
  }

  const matches: Array<{ providerID: string; modelID: string }> = [];
  for (const provider of providers) {
    if (provider.models && raw in provider.models) {
      matches.push({ providerID: provider.id, modelID: raw });
    }
  }

  if (matches.length === 1) {
    const match = matches[0];
    return { full: fullModelID(match.providerID, match.modelID), providerID: match.providerID, modelID: match.modelID };
  }
  if (matches.length > 1) {
    return {
      error: `Model "${raw}" exists in multiple providers. Use provider/model format.`,
      suggestions: matches.map((m) => fullModelID(m.providerID, m.modelID)).slice(0, 20),
    };
  }

  return { error: `Model "${raw}" not found. Run list_models({}) to see available models.` };
}

export function pickVisionModel(models: ModelCatalogEntry[]): ModelCatalogEntry | undefined {
  const score = (m: ModelCatalogEntry): number => {
    let s = 0;
    if (m.status === "deprecated") s -= 50;
    if (m.capabilities.toolcall) s += 10;
    if (m.capabilities.attachment) s += 10;
    if (m.capabilities.input?.image) s += 100;
    if (/\bvision\b/i.test(m.name) || /\bvision\b/i.test(m.modelID)) s += 20;
    if (/\bglm\b/i.test(m.modelID) && /4\\.6v/i.test(m.modelID)) s += 15;
    s += Math.min(Math.floor((m.limit?.context ?? 0) / 32000), 10);
    return s;
  };

  const candidates = models
    .filter((m) => m.capabilities?.attachment || m.capabilities?.input?.image)
    .sort((a, b) => score(b) - score(a));
  return candidates[0];
}

export function pickFastModel(models: ModelCatalogEntry[]): ModelCatalogEntry | undefined {
  const score = (m: ModelCatalogEntry): number => {
    let s = 0;
    if (m.status === "deprecated") s -= 50;
    if (m.capabilities.toolcall) s += 5;
    if (/(mini|small|flash|fast|haiku)/i.test(m.modelID) || /(mini|small|flash|fast|haiku)/i.test(m.name)) s += 10;
    if ((m.cost?.input ?? 0) > 0) s -= Math.min(m.cost.input, 5);
    if ((m.limit?.context ?? 0) > 0) s += Math.min(Math.floor(m.limit.context / 64000), 3);
    return s;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

export function pickDocsModel(models: ModelCatalogEntry[]): ModelCatalogEntry | undefined {
  const score = (m: ModelCatalogEntry): number => {
    let s = 0;
    if (m.status === "deprecated") s -= 50;
    if (m.capabilities.toolcall) s += 10;
    if (m.capabilities.reasoning) s += 3;
    if (/minimax/i.test(m.modelID) || /minimax/i.test(m.name)) s += 8;
    if (/m2/i.test(m.modelID) || /m2/i.test(m.name)) s += 3;
    s += Math.min(Math.floor((m.limit?.context ?? 0) / 64000), 10);
    return s;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

export async function fetchOpencodeConfig(client: any, directory: string): Promise<Config | undefined> {
  const res = await client.config.get({ query: { directory } }).catch(() => undefined);
  return res?.data as Config | undefined;
}

export async function fetchProviders(client: any, directory: string): Promise<{ providers: Provider[]; defaults: Record<string, string> }> {
  const res = await client.config.providers({ query: { directory } });
  return { providers: (res.data as any)?.providers ?? [], defaults: (res.data as any)?.default ?? {} };
}

