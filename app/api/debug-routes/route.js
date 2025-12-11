// /app/api/debug-routes/route.js
import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

/*
   Recursively lists all files in /app/api
   So we can see EXACTLY which route files Next.js packaged.
*/

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push({
        type: "dir",
        name: entry.name,
        children: await listFiles(full)
      });
    } else {
      results.push({
        type: "file",
        name: entry.name
      });
    }
  }

  return results;
}

export async function GET() {
  try {
    const apiPath = path.join(process.cwd(), "app", "api");
    const tree = await listFiles(apiPath);

    return NextResponse.json(
      {
        apiPath,
        tree,
        message:
          "This shows the EXACT route files the server received after deployment."
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
