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
  // --------------------------------------------------
  // Auth check
  // --------------------------------------------------
  try {
    await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --------------------------------------------------
  // Extract ID from URL path
  // --------------------------------------------------
  const pathname = new URL(req.url).pathname;
  const id = pathname.split("/").pop();

  if (!id) {
    return Response.json(
      { error: "Media pack id missing" },
      { status: 400 }
    );
  }

  // Normalize
  const cleanId = id.replace(/\.zip$/, "").replace(/\/$/, "");

  // --------------------------------------------------
  // Lookup
  // --------------------------------------------------
  const filename = MEDIA_PACK_MAP[cleanId];

  if (!filename) {
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

  if (!fs.existsSync(filePath)) {
    return Response.json(
      { error: "Media pack missing on server" },
      { status: 404 }
    );
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
