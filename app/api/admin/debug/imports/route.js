import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      nodeVersion: process.version,
    };

    // Check imports directory
    const importsDir = path.join(process.cwd(), "imports");
    debug.importsPath = importsDir;

    try {
      const stats = await fs.stat(importsDir);
      debug.importsDirExists = true;
      debug.importsDirIsDirectory = stats.isDirectory();
    } catch (err) {
      debug.importsDirExists = false;
      debug.importsDirError = err.message;
    }

    // Try to list files
    if (debug.importsDirExists) {
      try {
        const files = await fs.readdir(importsDir);
        debug.files = files;
        debug.fileCount = files.length;
      } catch (err) {
        debug.filesError = err.message;
      }
    }

    // Check specific file
    const testFile = "msbhjvt96ngml8og8u1-campaign.json";
    const testPath = path.join(importsDir, testFile);
    debug.testFilePath = testPath;

    try {
      const stats = await fs.stat(testPath);
      debug.testFileExists = true;
      debug.testFileSize = stats.size;
      debug.testFileModified = stats.mtime;
    } catch (err) {
      debug.testFileExists = false;
      debug.testFileError = err.message;
    }

    // Try reading campaignTemplates
    try {
      const { getCampaignPackages } = await import("@/lib/campaignTemplates");
      const packages = getCampaignPackages();
      debug.mappedPackages = packages.length;
      debug.packagesList = packages.map(p => ({
        label: p.label,
        filename: p.filename,
      }));
    } catch (err) {
      debug.templatesError = err.message;
    }

    return NextResponse.json(debug, { status: 200 });

  } catch (err) {
    console.error("DEBUG ROUTE ERROR:", err);
    return NextResponse.json(
      { 
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
