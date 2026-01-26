import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    "https://lanternwave.com/api/admin/db-health/run",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_TOKEN}`,
      },
    }
  );

  return NextResponse.json({ ok: res.ok });
}
