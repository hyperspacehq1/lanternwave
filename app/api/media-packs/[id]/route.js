import fs from "fs";
import path from "path";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Explicit mapping: pack id → filename
 */
const MEDIA_PACK_MAP = {
  "frozen-sick": "frozen-sick.zip",
  // "masks-of-nyarlathotep": "masks-of-nyarlathotep.zip",
};

export async function GET(req, { params }) {
  console.log("=== MEDIA PACK DOWNLOAD ROUTE HIT ===");

  // --------------------------------------------------
  // Auth / tenant check
  // --------------------------------------------------
  try {
    const ctx = await getTenantContext(req);
    console.log("AUTH OK, tenant:", ctx?.tenantId);
  } catch (err) {
    console.log("AUTH FAILED");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --------------------------------------------------
  // Params inspection
  // --------------------------------------------------
  console.log("RAW params object:", params);

  const rawId = params?.id;
  console.log("RAW id:", JSON.stringify(rawId));

  if (!rawId) {
    console.log("ERROR: id param missing");
    return Response.json({ error: "Media pack id missing" }, { status: 400 });
  }

  // Normalize id (defensive)
  const cleanId = rawId.replace(/\.zip$/, "").replace(/\/$/, "");
  console.log("CLEAN id:", JSON.stringify(cleanId));

  // --------------------------------------------------
  // Mapping lookup
  // --------------------------------------------------
  const filename = MEDIA_PACK_MAP[cleanId];
  console.log("LOOKUP filename:", filename);

  if (!filename) {
    console.log("ERROR: Media pack not found in map");
    console.log("AVAILABLE PACK IDS:", Object.keys(MEDIA_PACK_MAP));
    return Response.json(
      { error: "Media pack not found" },
      { status: 404 }
    );
  }

  // --------------------------------------------------
  // File path resolution
  // --------------------------------------------------
  const filePath = path.join(
    process.cwd(),
    "private",
    "media-packs",
    filename
  );

  console.log("RESOLVED file path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.log("ERROR: File does not exist on disk");
    return Response.json(
      { error: "Media pack missing on server" },
      { status: 404 }
    );
  }

  const stat = fs.statSync(filePath);
  console.log("FILE SIZE:", stat.size, "bytes");

  // --------------------------------------------------
  // Stream response
  // --------------------------------------------------
  const stream = fs.createReadStream(filePath);

  console.log("STREAMING media pack:", filename);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
