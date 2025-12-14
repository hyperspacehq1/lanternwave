import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query()
    SELECT
      current_database() AS db,
      inet_server_addr() AS server,
      inet_server_port() AS port,
      pg_backend_pid() AS pid
  );

  return NextResponse.json(rows[0]);
}
