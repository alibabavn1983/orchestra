import type { WorkerProfile } from "../types";
import { fetchOpencodeConfig, fetchProviders, filterProviders, flattenProviders, pickDocsModel, pickFastModel, pickVisionModel, resolveModelRef } from "./catalog";

export type ProfileModelHydrationChange = {
  profileId: string;
  from: string;
  to: string;
  reason: string;
};

export async function hydrateProfileModelsFromOpencode(input: {
  client: any;
  directory: string;
  profiles: Record<string, WorkerProfile>;
}): Promise<{
  profiles: Record<string, WorkerProfile>;
  changes: ProfileModelHydrationChange[];
  fallbackModel?: string;
}> {
  const [cfg, providersRes] = await Promise.all([
    fetchOpencodeConfig(input.client, input.directory),
    fetchProviders(input.client, input.directory),
  ]);

  const providersAll = providersRes.providers;
  const providersConfigured = filterProviders(providersAll, "configured");
  const catalog = flattenProviders(providersConfigured);

  const fallbackModel =
    cfg?.model ||
    (providersRes.defaults?.opencode ? `opencode/${providersRes.defaults.opencode}` : undefined) ||
    "opencode/gpt-5-nano";

  const changes: ProfileModelHydrationChange[] = [];

  const resolveAuto = (profile: WorkerProfile): { model: string; reason: string } => {
    const tag = profile.model;
    const isVision = profile.supportsVision || /auto:vision/i.test(tag);
    const isDocs = /auto:docs/i.test(tag);
    const isFast = /auto:fast/i.test(tag);

    const picked = isVision
      ? pickVisionModel(catalog)
      : isDocs
        ? pickDocsModel(catalog)
        : isFast
          ? pickFastModel(catalog)
          : undefined;

    if (picked) {
      return { model: picked.full, reason: `auto-selected from configured models (${tag})` };
    }
    return { model: fallbackModel, reason: `fallback to default model (${tag})` };
  };

  const next: Record<string, WorkerProfile> = {};
  for (const [id, profile] of Object.entries(input.profiles)) {
    let desired = profile.model;
    let reason = "";

    if (profile.model.startsWith("auto")) {
      const resolved = resolveAuto(profile);
      desired = resolved.model;
      reason = resolved.reason;
    } else {
      const resolved = resolveModelRef(profile.model, providersAll);
      if ("error" in resolved) {
        desired = fallbackModel;
        reason = `invalid model, using fallback (${resolved.error})`;
      } else {
        desired = resolved.full;
      }
    }

    // If the model isn't in the configured catalog, we still keep it (it may be an env provider).
    // But if it is auto, or invalid, we already resolved to something safe.
    next[id] = { ...profile, model: desired };

    if (desired !== profile.model) {
      changes.push({
        profileId: id,
        from: profile.model,
        to: desired,
        reason: reason || "resolved",
      });
    }
  }

  return { profiles: next, changes, fallbackModel };
}
