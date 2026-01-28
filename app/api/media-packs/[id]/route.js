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
};

export async function GET(req) {
  console.log("=== MEDIA PACK DOWNLOAD ROUTE HIT ===");

  // --------------------------------------------------
  // Auth check
  // --------------------------------------------------
  try {
    const ctx = await getTenantContext(req);
    console.log("AUTH OK, tenant:", ctx?.tenantId);
  } catch {
    console.log("AUTH FAILED");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --------------------------------------------------
  // Extract ID from URL path (RELIABLE METHOD)
  // --------------------------------------------------
  const pathname = new URL(req.url).pathname;
  console.log("RAW pathname:", pathname);

  // pathname = /api/media-packs/frozen-sick
  const id = pathname.split("/").pop();
  console.log("RAW id from path:", JSON.stringify(id));

  if (!id) {
    return Response.json(
      { error: "Media pack id missing" },
      { status: 400 }
    );
  }

  // Normalize
  const cleanId = id.replace(/\.zip$/, "").replace(/\/$/, "");
  console.log("CLEAN id:", cleanId);

  // --------------------------------------------------
  // Lookup
  // --------------------------------------------------
  const filename = MEDIA_PACK_MAP[cleanId];
  console.log("LOOKUP filename:", filename);

  if (!filename) {
    console.log("AVAILABLE PACKS:", Object.keys(MEDIA_PACK_MAP));
    return Response.json(
      { error: "Media pack not found" },
      { status: 404 }
    );
  }

  // --------------------------------------------------
  // Resolve file
  // --------------------------------------------------
  const filePath = path.join(
    process.cwd(),
    "private",
    "media-packs",
    filename
  );

  console.log("RESOLVED file path:", filePath);

  if (!fs.existsSync(filePath)) {
    return Response.json(
      { error: "Media pack missing on server" },
      { status: 404 }
    );
  }

  const stat = fs.statSync(filePath);
  console.log("FILE SIZE:", stat.size);

  const stream = fs.createReadStream(filePath);

  console.log("STREAMING:", filename);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
