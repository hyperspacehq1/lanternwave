import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/admin/debug/imports
   Debug route to check imports folder
-------------------------------------------------- */
export async function GET() {
  const debug = {
    cwd: process.cwd(),
    importsPath: path.join(process.cwd(), "imports"),
    files: [],
    errors: [],
  };

  try {
    // Check if imports directory exists
    const importsDir = path.join(process.cwd(), "imports");
    
    try {
      await fs.access(importsDir);
      debug.importsDirExists = true;
    } catch (err) {
      debug.importsDirExists = false;
      debug.errors.push(`Imports directory does not exist: ${importsDir}`);
    }

    // Try to read directory
    if (debug.importsDirExists) {
      try {
        const files = await fs.readdir(importsDir);
        debug.files = files;
        debug.fileCount = files.length;
        
        // Check specific file
        const testFile = "msbhjvt96ngml8og8u1-campaign.json";
        const testPath = path.join(importsDir, testFile);
        
        try {
          await fs.access(testPath);
          debug.testFileExists = true;
          
          // Get file stats
          const stats = await fs.stat(testPath);
          debug.testFileSize = stats.size;
          debug.testFileModified = stats.mtime;
        } catch (err) {
          debug.testFileExists = false;
          debug.errors.push(`Test file not accessible: ${testPath}`);
        }
      } catch (err) {
        debug.errors.push(`Could not read imports directory: ${err.message}`);
      }
    }

    // Check alternative paths
    debug.alternativePaths = {
      "/imports": "/imports",
      "./imports": path.resolve("./imports"),
      "../imports": path.resolve("../imports"),
      "/home/ubuntu/lanternwave/imports": "/home/ubuntu/lanternwave/imports",
    };

    // Try to access alternative paths
    for (const [name, altPath] of Object.entries(debug.alternativePaths)) {
      try {
        await fs.access(altPath);
        debug.alternativePaths[name] = { path: altPath, exists: true };
      } catch {
        debug.alternativePaths[name] = { path: altPath, exists: false };
      }
    }

  } catch (error) {
    debug.generalError = error.message;
  }

  return Response.json(debug, null, 2);
}
