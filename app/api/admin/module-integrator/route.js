import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

export async function POST(req) {
  const ctx = await getTenantContext(req);

  if (!ctx || !ctx.isAdmin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return new Response("No file uploaded", { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await ingestAdventureCodex({
    buffer,
    tenantId: ctx.tenantId,
  });

  await resolveEncounterRelationships({
    templateCampaignId: result.templateCampaignId,
  });

  return Response.json({ success: true });
}
