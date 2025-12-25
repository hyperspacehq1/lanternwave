import { NextResponse } from "next/server";
import { ingestAdventureCodex } from "@/lib/ai/orchestrator";
import { resolveEncounterRelationships } from "@/lib/ai/resolveEncounterRelationships";

/* =========================================================
   CONFIG
========================================================= */
export const dynamic = "force-dynamic";

/* =========================================================
   BASIC AUTH GUARD
========================================================= */
function requireAdminAuth(req) {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  const base64 = auth.replace("Basic ", "");
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const [username, password] = decoded.split(":");

  if (
    username !== process.env.ADMIN_MODULE_USERNAME ||
    password !== process.env.ADMIN_MODULE_PASSWORD
  ) {
    return unauthorized();
  }

  return null;
}

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Module Integrator"',
    },
  });
}

/* =========================================================
   PDF TEXT EXTRACTION (SIMPLE, RELIABLE)
========================================================= */
async function extractPdfText(file) {
  // Lazy import keeps cold starts lower
  const pdfParse = (await import("pdf-parse")).default;

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);

  if (!data?.text) {
    throw new Error("Failed to extract text from PDF");
  }

  return data.text;
}

/* =========================================================
   POST /api/admin/module-integrator
========================================================= */
export async function POST(req) {
  /* ---------------------------------------------
     AUTH
  --------------------------------------------- */
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  /* ---------------------------------------------
     PARSE MULTIPART FORM
  --------------------------------------------- */
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "PDF file is required" },
      { status: 400 }
    );
  }

  /* ---------------------------------------------
     EXTRACT PDF TEXT
  --------------------------------------------- */
  let pdfText;
  try {
    pdfText = await extractPdfText(file);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "PDF parsing failed" },
      { status: 500 }
    );
  }

  /* ---------------------------------------------
     INGEST ADVENTURE CODEX
  --------------------------------------------- */
  let templateCampaignId;

  try {
    const result = await ingestAdventureCodex({
      pdfText,
      adminUserId: "admin-module-integrator",
    });

    templateCampaignId = result.templateCampaignId;
  } catch (err) {
    return NextResponse.json(
      {
        error: "Adventure Codex ingestion failed",
        details: err.message,
      },
      { status: 500 }
    );
  }

  /* ---------------------------------------------
     RESOLVE ENCOUNTER RELATIONSHIPS
  --------------------------------------------- */
  try {
    await resolveEncounterRelationships({
      templateCampaignId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Encounter relationship resolution failed",
        details: err.message,
      },
      { status: 500 }
    );
  }

  /* ---------------------------------------------
     SUCCESS
  --------------------------------------------- */
  return NextResponse.json(
    {
      success: true,
      templateCampaignId,
      message:
        "Adventure Codex created successfully and is now available for campaigns.",
    },
    { status: 201 }
  );
}
