import { NextResponse } from "next/server";
import { debugDB } from "@/lib/db/debug";

export async function GET() {
  const output = await debugDB();
  return NextResponse.json(output);
}
