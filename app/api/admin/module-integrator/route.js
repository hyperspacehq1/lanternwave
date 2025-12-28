export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";
import crypto from "crypto";

const jobs = global.__moduleJobs || new Map();
global.__moduleJobs = jobs;

export async function POST(req) {
  const jobId = crypto.randomUUID();

  try {
    const ctx = await getTenantContext(req);
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    // Initialize job
    jobs.set(jobId, {
      status: "received",
      step: "Upload received",
      startedAt: Date.now(),
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Respond immediately
    const response = new Response(JSON.stringify({ jobId }), {
      status: 202,
    });

    // Background processing
    queueMicrotask(async () => {
      try {
        jobs.set(jobId, { status: "processing", step: "Parsing document…" });

        const result = await ingestAdventureCodex({
          buffer,
          tenantId: ctx.tenantId,
        });

        jobs.set(jobId, {
          status: "processing",
          step: "Resolving encounters…",
        });

        await resolveEncounterRelationships({
          templateCampaignId: result.templateCampaignId,
        });

        jobs.set(jobId, {
          status: "complete",
          step: "Done",
          finishedAt: Date.now(),
        });
      } catch (err) {
        jobs.set(jobId, {
          status: "error",
          error: err.message,
        });
      }
    });

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
