import { promises as fs } from "fs";
import path from "path";
import { getCampaignPackages } from "@/lib/campaignTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------
   GET /api/campaign-packages
   Returns available campaign templates from /imports folder
   PUBLIC / NO AUTH REQUIRED
-------------------------------------------------- */
export async function GET() {
  try {
    // Get templates from the mapping file
    const mappedPackages = getCampaignPackages();

    // Optionally: verify that files actually exist in /imports folder
    const importsDir = path.join(process.cwd(), "imports");
    
    try {
      // Ensure imports directory exists
      await fs.mkdir(importsDir, { recursive: true });
      
      // Read all files in imports directory
      const files = await fs.readdir(importsDir);
      const jsonFiles = files.filter(f => f.endsWith('-campaign.json'));
      
      // Filter packages to only include those with files that exist
      // (or standard which has no file)
      const availablePackages = mappedPackages.filter(pkg => {
        if (pkg.value === 'standard') return true; // Always show standard
        return jsonFiles.includes(pkg.filename);
      });
      
      // Log any mapped templates that don't have files
      const missingFiles = mappedPackages
        .filter(pkg => pkg.filename && !jsonFiles.includes(pkg.filename))
        .map(pkg => pkg.filename);
      
      if (missingFiles.length > 0) {
        console.warn('Warning: Campaign templates mapped but files not found:', missingFiles);
      }
      
      return Response.json(availablePackages);
      
    } catch (err) {
      // If we can't read the directory, just return the mapped packages
      console.warn('Could not read imports directory:', err.message);
      return Response.json(mappedPackages);
    }
    
  } catch (error) {
    console.error('Error in campaign-packages route:', error);
    
    // Fallback: return at least the standard option
    return Response.json([
      {
        value: "standard",
        label: "Standard (Blank Campaign)",
        description: "Start with an empty campaign and build it manually.",
        filename: null,
      }
    ]);
  }
}