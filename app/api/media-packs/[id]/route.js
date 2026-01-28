import fs from "fs";
import path from "path";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Explicit mapping: pack id → filename
 * Keep this boring and auditable
 */
const MEDIA_PACK_MAP = {
  "frozen-sick": "frozen-sick.zip",
  // "masks-of-nyarlathotep": "masks-of-nyarlathotep.zip",
};

export async function GET(req, { params }) {
  // --------------------------------------------------
  // Auth / tenant check (REQUIRED)
  // --------------------------------------------------
  try {
    await getTenantContext(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const filename = MEDIA_PACK_MAP[id];
  if (!filename) {
    return Response.json(
      { error: "Media pack not found" },
      { status: 404 }
    );
  }

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
